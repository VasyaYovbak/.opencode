import type { OpenCodeEvent, SessionLogOutput } from "@opencode/client"
import { addUsage, aggregateSpeeds, estimateTokens, generatedTokens, liveTokensPerSecond, processedPromptTokens, type TokenSample, type TokenUsage } from "./metrics.js"

type StepTiming = {
  started?: number
  firstOutput?: number
  completed?: number
  tokens?: Parameters<typeof addUsage>[1]
  toolInputs: Map<string, number>
}

export function createMetrics() {
  const steps = new Map<string, Map<string, StepTiming>>()
  const models = new Map<string, string>()
  const samples = new Map<string, TokenSample[]>()

  return {
    samples,
    record(event: OpenCodeEvent | SessionLogOutput, live = false) {
      switch (event.type) {
        case "session.step.started":
        case "session.step.streamed":
        case "session.step.ended":
        case "session.step.failed":
        case "session.text.started":
        case "session.reasoning.started":
        case "session.tool.input.started":
        case "session.text.delta":
        case "session.reasoning.delta":
        case "session.tool.input.delta":
        case "session.tool.input.ended": {
          const session = steps.get(event.data.sessionID) ?? new Map<string, StepTiming>()
          const step = session.get(event.data.assistantMessageID) ?? { toolInputs: new Map<string, number>() }
          session.set(event.data.assistantMessageID, step)
          steps.set(event.data.sessionID, session)

          if (event.type === "session.step.started") {
            step.started = Math.min(step.started ?? Infinity, event.data.started)
            models.set(event.data.sessionID, event.data.model.id)
          }
          if (event.type === "session.step.streamed") {
            step.completed = Math.min(step.completed ?? Infinity, event.created)
          }
          if (event.type === "session.step.ended" || event.type === "session.step.failed") {
            step.tokens = event.data.tokens ?? step.tokens
            step.completed ??= event.created
          }
          if (event.type === "session.tool.input.ended") {
            // Replace live estimates with the full input so replay cannot double-count them.
            step.toolInputs.set(event.data.id, event.data.text ? estimateTokens(event.data.text) : 0)
          }
          if (event.type.endsWith(".started") && event.type !== "session.step.started" && !live) {
            // baza: durable starts approximate historical first output; exact deltas are live-only.
            // Upgrade path: use persisted provider first-token telemetry if it becomes available.
            step.firstOutput = Math.min(step.firstOutput ?? Infinity, event.created)
          }
          if ("delta" in event.data && event.data.delta) {
            step.firstOutput = Math.min(step.firstOutput ?? Infinity, event.created)
            if (live) {
              samples.set(event.data.sessionID, [
                ...(samples.get(event.data.sessionID) ?? []).filter((sample) => sample.at >= event.created - 3_000),
                { at: event.created, tokens: estimateTokens(event.data.delta) },
              ])
              if (event.type === "session.tool.input.delta") {
                step.toolInputs.set(event.data.id, (step.toolInputs.get(event.data.id) ?? 0) + estimateTokens(event.data.delta))
              }
            }
          }
          return true
        }
        default:
          return false
      }
    },
    summary(sessionID: string, now = Date.now()) {
      const values = [...(steps.get(sessionID)?.values() ?? [])]
      const speeds = aggregateSpeeds(values.flatMap((step) => {
        if (step.started === undefined || step.firstOutput === undefined || step.completed === undefined || !step.tokens) return []
        return [{
          promptTokens: processedPromptTokens(step.tokens.input, step.tokens.cache.write),
          generatedTokens: generatedTokens(step.tokens.output, step.tokens.reasoning, [...step.toolInputs.values()].reduce((total, tokens) => total + tokens, 0)),
          promptMs: Math.max(0, step.firstOutput - step.started),
          generationMs: Math.max(0, step.completed - step.firstOutput),
          ttftMs: Math.max(0, step.firstOutput - step.started),
        }]
      }))
      return {
        model: models.get(sessionID),
        usage: values.reduce<TokenUsage | undefined>((total, step) => step.tokens ? addUsage(total, step.tokens) : total, undefined),
        ...speeds,
        generation: liveTokensPerSecond(samples.get(sessionID) ?? [], now) ?? speeds.generation,
      }
    },
  }
}
