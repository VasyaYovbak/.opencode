export type TokenSample = { at: number; tokens: number }

export function estimateTokens(text: string) {
  return Math.max(1, Buffer.byteLength(text, "utf8") / 4)
}

export function generatedTokens(outputTokens: number, reasoningTokens: number) {
  return outputTokens + reasoningTokens
}

export function promptTokens(inputTokens: number, cacheReadTokens: number, cacheWriteTokens: number) {
  return inputTokens + cacheReadTokens + cacheWriteTokens
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

export function finalSpeeds(promptTokens: number, outputTokens: number, createdAt: number, firstTokenAt: number, completedAt: number) {
  const ttftMs = Math.max(0, firstTokenAt - createdAt)
  const generationMs = Math.max(0, completedAt - firstTokenAt)

  return {
    ttftMs,
    // baza: OpenCode has no provider prefill timing. This network-inclusive
    // estimate should be replaced when providers expose real prefill telemetry.
    prompt: ttftMs > 0 && promptTokens > 0 ? promptTokens / (ttftMs / 1_000) : undefined,
    generation: generationMs > 0 && outputTokens > 0 ? outputTokens / (generationMs / 1_000) : undefined,
  }
}
