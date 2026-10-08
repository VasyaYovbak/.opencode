import { Plugin } from "@opencode/plugin"
import { initializeCodebaseMemory } from "./plugins/codebase-memory/index.js"
import { registerOpenAIFlexModels } from "./plugins/openai-flex-models/index.js"

export default Plugin.define({
  id: "local.personal-plugin-suite",
  async setup(ctx) {
    await initializeCodebaseMemory(ctx)
    await registerOpenAIFlexModels(ctx)
  },
})
