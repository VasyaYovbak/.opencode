import type { Plugin } from "@opencode-ai/plugin"

const reasoningVariants = {
  none: { reasoningEffort: "none" },
  low: { reasoningEffort: "low" },
  medium: { reasoningEffort: "medium" },
  high: { reasoningEffort: "high" },
  xhigh: { reasoningEffort: "xhigh" },
  max: { reasoningEffort: "max" },
}

function flexModel(
  id: string,
  name: string,
  cost: Record<string, unknown>,
) {
  return {
    id,
    name,
    cost,
    options: { serviceTier: "flex" },
    variants: reasoningVariants,
  }
}

const flexModels = {
  "gpt-5.6-sol-flex": flexModel("gpt-5.6-sol", "gpt-5.6 sol FLEX", {
    input: 2.5,
    cache_read: 0.25,
    cache_write: 3.125,
    output: 15,
    context_over_200k: {
      input: 5,
      cache_read: 0.5,
      cache_write: 6.25,
      output: 22.5,
    },
  }),

  "gpt-5.6-terra-flex": flexModel("gpt-5.6-terra", "gpt-5.6 terra FLEX", {
    input: 1.25,
    cache_read: 0.125,
    cache_write: 1.5625,
    output: 7.5,
    context_over_200k: {
      input: 2.5,
      cache_read: 0.25,
      cache_write: 3.125,
      output: 11.25,
    },
  }),
  "gpt-5.6-luna-flex": flexModel("gpt-5.6-luna", "gpt-5.6 luna FLEX", {
    input: 0.5,
    cache_read: 0.05,
    cache_write: 0.625,
    output: 3,
    context_over_200k: {
      input: 1,
      cache_read: 0.1,
      cache_write: 1.25,
      output: 4.5,
    },
  }),
    "gpt-5.6-sol-pro-flex": flexModel("gpt-5.6-sol-pro", "gpt-5.6 sol pro FLEX", {
    input: 2.5,
    cache_read: 0.25,
    cache_write: 3.125,
    output: 15,
    context_over_200k: {
      input: 5,
      cache_read: 0.5,
      cache_write: 6.25,
      output: 22.5,
    },
  }),

  "gpt-5.6-terra-pro-flex": flexModel("gpt-5.6-terra-pro", "gpt-5.6 terra FLEX", {
    input: 1.25,
    cache_read: 0.125,
    cache_write: 1.5625,
    output: 7.5,
    context_over_200k: {
      input: 2.5,
      cache_read: 0.25,
      cache_write: 3.125,
      output: 11.25,
    },
  }),
  "gpt-5.6-luna-pro-flex": flexModel("gpt-5.6-luna-pro", "gpt-5.6 luna FLEX", {
    input: 0.5,
    cache_read: 0.05,
    cache_write: 0.625,
    output: 3,
    context_over_200k: {
      input: 1,
      cache_read: 0.1,
      cache_write: 1.25,
      output: 4.5,
    },
  }),
  "gpt-5.5-flex": flexModel("gpt-5.5", "gpt-5.5 FLEX", {
    input: 2.5,
    cache_read: 0.25,
    output: 15,
    context_over_200k: {
      input: 5,
      cache_read: 0.5,
      output: 22.5,
    },
  }),
  "gpt-5.4-flex": flexModel("gpt-5.4", "gpt-5.4 FLEX", {
    input: 1.25,
    cache_read: 0.125,
    output: 7.5,
    context_over_200k: {
      input: 2.5,
      cache_read: 0.25,
      output: 11.25,
    },
  }),
  "gpt-5.4-mini-flex": flexModel("gpt-5.4-mini", "gpt-5.4 mini FLEX", {
    input: 0.375,
    cache_read: 0.0375,
    output: 2.25,
  }),
  "gpt-5.4-nano-flex": flexModel("gpt-5.4-nano", "gpt-5.4 nano FLEX", {
    input: 0.1,
    cache_read: 0.01,
    output: 0.625,
  }),
}

const OpenAIFlexModelsPlugin: Plugin = async () => ({
  config: async (config) => {
    const provider = (config.provider ??= {}) as Record<string, unknown>
    const openai = (provider.openai ??= {}) as Record<string, unknown>
    const models = (openai.models ??= {}) as Record<string, unknown>

    Object.assign(models, flexModels)
  },
})

export default OpenAIFlexModelsPlugin
