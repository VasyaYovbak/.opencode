import type { Plugin } from "@opencode/plugin"

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/
const PREFIX = "env/"

export async function registerShellEnv(ctx: Plugin.Context): Promise<void> {
  const values = new Map<string, string>()

  let after: string | undefined
  do {
    const page = await ctx.storage.scan({ prefix: PREFIX, after, limit: 100 })
    for (const entry of page.entries) {
      if (typeof entry.value === "string") values.set(entry.key.slice(PREFIX.length), entry.value)
    }
    after = page.next
  } while (after)

  await ctx.shell.hook("create.before", (event) => {
    for (const [name, value] of values) event.env[name] = value
  })

  await ctx.tool.transform((editor) => {
    editor.add({
      name: "shell_env_set",
      description:
        "Set a persistent environment variable that is injected into every later shell command. Use it to store values such as project names, then reference them as $NAME. Fails if the name is already set in the process environment.",
      input: {
        type: "object",
        properties: {
          name: { type: "string", description: "Variable name, letters, digits and underscores, not starting with a digit" },
          value: { type: "string", description: "Variable value" },
        },
        required: ["name", "value"],
        additionalProperties: false,
      },
      execute: async (input) => {
        const { name, value } = input as { name: string; value: string }
        if (!NAME.test(name)) return { content: `Invalid variable name: ${name}` }
        if (Object.hasOwn(process.env, name)) return { content: `${name} is already set in the process environment` }
        await ctx.storage.set(PREFIX + name, value)
        values.set(name, value)
        return { content: `Set ${name}` }
      },
    })

    editor.add({
      name: "shell_env_unset",
      description: "Remove a persistent environment variable previously set with shell_env_set.",
      input: {
        type: "object",
        properties: { name: { type: "string", description: "Variable name to remove" } },
        required: ["name"],
        additionalProperties: false,
      },
      execute: async (input) => {
        const { name } = input as { name: string }
        if (!values.has(name)) return { content: `${name} is not set by shell_env` }
        await ctx.storage.remove(PREFIX + name)
        values.delete(name)
        return { content: `Removed ${name}` }
      },
    })

    editor.add({
      name: "shell_env_list",
      description: "List persistent environment variables set with shell_env_set.",
      input: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => {
        if (values.size === 0) return { content: "No shell_env variables set" }
        return { content: [...values].map(([name, value]) => `${name}=${value}`).join("\n") }
      },
    })
  })
}
