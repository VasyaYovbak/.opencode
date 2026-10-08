/** @jsxImportSource @opentui/solid */
import { Plugin } from "@opencode/plugin/tui"
import { createEffect, createMemo, createSignal } from "solid-js"
import type { Accessor } from "solid-js"
import { generatedTokens, promptTokens, type TokenUsage } from "./metrics.js"
import { createMetrics } from "./state.js"

const formatSpeed = (value?: number) => value === undefined ? "--" : value >= 100 ? value.toFixed(0) : value.toFixed(1)
const formatTime = (value?: number) => value === undefined ? "--" : `${(value / 1_000).toFixed(1)}s`
const formatTokens = (value?: number) => value === undefined ? "--" : new Intl.NumberFormat("en-US").format(value)

function formatUsage(usage?: TokenUsage) {
  return [
    `Total ${formatTokens(usage ? promptTokens(usage.input, usage.cached, usage.cacheWrite) + generatedTokens(usage.output, usage.reasoning) : undefined)}`,
    `Input ${formatTokens(usage?.input)}`,
    `Cached ${formatTokens(usage?.cached)}`,
    `Cache write ${formatTokens(usage?.cacheWrite)}`,
    `Output ${formatTokens(usage?.output)}`,
    `Reasoning ${formatTokens(usage?.reasoning)}`,
  ].join("\n")
}

function SpeedWidget(props: {
  api: Plugin.Context
  sessionID: string
  metrics: ReturnType<typeof createMetrics>
  revision: Accessor<number>
  load: (sessionID: string) => Promise<void>
}) {
  createEffect(() => { void props.load(props.sessionID) })
  const reading = createMemo(() => {
    props.revision()
    return props.metrics.summary(props.sessionID)
  })
  const color = () => {
    const speed = reading().generation
    if (speed === undefined) return props.api.theme.text.muted
    if (speed < 20) return props.api.theme.text.feedback.error.base
    if (speed < 50) return props.api.theme.text.feedback.warning.base
    return props.api.theme.text.feedback.success.base
  }

  return (
    <box flexDirection="column">
      <text fg={props.api.theme.text.base}><b>Model speed · chat</b></text>
      <text fg={props.api.theme.text.base}>{reading().model ?? "model"}</text>
      <text fg={props.api.theme.text.muted}>Prompt ≈ {formatSpeed(reading().prompt)} tok/s</text>
      <box flexDirection="row">
        <text fg={props.api.theme.text.muted}>Generation </text>
        <text fg={color()}>{formatSpeed(reading().generation)}</text>
        <text fg={props.api.theme.text.muted}> tok/s</text>
      </box>
      <text fg={props.api.theme.text.muted}>TTFT {formatTime(reading().ttftMs)}</text>
      <text fg={props.api.theme.text.base}><b>Tokens used</b></text>
      <text fg={props.api.theme.text.muted}>{formatUsage(reading().usage)}</text>
    </box>
  )
}

export default Plugin.define({
  id: "local.personal-token-speed",
  setup(api) {
    const metrics = createMetrics()
    const [revision, setRevision] = createSignal(0)
    const bump = () => setRevision((value) => value + 1)
    const controller = new AbortController()
    const loaded = new Set<string>()
    const loading = new Set<string>()
    const load = async (sessionID: string) => {
      if (loaded.has(sessionID) || loading.has(sessionID)) return
      loading.add(sessionID)
      try {
        for await (const event of api.client.session.log({ sessionID, follow: false }, { signal: controller.signal })) {
          if (event.type !== "log.synced") metrics.record(event)
        }
        loaded.add(sessionID)
      } catch {
        if (!controller.signal.aborted) api.ui.toast.show({
          title: "Token metrics",
          message: "Could not load historical metrics. Live metrics are still available; reopen the session to retry.",
          variant: "warning",
        })
      } finally {
        loading.delete(sessionID)
        bump()
      }
    }

    const unlisten = api.data.listen(({ details }) => {
      if (metrics.record(details, true)) bump()
    })
    const timer = setInterval(() => {
      if (!metrics.samples.size) return
      for (const [sessionID, samples] of metrics.samples) {
        const recent = samples.filter((sample) => sample.at >= Date.now() - 3_000)
        if (recent.length) metrics.samples.set(sessionID, recent)
        if (!recent.length) metrics.samples.delete(sessionID)
      }
      bump()
    }, 250)
    const unslot = api.ui.slot({
      append: "sidebar.content",
      render: (input) => <SpeedWidget api={api} sessionID={input.sessionID} metrics={metrics} revision={revision} load={load} />,
    })

    return () => {
      controller.abort()
      clearInterval(timer)
      unlisten()
      unslot()
    }
  },
})
