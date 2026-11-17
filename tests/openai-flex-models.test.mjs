import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import ts from "typescript"

async function moduleUrl(path, imports) {
  const source = await readFile(path, "utf8")
  let js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  for (const [specifier, url] of Object.entries(imports)) {
    js = js.replace(`"${specifier}"`, JSON.stringify(url))
  }
  return `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
}

const modelsUrl = await moduleUrl("src/plugins/openai-flex-models/models.ts", {
  "@opencode/plugin": import.meta.resolve("@opencode/plugin"),
  "@opencode/schema/money": import.meta.resolve("@opencode/schema/money"),
})
const { flexModels } = await import(modelsUrl)
const indexUrl = await moduleUrl("src/plugins/openai-flex-models/index.ts", { "./models.js": modelsUrl })
const { registerOpenAIFlexModels } = await import(indexUrl)

const cases = [
  ["astra", [4, 20, 0.2, 5], [8, 30, 0.4, 10]],
  ["sol", [1, 5, 0.05, 1.25], [2, 7.5, 0.1, 2.5]],
]

for (const [name, short, long] of cases) {
  for (const pro of [false, true]) {
    const id = `gpt-6.2-${name}${pro ? "-pro" : ""}-flex`
    test(`${id} uses the base model and experimental Batch rates`, () => {
      const model = flexModels[id]
      assert.equal(model.modelID, `gpt-6.2-${name}`)
      assert.deepEqual(model.settings, pro
        ? { serviceTier: "flex", reasoning: { mode: "pro" } }
        : { serviceTier: "flex" })
      assert.deepEqual(model.limit, { context: 1_050_000, input: 922_000, output: 128_000 })
      assert.deepEqual(model.variants.map((variant) => variant.id), ["low", "medium", "high", "xhigh", "max"])
      assert.deepEqual(model.cost, [
        { input: short[0], output: short[1], cache: { read: short[2], write: short[3] } },
        { tier: { type: "context", size: 272_000 }, input: long[0], output: long[1], cache: { read: long[2], write: long[3] } },
      ])
    })
  }
}

test("registration inherits base capabilities and adds Flex settings", async () => {
  const provider = {
    activation: "disabled",
    models: new Map(cases.map(([name]) => [`gpt-6.2-${name}`, {
      capabilities: { image: true },
      settings: { reasoning: { effort: "high" }, custom: true },
      limit: { context: 1, output: 1 },
    }])),
  }
  const registered = new Map()
  const editor = {
    update(id, update) { assert.equal(id, "openai"); update(provider) },
    get(id) { assert.equal(id, "openai"); return provider },
    models: {
      update(providerID, id, update) {
        assert.equal(providerID, "openai")
        const model = { settings: {}, limit: {} }
        update(model)
        registered.set(id, model)
      },
    },
  }
  await registerOpenAIFlexModels({ provider: { transform: async (transform) => transform(editor) } })
  assert.equal(provider.activation, "enabled")
  for (const [name] of cases) {
    const base = provider.models.get(`gpt-6.2-${name}`)
    for (const suffix of ["-flex", "-pro-flex"]) {
      const model = registered.get(`gpt-6.2-${name}${suffix}`)
      assert.deepEqual(model.capabilities, { image: true })
      assert.equal(model.settings.custom, true)
      assert.equal(model.settings.serviceTier, "flex")
      assert.deepEqual(model.settings.reasoning, suffix === "-pro-flex"
        ? { effort: "high", mode: "pro" }
        : { effort: "high" })
      assert.deepEqual(model.limit, { context: 1_050_000, input: 922_000, output: 128_000 })
      assert.deepEqual(base.settings, { reasoning: { effort: "high" }, custom: true })
    }
  }
})
