/** @jsxImportSource @opentui/solid */
import type { RGBA, TextRenderable } from "@opentui/core"
import type { TuiPlugin, TuiPluginModule, TuiThemeCurrent } from "@opencode-ai/plugin/tui"
import type { Part } from "@opencode-ai/sdk/v2"
import { onCleanup } from "solid-js"
import { addUsage, aggregateSpeeds, estimateTokens, generatedTokens, liveTokensPerSecond, processedPromptTokens, promptTokens, type SpeedTurn, type TokenSample, type TokenUsage } from "./token-speed-metrics.js"

type Reading = {
  model?: string
  usage?: TokenUsage
}

type TurnTiming = {
  startedAt?: number
  firstOutputAt?: number
  completedAt?: number
  promptTokens?: number
  generatedTokens?: number
}

const toSpeedTurn = (turn: TurnTiming): SpeedTurn | undefined => {
  if (turn.startedAt === undefined || turn.firstOutputAt === undefined || turn.completedAt === undefined) return undefined

  return {
    promptTokens: turn.promptTokens ?? 0,
    generatedTokens: turn.generatedTokens ?? 0,
    promptMs: Math.max(0, turn.firstOutputAt - turn.startedAt),
    generationMs: Math.max(0, turn.completedAt - turn.firstOutputAt),
    ttftMs: Math.max(0, turn.firstOutputAt - turn.startedAt),
  }
}

const partStart = (part: Part) => {
  if (part.type === "text") return part.time?.start
  if (part.type === "reasoning") return part.time.start
  if (part.type === "tool" && part.state.status !== "pending") return part.state.time.start
  return undefined
}

const firstPartStart = (parts: Part[]) => {
  const starts = parts
    .map(partStart)
    .filter((value): value is number => value !== undefined)
  return starts.length ? Math.min(...starts) : undefined
}

const formatSpeed = (value?: number) => value === undefined ? "--" : value >= 100 ? value.toFixed(0) : value.toFixed(1)
const formatTime = (value?: number) => value === undefined ? "--" : `${(value / 1_000).toFixed(1)}s`
const formatTokens = (value?: number) => value === undefined ? "--" : new Intl.NumberFormat("en-US").format(value)
const formatUsage = (usage?: TokenUsage) => {
  const total = usage
    ? promptTokens(usage.input, usage.cached, usage.cacheWrite) + generatedTokens(usage.output, usage.reasoning)
    : undefined

  return [
    `Total ${formatTokens(total)}`,
    `Input ${formatTokens(usage?.input)}`,
    `Cached ${formatTokens(usage?.cached)}`,
    `Cache write ${formatTokens(usage?.cacheWrite)}`,
    `Output ${formatTokens(usage?.output)}`,
    `Reasoning ${formatTokens(usage?.reasoning)}`,
  ].join("\n")
}

function speedColor(value: number | undefined, theme: TuiThemeCurrent): RGBA {
  if (value === undefined) return theme.textMuted
  if (value < 20) return theme.error
  if (value < 50) return theme.warning
  return theme.success
}

