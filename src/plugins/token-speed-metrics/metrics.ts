export type TokenSample = { at: number; tokens: number }

export function estimateTokens(text: string) {
  return Math.max(1, Buffer.byteLength(text, "utf8") / 4)
}

export function generatedTokens(outputTokens: number, reasoningTokens: number, toolInputTokens = 0) {
  return outputTokens + reasoningTokens + toolInputTokens
}

export function promptTokens(inputTokens: number, cacheReadTokens: number, cacheWriteTokens: number) {
  return inputTokens + cacheReadTokens + cacheWriteTokens
}

export function processedPromptTokens(inputTokens: number, cacheWriteTokens: number) {
  return inputTokens + cacheWriteTokens
}

export type SpeedTurn = {
  promptTokens: number
  generatedTokens: number
  promptMs: number
  generationMs: number
  ttftMs: number
}

export function aggregateSpeeds(turns: SpeedTurn[]) {
  const promptTurns = turns.filter((turn) => turn.promptTokens > 0 && turn.promptMs > 0)
  const generationTurns = turns.filter((turn) => turn.generatedTokens > 0 && turn.generationMs > 0)
  const promptMs = promptTurns.reduce((total, turn) => total + turn.promptMs, 0)
  const generationMs = generationTurns.reduce((total, turn) => total + turn.generationMs, 0)

  // baza: these are end-to-end step timings, not provider-only prefill timings.
  // Upgrade path: use provider telemetry when OpenCode exposes it.
  return {
    prompt: promptMs > 0
      ? promptTurns.reduce((total, turn) => total + turn.promptTokens, 0) / (promptMs / 1_000)
      : undefined,
    generation: generationMs > 0
      ? generationTurns.reduce((total, turn) => total + turn.generatedTokens, 0) / (generationMs / 1_000)
      : undefined,
    ttftMs: turns.length
      ? turns.reduce((total, turn) => total + turn.ttftMs, 0) / turns.length
      : undefined,
  }
}

export type TokenUsage = {
  input: number
  cached: number
  cacheWrite: number
  output: number
  reasoning: number
}

type MessageTokens = {
  input: number
  output: number
  reasoning: number
  cache: { read: number; write: number }
}

export function addUsage(total: TokenUsage | undefined, tokens: MessageTokens): TokenUsage {
  return {
    input: (total?.input ?? 0) + tokens.input,
    cached: (total?.cached ?? 0) + tokens.cache.read,
    cacheWrite: (total?.cacheWrite ?? 0) + tokens.cache.write,
    output: (total?.output ?? 0) + tokens.output,
    reasoning: (total?.reasoning ?? 0) + tokens.reasoning,
  }
}

export function liveTokensPerSecond(samples: TokenSample[], now: number, windowMs = 3_000) {
  const recent = samples.filter((sample) => sample.at >= now - windowMs)
  if (!recent.length || now - recent.at(-1)!.at > 1_500) return undefined

  const elapsedMs = Math.max(now - recent[0]!.at, 250)
  return recent.reduce((total, sample) => total + sample.tokens, 0) / (elapsedMs / 1_000)
}
