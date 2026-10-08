import { Model } from "@opencode/plugin"
import { Money } from "@opencode/schema/money"

const reasoningVariants = ["none", "low", "medium", "high", "xhigh", "max"].map((id) => ({
  id: Model.VariantID.make(id),
  settings: { reasoningEffort: id },
}))

type Price = { input: number; output: number; cache_read?: number; cache_write?: number }

function flexModel(
  id: string,
  name: string,
  cost: Price & { context_over_200k?: Price },
  options: { reasoning?: { mode: string }; contextThreshold?: number } = {},
) {
  const { contextThreshold = 200_000, ...settings } = options
  return {
    modelID: Model.ID.make(id),
    name,
    cost: [cost, ...(cost.context_over_200k ? [cost.context_over_200k] : [])].map((price, index) => ({
      ...(index === 1 ? { tier: { type: "context" as const, size: contextThreshold } } : {}),
      input: Money.USDPerMillionTokens.make(price.input),
      output: Money.USDPerMillionTokens.make(price.output),
      cache: {
        read: Money.USDPerMillionTokens.make(price.cache_read ?? 0),
        write: Money.USDPerMillionTokens.make(price.cache_write ?? 0),
      },
    })),
    limit: { context: 1_000_000, output: 32_000 },
    settings: { serviceTier: "flex", ...settings },
    variants: reasoningVariants,
  }
}

export const flexModels = {
  "gpt-6-astra-flex": flexModel("gpt-6-astra", "gpt-6 astra FLEX", {
    input: 5,
    cache_read: 0.5,
    cache_write: 6.25,
    output: 25,
    context_over_200k: {
      input: 10,
      cache_read: 1,
      cache_write: 12.5,
      output: 37.5,
    },
  }),

  "gpt-6.1-sol-flex": {
    ...flexModel("gpt-6.1-sol", "gpt-6.1 sol FLEX", {
      input: 1,
      cache_read: 0.05,
      cache_write: 1.25,
      output: 5,
      context_over_200k: {
        input: 2,
        cache_read: 0.1,
        cache_write: 2.5,
        output: 7.5,
      },
    }, { contextThreshold: 272_000 }),
    limit: { context: 1_050_000, input: 922_000, output: 128_000 },
    variants: reasoningVariants.filter((variant) => variant.id !== "none"),
  },

  "gpt-6.1-sol-pro-flex": {
    ...flexModel("gpt-6.1-sol", "gpt-6.1 sol pro FLEX", {
      input: 1,
      cache_read: 0.05,
      cache_write: 1.25,
      output: 5,
      context_over_200k: {
        input: 2,
        cache_read: 0.1,
        cache_write: 2.5,
        output: 7.5,
      },
    }, { contextThreshold: 272_000, reasoning: { mode: "pro" } }),
    limit: { context: 1_050_000, input: 922_000, output: 128_000 },
    variants: reasoningVariants.filter((variant) => variant.id !== "none"),
  },

  "gpt-6-sol-flex": flexModel("gpt-6-sol", "gpt-6 sol FLEX", {
    input: 1,
    cache_read: 0.1,
    cache_write: 1.25,
    output: 5,
    context_over_200k: {
      input: 2,
      cache_read: 0.2,
      cache_write: 2.5,
      output: 7.5,
    },
  }),

  "gpt-6-luna-flex": flexModel("gpt-6-luna", "gpt-6 luna FLEX", {
    input: 0.05,
    cache_read: 0.005,
    cache_write: 0.0625,
    output: 0.25,
    context_over_200k: {
      input: 0.1,
      cache_read: 0.01,
      cache_write: 0.125,
      output: 0.375,
    },
  }),

  "gpt-5.6-sol-flex": flexModel("gpt-5.6-sol", "gpt-5.6 sol FLEX", {
    input: 2,
    cache_read: 0.2,
    cache_write: 2.5,
    output: 10,
    context_over_200k: {
      input: 4,
      cache_read: 0.4,
      cache_write: 5,
      output: 15,
    },
  }),

  "gpt-5.6-terra-flex": flexModel("gpt-5.6-terra", "gpt-5.6 terra FLEX", {
    input: 1,
    cache_read: 0.1,
    cache_write: 1.25,
    output: 6,
    context_over_200k: {
      input: 2,
      cache_read: 0.2,
      cache_write: 2.5,
      output: 9,
    },
  }),
  "gpt-5.6-luna-flex": flexModel("gpt-5.6-luna", "gpt-5.6 luna FLEX", {
    input: 0.1,
    cache_read: 0.01,
    cache_write: 0.125,
    output: 0.6,
    context_over_200k: {
      input: 0.2,
      cache_read: 0.02,
      cache_write: 0.25,
      output: 0.9,
    },
  }),
  "gpt-5.6-sol-pro-flex": flexModel("gpt-5.6-sol", "gpt-5.6 sol pro FLEX", {
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
  }, { reasoning: { mode: "pro" } }),

  "gpt-5.6-terra-pro-flex": flexModel("gpt-5.6-terra", "gpt-5.6 terra pro FLEX", {
    input: 1,
    cache_read: 0.1,
    cache_write: 1.25,
    output: 6,
    context_over_200k: {
      input: 2,
      cache_read: 0.2,
      cache_write: 2.5,
      output: 9,
    },
  }, { reasoning: { mode: "pro" } }),
  "gpt-5.6-luna-pro-flex": flexModel("gpt-5.6-luna", "gpt-5.6 luna pro FLEX", {
    input: 0.1,
    cache_read: 0.01,
    cache_write: 0.125,
    output: 0.6,
    context_over_200k: {
      input: 0.2,
      cache_read: 0.02,
      cache_write: 0.25,
      output: 0.9,
    },
  }, { reasoning: { mode: "pro" } }),
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
    cache_read: 0.13,
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
