import { Plugin } from "@opencode/plugin"
import { initializeCodebaseMemory } from "./plugins/codebase-memory/index.js"
import { registerOpenAIFlexModels } from "./plugins/openai-flex-models/index.js"

export default Plugin.define({
  id: "local.personal-plugin-suite",
  async setup(ctx) {
    try {
      await initializeCodebaseMemory(ctx)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Codebase Memory initialization failed; continuing without CBM: ${message}`)
    }
    await registerOpenAIFlexModels(ctx)
  },
})
