import type { Plugin } from "@opencode-ai/plugin"

const SERIAL_EXEMPT_TOOLS = new Set([
  "apply_patch",
  "edit",
  "hashline_edit",
  "patch",
  "write",
])

const SERIAL_TURN_THRESHOLD = 3
const WARNING_COOLDOWN_TURNS = 3
const MAX_RECORDED_TURNS = 12

const REMINDER = [
  "Tool batching reminder:",
  "Recent tool usage looks serial. Before the next tool call, batch independent operations in one parallel call where safe. Keep in mind main Batch Tool Execution rules.",
].join("\n")

interface ToolTurn {
  tools: string[]
}

interface SessionState {
  activeTools: number
  currentTools: string[]
  turns: ToolTurn[]
  completedTurns: number
  lastWarningTurn: number
}

interface ToolExecuteInput {
  tool: string
  sessionID?: string
}

interface ToolExecuteAfterOutput {
  output?: string
}

const BatchToolReminderPlugin: Plugin = async ({ client }) => {
  const sessions = new Map<string, SessionState>()

  return {
    "tool.execute.before": async (input: ToolExecuteInput) => {
      const sessionID = getSessionID(input)
      const state = getState(sessions, sessionID)
      state.activeTools += 1
      state.currentTools.push(normalizeToolName(input.tool))
    },

    "tool.execute.after": async (input: ToolExecuteInput, output?: ToolExecuteAfterOutput) => {
      const sessionID = getSessionID(input)
      const state = getState(sessions, sessionID)

      if (state.currentTools.length === 0) {
        state.currentTools.push(normalizeToolName(input.tool))
      }
      state.activeTools = Math.max(0, state.activeTools - 1)
      if (state.activeTools > 0) return

      finalizeCurrentTurn(state)
      if (!shouldWarn(state)) return
      if (state.completedTurns - state.lastWarningTurn < WARNING_COOLDOWN_TURNS) return
      if (output === undefined || typeof output.output !== "string") return
      if (output.output.includes("Tool batching reminder:")) return

      output.output = appendReminder(output.output)
      state.lastWarningTurn = state.completedTurns

      await client.app.log({
        body: {
          service: "batch-tool-reminder",
          level: "warn",
          message: "Detected repeated single-tool turns; appended batching reminder to tool output",
          extra: {
            sessionID,
            recentTurns: state.turns.slice(-SERIAL_TURN_THRESHOLD),
          },
        },
      })
    },
  }
}

export default BatchToolReminderPlugin
export { BatchToolReminderPlugin }

function getState(states: Map<string, SessionState>, sessionID: string): SessionState {
  let state = states.get(sessionID)
  if (state === undefined) {
    state = {
      activeTools: 0,
      currentTools: [],
      turns: [],
      completedTurns: 0,
      lastWarningTurn: Number.NEGATIVE_INFINITY,
    }
    states.set(sessionID, state)
  }
  return state
}

function getSessionID(input: { sessionID?: string }): string {
  return input.sessionID ?? "__unknown_session__"
}

function normalizeToolName(tool: string): string {
  const lower = tool.toLowerCase()
  const parts = lower.split(/[./]/)
  return parts[parts.length - 1] ?? lower
}

function finalizeCurrentTurn(state: SessionState): void {
  if (state.currentTools.length === 0) return

  state.turns.push({ tools: [...state.currentTools] })
  state.currentTools = []
  state.completedTurns += 1

  if (state.turns.length > MAX_RECORDED_TURNS) {
    state.turns.splice(0, state.turns.length - MAX_RECORDED_TURNS)
  }
}

function shouldWarn(state: SessionState): boolean {
  if (state.turns.length < SERIAL_TURN_THRESHOLD) return false

  const recentTurns = state.turns.slice(-SERIAL_TURN_THRESHOLD)
  return recentTurns.every(isSingleReminderEligibleTurn)
}

function isSingleReminderEligibleTurn(turn: ToolTurn): boolean {
  return turn.tools.length === 1 && !SERIAL_EXEMPT_TOOLS.has(turn.tools[0] ?? "")
}

function appendReminder(output: string): string {
  return `${output}\n\n${REMINDER}`
}
