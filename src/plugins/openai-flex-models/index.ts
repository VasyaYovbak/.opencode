import type { Plugin } from "@opencode/plugin"
import { flexModels } from "./models.js"

export async function registerOpenAIFlexModels(ctx: Plugin.Context): Promise<void> {
  await ctx.provider.transform((editor) => {
    editor.update("openai", (provider) => { provider.activation = "enabled" })
    Object.entries(flexModels).forEach(([id, definition]) => {
      const base = editor.get("openai")?.models.get(definition.modelID)
      editor.models.update("openai", id, (model) => {
        if (base) Object.assign(model, structuredClone(base))
        const settings = model.settings
        const limit = model.limit
        Object.assign(model, definition)
        model.limit = { ...limit, ...definition.limit }
        model.settings = { ...settings, ...definition.settings }
        if (definition.settings.reasoning) {
          model.settings.reasoning = { ...settings?.reasoning, ...definition.settings.reasoning }
        }
      })
    })
  })
}
