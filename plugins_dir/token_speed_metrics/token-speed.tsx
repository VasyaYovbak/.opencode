/** @jsxImportSource @opentui/solid */
import type { RGBA, TextRenderable } from "@opentui/core"
import type { TuiPlugin, TuiPluginModule, TuiThemeCurrent } from "@opencode-ai/plugin/tui"
import { onCleanup } from "solid-js"
import { addUsage, estimateTokens, finalSpeeds, generatedTokens, liveTokensPerSecond, promptTokens, type TokenSample, type TokenUsage } from "./token-speed-metrics.js"

type Reading = {
  model?: string
  prompt?: number
  generation?: number
  ttftMs?: number
  usage?: TokenUsage
}

type MessageTiming = {
  sessionID: string
  createdAt?: number
  firstTokenAt?: number
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
    const live = liveTokensPerSecond(props.samples.get(props.sessionID) ?? [], Date.now())
    const generation = live ?? reading.generation

    if (modelRef) modelRef.content = reading.model ?? "model"
    if (promptRef) promptRef.content = formatSpeed(reading.prompt)
    if (generationRef) {
      generationRef.content = formatSpeed(generation)
      generationRef.fg = speedColor(generation, theme)
    }
    if (ttftRef) ttftRef.content = formatTime(reading.ttftMs)
    if (usageRef) usageRef.content = formatUsage(reading.usage)
    props.api.renderer.requestRender()
  }

  const unsubscribe = props.subscribe(sync)
  onCleanup(unsubscribe)

  return (
    <box flexDirection="column">
      <text fg={theme.text}><b>Model speed</b></text>
      <text ref={(value: TextRenderable) => { modelRef = value; sync() }} fg={theme.accent}>model</text>
      <box flexDirection="row">
        <text fg={theme.textMuted}>Input ≈ </text>
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
  const timings = new Map<string, MessageTiming>()
  const samples = new Map<string, TokenSample[]>()
  const completed = new Set<string>()
  const listeners = new Set<() => void>()
  let useGenerationEvents = false
  const bump = () => listeners.forEach((listener) => listener())
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const recordDelta = (sessionID: string, messageID: string, delta: string, timestamp: number | string) => {
    const parsed = typeof timestamp === "number" ? timestamp : Date.parse(timestamp)
    const now = Number.isFinite(parsed) ? parsed : Date.now()
    const timing = timings.get(messageID) ?? { sessionID }
    timing.firstTokenAt ??= now
    timings.set(messageID, timing)

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
    const timing = timings.get(value.assistantMessageID) ?? { sessionID: value.sessionID }
    timing.createdAt = value.timestamp
    timings.set(value.assistantMessageID, timing)
  })

  api.event.on("session.next.step.ended", (event) => {
    const value = event.properties
    const timing = timings.get(value.assistantMessageID)
    if (timing?.firstTokenAt === undefined) return

    const speed = finalSpeeds(
      promptTokens(value.tokens.input, value.tokens.cache.read, value.tokens.cache.write),
      generatedTokens(value.tokens.output, value.tokens.reasoning),
      timing.createdAt ?? timing.firstTokenAt,
      timing.firstTokenAt,
      value.timestamp,
    )
    readings.set(value.sessionID, { ...readings.get(value.sessionID), ...speed })
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
    const timing = timings.get(info.id) ?? { sessionID: info.sessionID }
    timing.createdAt = info.time.created
    timings.set(info.id, timing)
    readings.set(info.sessionID, { ...reading, model: info.modelID })

    if (!info.time.completed || completed.has(info.id)) {
      bump()
      return
    }
    completed.add(info.id)

    const usage = addUsage(reading?.usage, info.tokens)
    const completedReading = { ...reading, model: info.modelID, usage }
    readings.set(info.sessionID, completedReading)

    if (timing.firstTokenAt !== undefined) {
      const speed = finalSpeeds(
        promptTokens(info.tokens.input, info.tokens.cache.read, info.tokens.cache.write),
        generatedTokens(info.tokens.output, info.tokens.reasoning),
        info.time.created,
        timing.firstTokenAt,
        info.time.completed,
      )
      readings.set(info.sessionID, { ...completedReading, ...speed })
    }
    samples.delete(info.sessionID)
    timings.delete(info.id)
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
        return <SpeedWidget api={api} sessionID={value.session_id} readings={readings} samples={samples} subscribe={subscribe} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = { id: "local.token-speed", tui }
export default plugin