function SpeedWidget(props: {
  api: Parameters<TuiPlugin>[0]
  sessionID: string
  readings: Map<string, Reading>
  turns: Map<string, Map<string, TurnTiming>>
  samples: Map<string, TokenSample[]>
  subscribe: (listener: () => void) => () => void
}) {
  let modelRef: TextRenderable | undefined
  let promptRef: TextRenderable | undefined
  let generationRef: TextRenderable | undefined
  let ttftRef: TextRenderable | undefined
  let usageRef: TextRenderable | undefined
  const theme = props.api.theme.current

  const sync = () => {
    const reading = props.readings.get(props.sessionID) ?? {}
    const speedTurns = [...(props.turns.get(props.sessionID)?.values() ?? [])].flatMap((turn) => {
      const value = toSpeedTurn(turn)
      return value ? [value] : []
    })
    const aggregate = aggregateSpeeds(speedTurns)
    const live = liveTokensPerSecond(props.samples.get(props.sessionID) ?? [], Date.now())
    const generation = live ?? aggregate.generation

    if (modelRef) modelRef.content = reading.model ?? "model"
    if (promptRef) promptRef.content = formatSpeed(aggregate.prompt)
    if (generationRef) {
      generationRef.content = formatSpeed(generation)
      generationRef.fg = speedColor(generation, theme)
    }
    if (ttftRef) ttftRef.content = formatTime(aggregate.ttftMs)
    if (usageRef) usageRef.content = formatUsage(reading.usage)
    props.api.renderer.requestRender()
  }

  const unsubscribe = props.subscribe(sync)
  onCleanup(unsubscribe)

  return (
    <box flexDirection="column">
      <text fg={theme.text}><b>Model speed · chat</b></text>
      <text ref={(value: TextRenderable) => { modelRef = value; sync() }} fg={theme.accent}>model</text>
      <box flexDirection="row">
        <text fg={theme.textMuted}>Prompt ≈ </text>
        <text ref={(value: TextRenderable) => { promptRef = value; sync() }} fg={theme.warning}>--</text>
        <text fg={theme.textMuted}> tok/s</text>
      </box>
      <box flexDirection="row">
        <text fg={theme.textMuted}>Generation </text>
        <text ref={(value: TextRenderable) => { generationRef = value; sync() }} fg={theme.textMuted}>--</text>
        <text fg={theme.textMuted}> tok/s</text>
      </box>
      <box flexDirection="row">
        <text fg={theme.textMuted}>TTFT </text>
        <text ref={(value: TextRenderable) => { ttftRef = value; sync() }} fg={theme.textMuted}>--</text>
      </box>
      <text fg={theme.text}><b>Tokens used</b></text>
      <text ref={(value: TextRenderable) => { usageRef = value; sync() }} fg={theme.textMuted}>Total --</text>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  const readings = new Map<string, Reading>()
  const turns = new Map<string, Map<string, TurnTiming>>()
  const samples = new Map<string, TokenSample[]>()
  const completed = new Set<string>()
  const listeners = new Set<() => void>()
  let useGenerationEvents = false
  const bump = () => listeners.forEach((listener) => listener())
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const earliest = (left?: number, right?: number) => {
    if (left === undefined) return right
    if (right === undefined) return left
    return Math.min(left, right)
  }

  const updateTurn = (sessionID: string, messageID: string, patch: Partial<TurnTiming>) => {
    const sessionTurns = turns.get(sessionID) ?? new Map<string, TurnTiming>()
    const current = sessionTurns.get(messageID) ?? {}
    sessionTurns.set(messageID, {
      startedAt: earliest(current.startedAt, patch.startedAt),
      firstOutputAt: earliest(current.firstOutputAt, patch.firstOutputAt),
      completedAt: earliest(current.completedAt, patch.completedAt),
      promptTokens: patch.promptTokens ?? current.promptTokens,
      generatedTokens: patch.generatedTokens ?? current.generatedTokens,
    })
    turns.set(sessionID, sessionTurns)
  }

  const usageMessageIDs = new Map<string, Set<string>>()
  const recordUsage = (sessionID: string, messageID: string, tokens: Parameters<typeof addUsage>[1]) => {
    const messageIDs = usageMessageIDs.get(sessionID) ?? new Set<string>()
    if (messageIDs.has(messageID)) return
    messageIDs.add(messageID)
    usageMessageIDs.set(sessionID, messageIDs)

    const reading = readings.get(sessionID)
    readings.set(sessionID, { ...reading, usage: addUsage(reading?.usage, tokens) })
  }

  const usageLoaded = new Set<string>()
  const usageLoading = new Set<string>()
  const loadSessionUsage = async (sessionID: string) => {
    if (usageLoaded.has(sessionID) || usageLoading.has(sessionID)) return
    usageLoading.add(sessionID)

    try {
      // baza: load one page for the sidebar instead of paginating the whole session.
      // Upgrade path: follow the response cursor when sessions can exceed 1,000 messages.
      const response = await api.client.session.messages({
        sessionID,
        limit: 1_000,
      })
      for (const message of response.data ?? []) {
        const info = message.info
        if (info.role !== "assistant" || info.time.completed === undefined) continue
        recordUsage(sessionID, info.id, info.tokens)
        updateTurn(sessionID, info.id, {
          startedAt: info.time.created,
          firstOutputAt: firstPartStart(message.parts),
          completedAt: info.time.completed,
          promptTokens: processedPromptTokens(info.tokens.input, info.tokens.cache.write),
          generatedTokens: generatedTokens(info.tokens.output, info.tokens.reasoning),
        })
      }
    } catch {
      // Live events still populate usage if the history request is unavailable.
    } finally {
      usageLoading.delete(sessionID)
      usageLoaded.add(sessionID)
      bump()
    }
  }

  const historyLoaded = new Set<string>()
  const historyLoading = new Set<string>()
  const loadSessionHistory = async (sessionID: string) => {
    if (historyLoaded.has(sessionID) || historyLoading.has(sessionID)) return
    historyLoading.add(sessionID)

    try {
      let after: number | undefined
      while (true) {
        const response = await api.client.v2.session.history({
          sessionID,
          limit: 1_000,
          ...(after === undefined ? {} : { after }),
        })
        const page = response.data

        for (const event of page?.data ?? []) {
          switch (event.type) {
            case "session.next.step.started":
              updateTurn(event.data.sessionID, event.data.assistantMessageID, {
                startedAt: event.data.timestamp,
              })
              break
            case "session.next.text.started":
            case "session.next.reasoning.started":
            case "session.next.tool.input.started":
              // baza: history stores stream-start events, not individual token deltas.
              // Upgrade path: use persisted delta timestamps for exact historical TTFT.
              updateTurn(event.data.sessionID, event.data.assistantMessageID, {
                firstOutputAt: event.data.timestamp,
              })
              break
            case "session.next.step.ended":
              recordUsage(event.data.sessionID, event.data.assistantMessageID, event.data.tokens)
              updateTurn(event.data.sessionID, event.data.assistantMessageID, {
                completedAt: event.data.timestamp,
                promptTokens: processedPromptTokens(event.data.tokens.input, event.data.tokens.cache.write),
                generatedTokens: generatedTokens(event.data.tokens.output, event.data.tokens.reasoning),
              })
              break
          }
        }

        if (!page?.hasMore) break
        const next = page.data.at(-1)?.durable?.seq
        if (next === undefined || next === after) break
        after = next
      }
    } catch {
      // Token usage and live timings still work if durable history is unavailable.
    } finally {
      historyLoading.delete(sessionID)
      historyLoaded.add(sessionID)
      bump()
    }
  }

  const recordDelta = (sessionID: string, messageID: string, delta: string, timestamp: number | string) => {
    const parsed = typeof timestamp === "number" ? timestamp : Date.parse(timestamp)
    const now = Number.isFinite(parsed) ? parsed : Date.now()
    updateTurn(sessionID, messageID, { firstOutputAt: now })

    const current = samples.get(sessionID) ?? []
    samples.set(sessionID, [
      ...current.filter((sample) => sample.at >= now - 3_000),
      { at: now, tokens: estimateTokens(delta) },
    ])
    bump()
  }

  const recordGenerationEvent = (event: {
    properties: { sessionID: string; assistantMessageID: string; delta: string; timestamp: number }
  }) => {
    useGenerationEvents = true
    const value = event.properties
    recordDelta(value.sessionID, value.assistantMessageID, value.delta, value.timestamp)
  }

  api.event.on("session.next.step.started", (event) => {
    const value = event.properties
    updateTurn(value.sessionID, value.assistantMessageID, { startedAt: value.timestamp })
  })

  api.event.on("session.next.step.ended", (event) => {
    const value = event.properties
    recordUsage(value.sessionID, value.assistantMessageID, value.tokens)
    updateTurn(value.sessionID, value.assistantMessageID, {
      completedAt: value.timestamp,
      promptTokens: processedPromptTokens(value.tokens.input, value.tokens.cache.write),
      generatedTokens: generatedTokens(value.tokens.output, value.tokens.reasoning),
    })
    bump()
  })

  api.event.on("session.next.text.delta", recordGenerationEvent)
  api.event.on("session.next.reasoning.delta", recordGenerationEvent)
  api.event.on("session.next.tool.input.delta", recordGenerationEvent)

  api.event.on("message.part.delta", (event) => {
    if (useGenerationEvents || !["text", "tool_input"].includes(event.properties.field)) return
    recordDelta(
      event.properties.sessionID,
      event.properties.messageID,
      event.properties.delta,
      Date.now(),
    )
  })

  api.event.on("message.updated", (event) => {
    const info = event.properties.info
    if (info.role !== "assistant") return

    const reading = readings.get(info.sessionID)
    readings.set(info.sessionID, { ...reading, model: info.modelID })

    if (!info.time.completed || completed.has(info.id)) {
      bump()
      return
    }
    completed.add(info.id)

    recordUsage(info.sessionID, info.id, info.tokens)
    updateTurn(info.sessionID, info.id, {
      startedAt: info.time.created,
      completedAt: info.time.completed,
      promptTokens: processedPromptTokens(info.tokens.input, info.tokens.cache.write),
      generatedTokens: generatedTokens(info.tokens.output, info.tokens.reasoning),
    })
    samples.delete(info.sessionID)
    bump()
  })

  const timer = setInterval(() => {
    if (!samples.size) return
    const cutoff = Date.now() - 3_000
    for (const [sessionID, current] of samples) {
      const recent = current.filter((sample) => sample.at >= cutoff)
      if (recent.length) samples.set(sessionID, recent)
      else samples.delete(sessionID)
    }
    bump()
  }, 250)
  api.lifecycle.onDispose(() => clearInterval(timer))

  api.slots.register({
    order: 90,
    slots: {
      sidebar_content(_context, value) {
        void loadSessionUsage(value.session_id)
        void loadSessionHistory(value.session_id)
        return <SpeedWidget api={api} sessionID={value.session_id} readings={readings} turns={turns} samples={samples} subscribe={subscribe} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = { id: "local.token-speed", tui }
export default plugin
