import { Plugin } from "@opencode/plugin"
import { initializeCodebaseMemory } from "./plugins/codebase-memory/index.js"
import { registerOpenAIFlexModels } from "./plugins/openai-flex-models/index.js"
import { registerShellEnv } from "./plugins/shell-env/index.js"

export default Plugin.define({
  id: "local.personal-plugin-suite",
  async setup(ctx) {
    let cleanup: (() => Promise<void>) | undefined
    const shellEnv = await registerShellEnv(ctx)
    try {
      cleanup = await initializeCodebaseMemory(ctx, shellEnv)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Codebase Memory initialization failed; continuing without CBM: ${message}`)
    }
    try {
      await registerOpenAIFlexModels(ctx)
    } catch (error) {
      await cleanup?.()
      throw error
    }
    return cleanup
  },
})
