// @bun
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);

// src/shared/plugin-identity.ts
var LOG_FILENAME = "oh-my-opencode.log", CACHE_DIR_NAME = "oh-my-opencode";
var init_plugin_identity = () => {};

// src/shared/logger.ts
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
function rotateLogFileIfNeeded() {
  try {
    if (!fs.existsSync(logFile))
      return;
    const stats = fs.statSync(logFile);
    if (stats.size <= maxLogFileSizeBytes)
      return;
    const oldest = `${logFile}.${maxLogFileBackups}`;
    if (fs.existsSync(oldest)) {
      fs.unlinkSync(oldest);
    }
    for (let i = maxLogFileBackups - 1;i >= 1; i -= 1) {
      const src = `${logFile}.${i}`;
      const dst = `${logFile}.${i + 1}`;
      if (fs.existsSync(src)) {
        fs.renameSync(src, dst);
      }
    }
    fs.renameSync(logFile, `${logFile}.1`);
  } catch (error) {
    if (error instanceof Error)
      return;
  }
}
function flush() {
  if (buffer.length === 0)
    return;
  const data = buffer.join("");
  buffer = [];
  try {
    fs.appendFileSync(logFile, data);
    rotateLogFileIfNeeded();
  } catch (error) {
    if (error instanceof Error)
      return;
  }
}
function scheduleFlush() {
  if (flushTimer)
    return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}
function log(message, data) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ""}
`;
    buffer.push(logEntry);
    if (buffer.length >= BUFFER_SIZE_LIMIT) {
      flush();
    } else {
      scheduleFlush();
    }
  } catch (error) {
    if (error instanceof Error)
      return;
  }
}
var DEFAULT_MAX_LOG_FILE_SIZE_BYTES, DEFAULT_MAX_LOG_FILE_BACKUPS = 2, logFile, maxLogFileSizeBytes, maxLogFileBackups, buffer, flushTimer = null, FLUSH_INTERVAL_MS = 500, BUFFER_SIZE_LIMIT = 50;
var init_logger = __esm(() => {
  init_plugin_identity();
  DEFAULT_MAX_LOG_FILE_SIZE_BYTES = 50 * 1024 * 1024;
  logFile = path.join(os.tmpdir(), LOG_FILENAME);
  maxLogFileSizeBytes = DEFAULT_MAX_LOG_FILE_SIZE_BYTES;
  maxLogFileBackups = DEFAULT_MAX_LOG_FILE_BACKUPS;
  buffer = [];
});

// packages/model-core/src/agent-model-requirements.ts
var init_agent_model_requirements = () => {};

// packages/model-core/src/category-model-requirements.ts
var init_category_model_requirements = () => {};

// packages/model-core/src/model-requirements.ts
var init_model_requirements = __esm(() => {
  init_agent_model_requirements();
  init_category_model_requirements();
});

// packages/model-core/src/model-family-detectors.ts
var init_model_family_detectors = () => {};

// packages/model-core/src/model-capability-aliases.ts
var EXACT_ALIAS_RULES, EXACT_ALIAS_RULES_BY_MODEL;
var init_model_capability_aliases = __esm(() => {
  EXACT_ALIAS_RULES = [
    {
      aliasModelID: "gemini-3-pro-high",
      ruleID: "gemini-3-pro-tier-alias",
      canonicalModelID: "gemini-3-pro-preview",
      rationale: "Legacy Gemini 3 tier suffixes still need to land on the canonical preview model."
    },
    {
      aliasModelID: "gemini-3-pro-low",
      ruleID: "gemini-3-pro-tier-alias",
      canonicalModelID: "gemini-3-pro-preview",
      rationale: "Legacy Gemini 3 tier suffixes still need to land on the canonical preview model."
    },
    {
      aliasModelID: "k2pb",
      ruleID: "kimi-k2pb-alias",
      canonicalModelID: "k2p5",
      rationale: "Kimi for Coding exposes k2pb while the bundled capabilities snapshot uses the canonical k2p5 ID."
    },
    {
      aliasModelID: "claude-opus-4.7",
      ruleID: "claude-opus-dotted-version-alias",
      canonicalModelID: "claude-opus-4-7",
      rationale: "GitHub Copilot exposes Claude Opus 4.7 with dotted version syntax while the snapshot uses dashed syntax."
    }
  ];
  EXACT_ALIAS_RULES_BY_MODEL = new Map(EXACT_ALIAS_RULES.map((rule) => [rule.aliasModelID, rule]));
});
// packages/model-core/src/model-capability-heuristics.ts
var init_model_capability_heuristics = () => {};

// packages/model-core/src/model-capability-guardrails.ts
var init_model_capability_guardrails = __esm(() => {
  init_model_capability_aliases();
  init_model_requirements();
});

// packages/model-core/src/model-settings-compatibility.ts
var init_model_settings_compatibility = __esm(() => {
  init_model_capability_heuristics();
});
// packages/model-core/src/provider-model-id-transform.ts
var init_provider_model_id_transform = () => {};

// packages/model-core/src/model-resolution-pipeline.ts
var init_model_resolution_pipeline = __esm(() => {
  init_provider_model_id_transform();
});

// packages/model-core/src/known-variants.ts
var KNOWN_VARIANTS;
var init_known_variants = __esm(() => {
  KNOWN_VARIANTS = new Set([
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
    "minimal",
    "none",
    "auto",
    "thinking"
  ]);
});

// packages/model-core/src/connected-providers-cache.ts
var init_connected_providers_cache = () => {};

// packages/model-core/src/model-resolver.ts
var init_model_resolver = __esm(() => {
  init_model_resolution_pipeline();
  init_known_variants();
  init_connected_providers_cache();
});
// packages/model-core/src/model-string-parser.ts
var KNOWN_VARIANTS2;
var init_model_string_parser = __esm(() => {
  KNOWN_VARIANTS2 = new Set([
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
    "minimal",
    "none",
    "auto",
    "thinking"
  ]);
});
// packages/model-core/src/fallback-chain-from-models.ts
var init_fallback_chain_from_models = __esm(() => {
  init_model_resolver();
  init_known_variants();
});

// packages/model-core/src/model-error-classifier.ts
function hasProviderAutoRetrySignal(message) {
  if (!message.includes("retrying in")) {
    return false;
  }
  return AUTO_RETRY_GATE_PATTERNS.some((pattern) => message.includes(pattern));
}
function isRetryableModelError(error) {
  if (error.name) {
    const errorNameLower = error.name.toLowerCase();
    if (NON_RETRYABLE_ERROR_NAMES.has(errorNameLower)) {
      return false;
    }
    if (STOP_ERROR_NAMES.has(errorNameLower)) {
      return false;
    }
    if (RETRYABLE_ERROR_NAMES.has(errorNameLower)) {
      return true;
    }
  }
  const msg = error.message?.toLowerCase() ?? "";
  if (STOP_MESSAGE_PATTERNS.some((pattern) => msg.includes(pattern))) {
    return false;
  }
  if (hasProviderAutoRetrySignal(msg)) {
    return true;
  }
  if (error.statusCode != null && (error.statusCode === 429 || error.statusCode === 503 || error.statusCode === 529)) {
    return true;
  }
  return RETRYABLE_MESSAGE_PATTERNS.some((pattern) => msg.includes(pattern));
}
var RETRYABLE_ERROR_NAMES, STOP_ERROR_NAMES, NON_RETRYABLE_ERROR_NAMES, RETRYABLE_MESSAGE_PATTERNS, STOP_MESSAGE_PATTERNS, AUTO_RETRY_GATE_PATTERNS;
var init_model_error_classifier = __esm(() => {
  init_connected_providers_cache();
  RETRYABLE_ERROR_NAMES = new Set([
    "providermodelnotfounderror",
    "ratelimiterror",
    "modelunavailableerror",
    "providerconnectionerror",
    "authenticationerror"
  ]);
  STOP_ERROR_NAMES = new Set([
    "quotaexceedederror",
    "insufficientcreditserror",
    "freeusagelimiterror"
  ]);
  NON_RETRYABLE_ERROR_NAMES = new Set([
    "messageabortederror",
    "permissiondeniederror",
    "contextlengtherror",
    "timeouterror",
    "validationerror",
    "syntaxerror",
    "usererror"
  ]);
  RETRYABLE_MESSAGE_PATTERNS = [
    "rate_limit",
    "rate limit",
    "usage_limit_reached",
    "usage limit has been reached",
    "quota",
    "all credentials for model",
    "cooling down",
    "exhausted your capacity",
    "not found",
    "unavailable",
    "insufficient",
    "too many requests",
    "over limit",
    "overloaded",
    "bad gateway",
    "bad request",
    "unknown provider",
    "provider not found",
    "model_not_supported",
    "model not supported",
    "model is not supported",
    "connection error",
    "network error",
    "timeout",
    "service unavailable",
    "internal_server_error",
    "free usage",
    "usage exceeded",
    "credit",
    "balance",
    "temporarily unavailable",
    "try again",
    "\u8BF7\u7A0D\u540E\u91CD\u8BD5",
    "503",
    "502",
    "504",
    "429",
    "529",
    "selected provider is forbidden",
    "provider is forbidden",
    "\u9891\u7387\u9650\u5236",
    "\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41",
    "\u6682\u65F6\u4E0D\u53EF\u7528",
    "\u670D\u52A1\u4E0D\u53EF\u7528",
    "server_error",
    "an error occurred while processing"
  ];
  STOP_MESSAGE_PATTERNS = [
    "quota will reset after",
    "quota exceeded",
    "free usage limit",
    "billing limit",
    "billing hard limit",
    "monthly limit",
    "plan limit",
    "subscription quota",
    "subscription limit",
    "payment required",
    "out of credits",
    "credits exhausted",
    "insufficient credits",
    "insufficient balance",
    "credit balance",
    "usage limit for this month",
    "exhausted your capacity",
    "daily call limit",
    "daily limit",
    "usage limit reached for",
    "in arrears",
    "fair use policy",
    "recharge and try",
    "\u4F7F\u7528\u4E0A\u9650",
    "\u989D\u5EA6\u4E0D\u8DB3",
    "\u4F59\u989D\u4E0D\u8DB3",
    "\u5DF2\u8017\u5C3D"
  ];
  AUTO_RETRY_GATE_PATTERNS = [
    "rate limit",
    "cooling down",
    "credentials for model"
  ];
});

// packages/model-core/src/model-capabilities/supplemental-entries.ts
var init_supplemental_entries = () => {};

// packages/model-core/src/model-capabilities/bundled-snapshot.ts
var init_bundled_snapshot = __esm(() => {
  init_supplemental_entries();
});
// packages/model-core/src/model-capabilities/get-model-capabilities.ts
var init_get_model_capabilities = __esm(() => {
  init_model_capability_aliases();
  init_model_capability_heuristics();
});

// packages/model-core/src/model-capabilities/index.ts
var init_model_capabilities = __esm(() => {
  init_bundled_snapshot();
  init_get_model_capabilities();
});

// packages/model-core/src/context-limit-resolver.ts
var init_context_limit_resolver = () => {};

// packages/model-core/src/model-capabilities-snapshot.ts
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readBoolean(value) {
  return typeof value === "boolean" ? value : undefined;
}
function readNumber(value) {
  return typeof value === "number" ? value : undefined;
}
function readString(value) {
  return typeof value === "string" ? value : undefined;
}
function readStringArray(value) {
  if (!Array.isArray(value)) {
    return;
  }
  const result = value.filter((item) => typeof item === "string");
  return result.length > 0 ? result : undefined;
}
function normalizeSnapshotEntry(rawModelID, rawModel) {
  if (!isRecord2(rawModel)) {
    return;
  }
  const id = readString(rawModel.id) ?? rawModelID;
  const family = readString(rawModel.family);
  const reasoning = readBoolean(rawModel.reasoning);
  const temperature = readBoolean(rawModel.temperature);
  const toolCall = readBoolean(rawModel.tool_call);
  const rawModalities = isRecord2(rawModel.modalities) ? rawModel.modalities : undefined;
  const modalitiesInput = readStringArray(rawModalities?.input);
  const modalitiesOutput = readStringArray(rawModalities?.output);
  const modalities = modalitiesInput || modalitiesOutput ? {
    ...modalitiesInput ? { input: modalitiesInput } : {},
    ...modalitiesOutput ? { output: modalitiesOutput } : {}
  } : undefined;
  const rawLimit = isRecord2(rawModel.limit) ? rawModel.limit : undefined;
  const limitContext = readNumber(rawLimit?.context);
  const limitInput = readNumber(rawLimit?.input);
  const limitOutput = readNumber(rawLimit?.output);
  const limit = limitContext !== undefined || limitInput !== undefined || limitOutput !== undefined ? {
    ...limitContext !== undefined ? { context: limitContext } : {},
    ...limitInput !== undefined ? { input: limitInput } : {},
    ...limitOutput !== undefined ? { output: limitOutput } : {}
  } : undefined;
  return {
    id,
    ...family ? { family } : {},
    ...reasoning !== undefined ? { reasoning } : {},
    ...temperature !== undefined ? { temperature } : {},
    ...toolCall !== undefined ? { toolCall } : {},
    ...modalities ? { modalities } : {},
    ...limit ? { limit } : {}
  };
}
function mergeSnapshotEntries(existing, incoming) {
  if (!existing) {
    return incoming;
  }
  const mergedModalities = existing.modalities || incoming.modalities ? {
    ...existing.modalities,
    ...incoming.modalities
  } : undefined;
  const mergedLimit = existing.limit || incoming.limit ? {
    ...existing.limit,
    ...incoming.limit
  } : undefined;
  return {
    ...existing,
    ...incoming,
    ...mergedModalities ? { modalities: mergedModalities } : {},
    ...mergedLimit ? { limit: mergedLimit } : {}
  };
}
function buildModelCapabilitiesSnapshotFromModelsDev(raw) {
  const models = {};
  const providers = isRecord2(raw) ? raw : {};
  for (const providerValue of Object.values(providers)) {
    if (!isRecord2(providerValue)) {
      continue;
    }
    const providerModels = providerValue.models;
    if (!isRecord2(providerModels)) {
      continue;
    }
    for (const [rawModelID, rawModel] of Object.entries(providerModels)) {
      const normalizedEntry = normalizeSnapshotEntry(rawModelID, rawModel);
      if (!normalizedEntry) {
        continue;
      }
      models[normalizedEntry.id.toLowerCase()] = mergeSnapshotEntries(models[normalizedEntry.id.toLowerCase()], normalizedEntry);
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    sourceUrl: MODELS_DEV_SOURCE_URL,
    models
  };
}
async function fetchModelCapabilitiesSnapshot(args = {}) {
  const sourceUrl = args.sourceUrl ?? MODELS_DEV_SOURCE_URL;
  const fetchImpl = args.fetchImpl ?? fetch;
  const response = await fetchImpl(sourceUrl);
  if (!response.ok) {
    throw new Error(`models.dev fetch failed with ${response.status}`);
  }
  const raw = await response.json();
  const snapshot = buildModelCapabilitiesSnapshotFromModelsDev(raw);
  return {
    ...snapshot,
    sourceUrl
  };
}
var MODELS_DEV_SOURCE_URL = "https://models.dev/api.json";
// packages/model-core/src/index.ts
var init_src = __esm(() => {
  init_model_resolver();
  init_provider_model_id_transform();
  init_model_resolution_pipeline();
  init_model_requirements();
  init_model_family_detectors();
  init_model_capability_aliases();
  init_model_capability_heuristics();
  init_model_capability_guardrails();
  init_model_settings_compatibility();
  init_model_string_parser();
  init_fallback_chain_from_models();
  init_known_variants();
  init_model_error_classifier();
  init_model_capabilities();
  init_context_limit_resolver();
});

// src/shared/bun-spawn-shim.ts
import {
  spawn as nodeSpawn,
  spawnSync as nodeSpawnSync
} from "child_process";
import { Readable, Writable } from "stream";
function getBunRuntime() {
  return typeof Bun === "undefined" ? undefined : runtime3.Bun;
}
function emptyReadableStream() {
  return new ReadableStream({
    start(controller) {
      controller.close();
    }
  });
}
function toReadableStream(stream) {
  if (!stream)
    return emptyReadableStream();
  return Readable.toWeb(stream);
}
function emptyWritableStream() {
  return new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    }
  });
}
function resolveCommand(cmdOrOpts, optsArg) {
  const isObj = !Array.isArray(cmdOrOpts);
  const opts = isObj ? cmdOrOpts : optsArg ?? {};
  return {
    cmd: isObj ? cmdOrOpts.cmd : cmdOrOpts,
    opts
  };
}
function resolveStdio(options) {
  if (options.stdio)
    return options.stdio;
  return [options.stdin ?? "ignore", options.stdout ?? "pipe", options.stderr ?? "inherit"];
}
function createNodeSpawnOptions(options, platform = process.platform) {
  const nodeOptions = {
    stdio: resolveStdio(options),
    shell: false
  };
  if (options.cwd !== undefined)
    nodeOptions.cwd = options.cwd;
  if (options.env !== undefined)
    nodeOptions.env = options.env;
  if (options.detached !== undefined)
    nodeOptions.detached = options.detached;
  if (options.signal !== undefined)
    nodeOptions.signal = options.signal;
  if (platform === "win32") {
    nodeOptions.windowsHide = true;
  }
  return nodeOptions;
}
function wrapNodeProcess(proc) {
  let exitCode = null;
  const exited = new Promise((resolve, reject) => {
    proc.on("exit", (code) => {
      exitCode = code ?? 1;
      resolve(exitCode);
    });
    proc.on("error", (error) => {
      if (exitCode === null) {
        exitCode = 1;
        reject(error);
      }
    });
  });
  return {
    get exitCode() {
      return exitCode;
    },
    exited,
    stdout: toReadableStream(proc.stdout),
    stderr: toReadableStream(proc.stderr),
    stdin: proc.stdin ?? emptyWritableStream(),
    kill(signal) {
      if (proc.killed || exitCode !== null)
        return;
      try {
        proc.kill(signal);
      } catch (error) {
        if (!String(error).includes("kill"))
          throw error;
      }
    },
    pid: proc.pid,
    ref() {
      proc.ref();
    },
    unref() {
      proc.unref();
    }
  };
}
function spawn(cmdOrOpts, opts) {
  const { cmd, opts: options } = resolveCommand(cmdOrOpts, opts);
  const bun = getBunRuntime();
  if (bun)
    return bun.spawn(cmd, options);
  const [bin, ...args] = cmd;
  if (bin === undefined) {
    throw new Error("Cannot spawn an empty command");
  }
  const proc = nodeSpawn(bin, args, createNodeSpawnOptions(options));
  return wrapNodeProcess(proc);
}
var runtime3;
var init_bun_spawn_shim = __esm(() => {
  runtime3 = globalThis;
});

// src/shared/agent-display-names.ts
function stripInvisibleAgentCharacters(agentName) {
  return agentName.replace(INVISIBLE_AGENT_CHARACTERS_REGEX, "");
}
function stripAgentListSortPrefix(agentName) {
  return stripInvisibleAgentCharacters(agentName).replace(VISIBLE_AGENT_LIST_SORT_PREFIX_REGEX, "").replace(AGENT_WRAPPER_CHARS_REGEX, "");
}
function resolveKnownAgentConfigKey(agentName) {
  const lower = stripAgentListSortPrefix(agentName).trim().toLowerCase();
  const reversed = REVERSE_DISPLAY_NAMES[lower];
  if (reversed !== undefined)
    return reversed;
  const legacy = LEGACY_DISPLAY_NAMES[lower];
  if (legacy !== undefined)
    return legacy;
  if (AGENT_DISPLAY_NAMES[lower] !== undefined)
    return lower;
  return;
}
function getAgentConfigKey(agentName) {
  const lower = stripAgentListSortPrefix(agentName).trim().toLowerCase();
  return resolveKnownAgentConfigKey(agentName) ?? lower;
}
function normalizeAgentForPrompt(agentName) {
  if (typeof agentName !== "string") {
    return;
  }
  const trimmed = stripAgentListSortPrefix(agentName).trim();
  if (!trimmed) {
    return;
  }
  const configKey = resolveKnownAgentConfigKey(trimmed);
  if (configKey !== undefined) {
    return AGENT_DISPLAY_NAMES[configKey] ?? trimmed;
  }
  return trimmed;
}
var AGENT_DISPLAY_NAMES, INVISIBLE_AGENT_CHARACTERS_REGEX, VISIBLE_AGENT_LIST_SORT_PREFIX_REGEX, AGENT_WRAPPER_CHARS_REGEX, REVERSE_DISPLAY_NAMES, LEGACY_DISPLAY_NAMES;
var init_agent_display_names = __esm(() => {
  AGENT_DISPLAY_NAMES = {
    sisyphus: "Sisyphus - ultraworker",
    hephaestus: "Hephaestus - Deep Agent",
    prometheus: "Prometheus - Plan Builder",
    atlas: "Atlas - Plan Executor",
    "sisyphus-junior": "Sisyphus-Junior",
    metis: "Metis - Plan Consultant",
    momus: "Momus - Plan Critic",
    athena: "Athena - Council",
    "athena-junior": "Athena-Junior - Council",
    oracle: "oracle",
    librarian: "librarian",
    explore: "explore",
    "multimodal-looker": "multimodal-looker",
    "council-member": "council-member"
  };
  INVISIBLE_AGENT_CHARACTERS_REGEX = /[\u200B\u200C\u200D\uFEFF]/g;
  VISIBLE_AGENT_LIST_SORT_PREFIX_REGEX = /^\d+\|/;
  AGENT_WRAPPER_CHARS_REGEX = /^[\\/"']+|[\\/"']+$/g;
  REVERSE_DISPLAY_NAMES = Object.fromEntries(Object.entries(AGENT_DISPLAY_NAMES).map(([key, displayName]) => [displayName.toLowerCase(), key]));
  LEGACY_DISPLAY_NAMES = {
    "sisyphus (ultraworker)": "sisyphus",
    "hephaestus (deep agent)": "hephaestus",
    "prometheus (plan builder)": "prometheus",
    "atlas (plan executor)": "atlas",
    "metis (plan consultant)": "metis",
    "momus (plan critic)": "momus",
    "athena (council)": "athena",
    "athena-junior (council)": "athena-junior"
  };
});
// src/shared/tmux/runner.ts
var init_runner = __esm(() => {
  init_bun_spawn_shim();
});
// src/shared/bun-which-shim.ts
import { accessSync as accessSync2, constants as constants2 } from "fs";
import { delimiter, join as join10 } from "path";
function isUnsafeCommandName(commandName) {
  if (commandName.includes("/") || commandName.includes("\\"))
    return true;
  if (commandName === "." || commandName === ".." || commandName.includes(".."))
    return true;
  if (/^[a-zA-Z]:/.test(commandName))
    return true;
  if (commandName.includes("\x00"))
    return true;
  return false;
}
function isExecutable(filePath) {
  try {
    accessSync2(filePath, process.platform === "win32" ? constants2.F_OK : constants2.X_OK);
    return true;
  } catch (error) {
    if (!(error instanceof Error) && Object.prototype.toString.call(error) !== "[object Error]") {
      throw error;
    }
    return false;
  }
}
function resolvePathValue() {
  if (process.platform === "win32")
    return process.env.Path ?? process.env.PATH;
  return process.env.PATH;
}
function getWindowsCandidates(commandName) {
  if (process.platform !== "win32")
    return [commandName];
  if (/\.[^\\/]+$/.test(commandName))
    return [commandName];
  return [commandName, `${commandName}.exe`, `${commandName}.cmd`, `${commandName}.bat`, `${commandName}.com`];
}
function bunWhich(commandName) {
  if (!commandName)
    return null;
  if (isUnsafeCommandName(commandName))
    return null;
  const candidateNames = getWindowsCandidates(commandName);
  if (IS_BUN2) {
    for (const candidateName of candidateNames) {
      const resolvedPath = runtime4.Bun?.which(candidateName) ?? null;
      if (resolvedPath !== null)
        return resolvedPath;
    }
  }
  const pathValue = resolvePathValue();
  if (!pathValue)
    return null;
  const pathEntries = pathValue.split(delimiter).filter((pathEntry) => pathEntry.length > 0);
  if (pathEntries.length === 0)
    return null;
  for (const pathEntry of pathEntries) {
    for (const candidateName of candidateNames) {
      const candidatePath = join10(pathEntry, candidateName);
      if (isExecutable(candidatePath))
        return candidatePath;
    }
  }
  return null;
}
var runtime4, IS_BUN2;
var init_bun_which_shim = __esm(() => {
  runtime4 = globalThis;
  IS_BUN2 = typeof runtime4.Bun !== "undefined";
});

// src/tools/interactive-bash/tmux-path-resolver.ts
var init_tmux_path_resolver = __esm(() => {
  init_bun_spawn_shim();
  init_bun_which_shim();
});
// packages/hashline-core/src/constants.ts
var NIBBLE_STR = "ZPMQVRWSNKTXJBYH";
var HASHLINE_DICT = Array.from({ length: 256 }, (_, i) => {
  const high = i >>> 4;
  const low = i & 15;
  return `${NIBBLE_STR[high]}${NIBBLE_STR[low]}`;
});
var HASHLINE_REF_PATTERN = /^([0-9]+)#([ZPMQVRWSNKTXJBYH]{2})$/;
// packages/hashline-core/src/xxhash32.ts
var runtime = globalThis;
var encoder = new TextEncoder;
var PRIME32_1 = 2654435761;
var PRIME32_2 = 2246822519;
var PRIME32_3 = 3266489917;
var PRIME32_4 = 668265263;
var PRIME32_5 = 374761393;
function rotateLeft32(value, bits) {
  return (value << bits | value >>> 32 - bits) >>> 0;
}
function readUint32LittleEndian(input, offset) {
  return ((input[offset] ?? 0) | (input[offset + 1] ?? 0) << 8 | (input[offset + 2] ?? 0) << 16 | (input[offset + 3] ?? 0) << 24) >>> 0;
}
function round32(accumulator, value) {
  const added = accumulator + Math.imul(value, PRIME32_2) >>> 0;
  return Math.imul(rotateLeft32(added, 13), PRIME32_1) >>> 0;
}
function xxHash32Js(input, seed) {
  let offset = 0;
  const length = input.length;
  let hash;
  if (length >= 16) {
    const limit = length - 16;
    let value1 = seed + PRIME32_1 + PRIME32_2 >>> 0;
    let value2 = seed + PRIME32_2 >>> 0;
    let value3 = seed >>> 0;
    let value4 = seed - PRIME32_1 >>> 0;
    while (offset <= limit) {
      value1 = round32(value1, readUint32LittleEndian(input, offset));
      offset += 4;
      value2 = round32(value2, readUint32LittleEndian(input, offset));
      offset += 4;
      value3 = round32(value3, readUint32LittleEndian(input, offset));
      offset += 4;
      value4 = round32(value4, readUint32LittleEndian(input, offset));
      offset += 4;
    }
    hash = rotateLeft32(value1, 1) + rotateLeft32(value2, 7) >>> 0;
    hash = hash + rotateLeft32(value3, 12) >>> 0;
    hash = hash + rotateLeft32(value4, 18) >>> 0;
  } else {
    hash = seed + PRIME32_5 >>> 0;
  }
  hash = hash + length >>> 0;
  while (offset + 4 <= length) {
    hash = hash + Math.imul(readUint32LittleEndian(input, offset), PRIME32_3) >>> 0;
    hash = Math.imul(rotateLeft32(hash, 17), PRIME32_4) >>> 0;
    offset += 4;
  }
  while (offset < length) {
    hash = hash + Math.imul(input[offset] ?? 0, PRIME32_5) >>> 0;
    hash = Math.imul(rotateLeft32(hash, 11), PRIME32_1) >>> 0;
    offset += 1;
  }
  hash = (hash ^ hash >>> 15) >>> 0;
  hash = Math.imul(hash, PRIME32_2) >>> 0;
  hash = (hash ^ hash >>> 13) >>> 0;
  hash = Math.imul(hash, PRIME32_3) >>> 0;
  return (hash ^ hash >>> 16) >>> 0;
}
function hashXxh32(input, seed) {
  const bun = runtime.Bun;
  if (bun !== undefined) {
    return bun.hash.xxHash32(input, seed);
  }
  return xxHash32Js(encoder.encode(input), seed >>> 0);
}

// packages/hashline-core/src/hash-computation.ts
var RE_SIGNIFICANT = /[\p{L}\p{N}]/u;
function computeNormalizedLineHash(lineNumber, normalizedContent) {
  const stripped = normalizedContent;
  const seed = RE_SIGNIFICANT.test(stripped) ? 0 : lineNumber;
  const hash = hashXxh32(stripped, seed);
  const index = hash % 256;
  return HASHLINE_DICT[index];
}
function computeLineHash(lineNumber, content) {
  return computeNormalizedLineHash(lineNumber, content.replace(/\r/g, "").trimEnd());
}
function computeLegacyLineHash(lineNumber, content) {
  return computeNormalizedLineHash(lineNumber, content.replace(/\r/g, "").replace(/\s+/g, ""));
}
// packages/hashline-core/src/validation.ts
var MISMATCH_CONTEXT = 2;
var LINE_REF_EXTRACT_PATTERN = /([0-9]+#[ZPMQVRWSNKTXJBYH]{2})/;
function isCompatibleLineHash(line, content, hash) {
  return computeLineHash(line, content) === hash || computeLegacyLineHash(line, content) === hash;
}
function normalizeLineRef(ref) {
  const originalTrimmed = ref.trim();
  let trimmed = originalTrimmed;
  trimmed = trimmed.replace(/^(?:>>>|[+-])\s*/, "");
  trimmed = trimmed.replace(/\s*#\s*/, "#");
  trimmed = trimmed.replace(/\|.*$/, "");
  trimmed = trimmed.trim();
  if (HASHLINE_REF_PATTERN.test(trimmed)) {
    return trimmed;
  }
  const extracted = trimmed.match(LINE_REF_EXTRACT_PATTERN);
  if (extracted) {
    return extracted[1];
  }
  return originalTrimmed;
}
function parseLineRef(ref) {
  const normalized = normalizeLineRef(ref);
  const match = normalized.match(HASHLINE_REF_PATTERN);
  if (match) {
    return {
      line: Number.parseInt(match[1], 10),
      hash: match[2]
    };
  }
  const hashIdx = normalized.indexOf("#");
  if (hashIdx > 0) {
    const prefix = normalized.slice(0, hashIdx);
    const suffix = normalized.slice(hashIdx + 1);
    if (!/^\d+$/.test(prefix) && /^[ZPMQVRWSNKTXJBYH]{2}$/.test(suffix)) {
      throw new Error(`Invalid line reference: "${ref}". "${prefix}" is not a line number. ` + `Use the actual line number from the read output.`);
    }
  }
  throw new Error(`Invalid line reference format: "${ref}". Expected format: "{line_number}#{hash_id}"`);
}
function validateLineRef(lines, ref) {
  const { line, hash } = parseLineRefWithHint(ref, lines);
  if (line < 1 || line > lines.length) {
    throw new Error(`Line number ${line} out of bounds. File has ${lines.length} lines.`);
  }
  const content = lines[line - 1];
  if (!isCompatibleLineHash(line, content, hash)) {
    throw new HashlineMismatchError([{ line, expected: hash }], lines);
  }
}

class HashlineMismatchError extends Error {
  mismatches;
  fileLines;
  remaps;
  constructor(mismatches, fileLines) {
    super(HashlineMismatchError.formatMessage(mismatches, fileLines));
    this.mismatches = mismatches;
    this.fileLines = fileLines;
    this.name = "HashlineMismatchError";
    const remaps = new Map;
    for (const mismatch of mismatches) {
      const actual = computeLineHash(mismatch.line, fileLines[mismatch.line - 1] ?? "");
      remaps.set(`${mismatch.line}#${mismatch.expected}`, `${mismatch.line}#${actual}`);
    }
    this.remaps = remaps;
  }
  static formatMessage(mismatches, fileLines) {
    const mismatchByLine = new Map;
    for (const mismatch of mismatches)
      mismatchByLine.set(mismatch.line, mismatch);
    const displayLines = new Set;
    for (const mismatch of mismatches) {
      const low = Math.max(1, mismatch.line - MISMATCH_CONTEXT);
      const high = Math.min(fileLines.length, mismatch.line + MISMATCH_CONTEXT);
      for (let line = low;line <= high; line++)
        displayLines.add(line);
    }
    const sortedLines = [...displayLines].sort((a, b) => a - b);
    const output = [];
    output.push(`${mismatches.length} line${mismatches.length > 1 ? "s have" : " has"} changed since last read. ` + "Use updated {line_number}#{hash_id} references below (>>> marks changed lines).");
    output.push("");
    let previousLine = -1;
    for (const line of sortedLines) {
      if (previousLine !== -1 && line > previousLine + 1) {
        output.push("    ...");
      }
      previousLine = line;
      const content = fileLines[line - 1] ?? "";
      const hash = computeLineHash(line, content);
      const prefix = `${line}#${hash}|${content}`;
      if (mismatchByLine.has(line)) {
        output.push(`>>> ${prefix}`);
      } else {
        output.push(`    ${prefix}`);
      }
    }
    return output.join(`
`);
  }
}
function suggestLineForHash(ref, lines) {
  const hashMatch = ref.trim().match(/#([ZPMQVRWSNKTXJBYH]{2})$/);
  if (!hashMatch)
    return null;
  const hash = hashMatch[1];
  for (let i = 0;i < lines.length; i++) {
    if (isCompatibleLineHash(i + 1, lines[i], hash)) {
      return `Did you mean "${i + 1}#${computeLineHash(i + 1, lines[i])}"?`;
    }
  }
  return null;
}
function parseLineRefWithHint(ref, lines) {
  try {
    return parseLineRef(ref);
  } catch (parseError) {
    const hint = suggestLineForHash(ref, lines);
    if (hint && parseError instanceof Error) {
      throw new Error(`${parseError.message} ${hint}`);
    }
    throw parseError;
  }
}
function validateLineRefs(lines, refs) {
  const mismatches = [];
  for (const ref of refs) {
    const { line, hash } = parseLineRefWithHint(ref, lines);
    if (line < 1 || line > lines.length) {
      throw new Error(`Line number ${line} out of bounds (file has ${lines.length} lines)`);
    }
    const content = lines[line - 1];
    if (!isCompatibleLineHash(line, content, hash)) {
      mismatches.push({ line, expected: hash });
    }
  }
  if (mismatches.length > 0) {
    throw new HashlineMismatchError(mismatches, lines);
  }
}
// packages/hashline-core/src/edit-text-normalization.ts
var HASHLINE_PREFIX_RE = /^\s*(?:>>>|>>)?\s*\d+\s*#\s*[ZPMQVRWSNKTXJBYH]{2}\|/;
var DIFF_PLUS_RE = /^[+](?![+])/;
function equalsIgnoringWhitespace(a, b) {
  if (a === b)
    return true;
  return a.replace(/\s+/g, "") === b.replace(/\s+/g, "");
}
function leadingWhitespace(text) {
  if (!text)
    return "";
  const match = text.match(/^\s*/);
  return match ? match[0] : "";
}
function stripLinePrefixes(lines) {
  let hashPrefixCount = 0;
  let diffPlusCount = 0;
  let nonEmpty = 0;
  for (const line of lines) {
    if (line.length === 0)
      continue;
    nonEmpty += 1;
    if (HASHLINE_PREFIX_RE.test(line))
      hashPrefixCount += 1;
    if (DIFF_PLUS_RE.test(line))
      diffPlusCount += 1;
  }
  if (nonEmpty === 0) {
    return lines;
  }
  const stripHash = hashPrefixCount > 0 && hashPrefixCount >= nonEmpty * 0.5;
  const stripPlus = !stripHash && diffPlusCount > 0 && diffPlusCount >= nonEmpty * 0.5;
  if (!stripHash && !stripPlus) {
    return lines;
  }
  return lines.map((line) => {
    if (stripHash)
      return line.replace(HASHLINE_PREFIX_RE, "");
    if (stripPlus)
      return line.replace(DIFF_PLUS_RE, "");
    return line;
  });
}
function toNewLines(input) {
  if (Array.isArray(input)) {
    return stripLinePrefixes(input);
  }
  return stripLinePrefixes(input.split(`
`));
}
function restoreLeadingIndent(templateLine, line) {
  if (line.length === 0)
    return line;
  const templateIndent = leadingWhitespace(templateLine);
  if (templateIndent.length === 0)
    return line;
  if (leadingWhitespace(line).length > 0)
    return line;
  if (templateLine.trim() === line.trim())
    return line;
  return `${templateIndent}${line}`;
}
function stripInsertAnchorEcho(anchorLine, newLines) {
  if (newLines.length === 0)
    return newLines;
  if (equalsIgnoringWhitespace(newLines[0], anchorLine)) {
    return newLines.slice(1);
  }
  return newLines;
}
function stripInsertBeforeEcho(anchorLine, newLines) {
  if (newLines.length <= 1)
    return newLines;
  if (equalsIgnoringWhitespace(newLines[newLines.length - 1], anchorLine)) {
    return newLines.slice(0, -1);
  }
  return newLines;
}
function stripRangeBoundaryEcho(lines, startLine, endLine, newLines) {
  const replacedCount = endLine - startLine + 1;
  if (newLines.length <= 1 || newLines.length <= replacedCount) {
    return newLines;
  }
  let out = newLines;
  const beforeIdx = startLine - 2;
  if (beforeIdx >= 0 && out[0] === lines[beforeIdx]) {
    out = out.slice(1);
  }
  const afterIdx = endLine;
  if (afterIdx < lines.length && out.length > 0 && out[out.length - 1] === lines[afterIdx]) {
    out = out.slice(0, -1);
  }
  return out;
}

// packages/hashline-core/src/edit-deduplication.ts
function normalizeEditPayload(payload) {
  return toNewLines(payload).join(`
`);
}
function canonicalAnchor(anchor) {
  if (!anchor)
    return "";
  return normalizeLineRef(anchor);
}
function buildDedupeKey(edit) {
  switch (edit.op) {
    case "replace":
      return `replace|${canonicalAnchor(edit.pos)}|${edit.end ? canonicalAnchor(edit.end) : ""}|${normalizeEditPayload(edit.lines)}`;
    case "append":
      return `append|${canonicalAnchor(edit.pos)}|${normalizeEditPayload(edit.lines)}`;
    case "prepend":
      return `prepend|${canonicalAnchor(edit.pos)}|${normalizeEditPayload(edit.lines)}`;
    default:
      return JSON.stringify(edit);
  }
}
function dedupeEdits(edits) {
  const seen = new Set;
  const deduped = [];
  let deduplicatedEdits = 0;
  for (const edit of edits) {
    const key = buildDedupeKey(edit);
    if (seen.has(key)) {
      deduplicatedEdits += 1;
      continue;
    }
    seen.add(key);
    deduped.push(edit);
  }
  return { edits: deduped, deduplicatedEdits };
}

// packages/hashline-core/src/edit-ordering.ts
function getEditLineNumber(edit) {
  switch (edit.op) {
    case "replace":
      return parseLineRef(edit.end ?? edit.pos).line;
    case "append":
      return edit.pos ? parseLineRef(edit.pos).line : Number.NEGATIVE_INFINITY;
    case "prepend":
      return edit.pos ? parseLineRef(edit.pos).line : Number.NEGATIVE_INFINITY;
    default:
      return Number.POSITIVE_INFINITY;
  }
}
function collectLineRefs(edits) {
  return edits.flatMap((edit) => {
    switch (edit.op) {
      case "replace":
        return edit.end ? [edit.pos, edit.end] : [edit.pos];
      case "append":
      case "prepend":
        return edit.pos ? [edit.pos] : [];
      default:
        return [];
    }
  });
}
function detectOverlappingRanges(edits) {
  const ranges = [];
  for (let i = 0;i < edits.length; i++) {
    const edit = edits[i];
    if (edit.op !== "replace" || !edit.end)
      continue;
    const start = parseLineRef(edit.pos).line;
    const end = parseLineRef(edit.end).line;
    ranges.push({ start, end, idx: i });
  }
  if (ranges.length < 2)
    return null;
  ranges.sort((a, b) => a.start - b.start || a.end - b.end);
  for (let i = 1;i < ranges.length; i++) {
    const prev = ranges[i - 1];
    const curr = ranges[i];
    if (curr.start <= prev.end) {
      return `Overlapping range edits detected: ` + `edit ${prev.idx + 1} (lines ${prev.start}-${prev.end}) overlaps with ` + `edit ${curr.idx + 1} (lines ${curr.start}-${curr.end}). ` + `Use pos-only replace for single-line edits.`;
    }
  }
  return null;
}

// packages/hashline-core/src/autocorrect-replacement-lines.ts
function normalizeTokens(text) {
  return text.replace(/\s+/g, "");
}
function stripAllWhitespace(text) {
  return normalizeTokens(text);
}
function stripTrailingContinuationTokens(text) {
  return text.replace(/(?:&&|\|\||\?\?|\?|:|=|,|\+|-|\*|\/|\.|\()\s*$/u, "");
}
function stripMergeOperatorChars(text) {
  return text.replace(/[|&?]/g, "");
}
function leadingWhitespace2(text) {
  if (!text)
    return "";
  const match = text.match(/^\s*/);
  return match ? match[0] : "";
}
function restoreOldWrappedLines(originalLines, replacementLines) {
  if (originalLines.length === 0 || replacementLines.length < 2)
    return replacementLines;
  const canonicalToOriginal = new Map;
  for (const line of originalLines) {
    const canonical = stripAllWhitespace(line);
    const existing = canonicalToOriginal.get(canonical);
    if (existing) {
      existing.count += 1;
    } else {
      canonicalToOriginal.set(canonical, { line, count: 1 });
    }
  }
  const candidates = [];
  for (let start = 0;start < replacementLines.length; start += 1) {
    for (let len = 2;len <= 10 && start + len <= replacementLines.length; len += 1) {
      const span = replacementLines.slice(start, start + len);
      if (span.some((line) => line.trim().length === 0))
        continue;
      const canonicalSpan = stripAllWhitespace(span.join(""));
      const original = canonicalToOriginal.get(canonicalSpan);
      if (original && original.count === 1 && canonicalSpan.length >= 6) {
        candidates.push({ start, len, replacement: original.line, canonical: canonicalSpan });
      }
    }
  }
  if (candidates.length === 0)
    return replacementLines;
  const canonicalCounts = new Map;
  for (const candidate of candidates) {
    canonicalCounts.set(candidate.canonical, (canonicalCounts.get(candidate.canonical) ?? 0) + 1);
  }
  const uniqueCandidates = candidates.filter((candidate) => (canonicalCounts.get(candidate.canonical) ?? 0) === 1);
  if (uniqueCandidates.length === 0)
    return replacementLines;
  uniqueCandidates.sort((a, b) => b.start - a.start);
  const correctedLines = [...replacementLines];
  for (const candidate of uniqueCandidates) {
    correctedLines.splice(candidate.start, candidate.len, candidate.replacement);
  }
  return correctedLines;
}
function maybeExpandSingleLineMerge(originalLines, replacementLines) {
  if (replacementLines.length !== 1 || originalLines.length <= 1) {
    return replacementLines;
  }
  const merged = replacementLines[0];
  const parts = originalLines.map((line) => line.trim()).filter((line) => line.length > 0);
  if (parts.length !== originalLines.length)
    return replacementLines;
  const indices = [];
  let offset = 0;
  let orderedMatch = true;
  for (const part of parts) {
    let idx = merged.indexOf(part, offset);
    let matchedLen = part.length;
    if (idx === -1) {
      const stripped = stripTrailingContinuationTokens(part);
      if (stripped !== part) {
        idx = merged.indexOf(stripped, offset);
        if (idx !== -1)
          matchedLen = stripped.length;
      }
    }
    if (idx === -1) {
      const segment = merged.slice(offset);
      const segmentStripped = stripMergeOperatorChars(segment);
      const partStripped = stripMergeOperatorChars(part);
      const fuzzyIdx = segmentStripped.indexOf(partStripped);
      if (fuzzyIdx !== -1) {
        let strippedPos = 0;
        let originalPos = 0;
        while (strippedPos < fuzzyIdx && originalPos < segment.length) {
          if (!/[|&?]/.test(segment[originalPos]))
            strippedPos += 1;
          originalPos += 1;
        }
        idx = offset + originalPos;
        matchedLen = part.length;
      }
    }
    if (idx === -1) {
      orderedMatch = false;
      break;
    }
    indices.push(idx);
    offset = idx + matchedLen;
  }
  const expanded = [];
  if (orderedMatch) {
    for (let i = 0;i < indices.length; i += 1) {
      const start = indices[i];
      const end = i + 1 < indices.length ? indices[i + 1] : merged.length;
      const candidate = merged.slice(start, end).trim();
      if (candidate.length === 0) {
        orderedMatch = false;
        break;
      }
      expanded.push(candidate);
    }
  }
  if (orderedMatch && expanded.length === originalLines.length) {
    return expanded;
  }
  const semicolonSplit = merged.split(/;\s+/).map((line, idx, arr) => {
    if (idx < arr.length - 1 && !line.endsWith(";")) {
      return `${line};`;
    }
    return line;
  }).map((line) => line.trim()).filter((line) => line.length > 0);
  if (semicolonSplit.length === originalLines.length) {
    return semicolonSplit;
  }
  return replacementLines;
}
function restoreIndentForPairedReplacement(originalLines, replacementLines) {
  if (originalLines.length !== replacementLines.length) {
    return replacementLines;
  }
  return replacementLines.map((line, idx) => {
    if (line.length === 0)
      return line;
    if (leadingWhitespace2(line).length > 0)
      return line;
    const indent = leadingWhitespace2(originalLines[idx]);
    if (indent.length === 0)
      return line;
    if (originalLines[idx].trim() === line.trim())
      return line;
    return `${indent}${line}`;
  });
}
function autocorrectReplacementLines(originalLines, replacementLines) {
  let next = replacementLines;
  next = maybeExpandSingleLineMerge(originalLines, next);
  next = restoreOldWrappedLines(originalLines, next);
  next = restoreIndentForPairedReplacement(originalLines, next);
  return next;
}

// packages/hashline-core/src/edit-operation-primitives.ts
function shouldValidate(options) {
  return options?.skipValidation !== true;
}
function applySetLine(lines, anchor, newText, options) {
  if (shouldValidate(options))
    validateLineRef(lines, anchor);
  const { line } = parseLineRef(anchor);
  const result = [...lines];
  const originalLine = lines[line - 1] ?? "";
  const corrected = autocorrectReplacementLines([originalLine], toNewLines(newText));
  const replacement = corrected.map((entry, idx) => {
    if (idx !== 0)
      return entry;
    return restoreLeadingIndent(originalLine, entry);
  });
  result.splice(line - 1, 1, ...replacement);
  return result;
}
function applyReplaceLines(lines, startAnchor, endAnchor, newText, options) {
  if (shouldValidate(options)) {
    validateLineRef(lines, startAnchor);
    validateLineRef(lines, endAnchor);
  }
  const { line: startLine } = parseLineRef(startAnchor);
  const { line: endLine } = parseLineRef(endAnchor);
  if (startLine > endLine) {
    throw new Error(`Invalid range: start line ${startLine} cannot be greater than end line ${endLine}`);
  }
  const result = [...lines];
  const originalRange = lines.slice(startLine - 1, endLine);
  const stripped = stripRangeBoundaryEcho(lines, startLine, endLine, toNewLines(newText));
  const corrected = autocorrectReplacementLines(originalRange, stripped);
  const restored = corrected.map((entry, idx) => {
    if (idx !== 0)
      return entry;
    return restoreLeadingIndent(lines[startLine - 1] ?? "", entry);
  });
  result.splice(startLine - 1, endLine - startLine + 1, ...restored);
  return result;
}
function applyInsertAfter(lines, anchor, text, options) {
  if (shouldValidate(options))
    validateLineRef(lines, anchor);
  const { line } = parseLineRef(anchor);
  const result = [...lines];
  const newLines = stripInsertAnchorEcho(lines[line - 1], toNewLines(text));
  if (newLines.length === 0) {
    throw new Error(`append (anchored) requires non-empty text for ${anchor}`);
  }
  result.splice(line, 0, ...newLines);
  return result;
}
function applyInsertBefore(lines, anchor, text, options) {
  if (shouldValidate(options))
    validateLineRef(lines, anchor);
  const { line } = parseLineRef(anchor);
  const result = [...lines];
  const newLines = stripInsertBeforeEcho(lines[line - 1], toNewLines(text));
  if (newLines.length === 0) {
    throw new Error(`prepend (anchored) requires non-empty text for ${anchor}`);
  }
  result.splice(line - 1, 0, ...newLines);
  return result;
}
function applyAppend(lines, text) {
  const normalized = toNewLines(text);
  if (normalized.length === 0) {
    throw new Error("append requires non-empty text");
  }
  if (lines.length === 1 && lines[0] === "") {
    return [...normalized];
  }
  return [...lines, ...normalized];
}
function applyPrepend(lines, text) {
  const normalized = toNewLines(text);
  if (normalized.length === 0) {
    throw new Error("prepend requires non-empty text");
  }
  if (lines.length === 1 && lines[0] === "") {
    return [...normalized];
  }
  return [...normalized, ...lines];
}

// packages/hashline-core/src/edit-operations.ts
function arraysEqual(a, b) {
  if (a.length !== b.length)
    return false;
  for (let i = 0;i < a.length; i++) {
    if (a[i] !== b[i])
      return false;
  }
  return true;
}
function applyHashlineEditsWithReport(content, edits) {
  if (edits.length === 0) {
    return {
      content,
      noopEdits: 0,
      deduplicatedEdits: 0
    };
  }
  const dedupeResult = dedupeEdits(edits);
  const EDIT_PRECEDENCE = { replace: 0, append: 1, prepend: 2 };
  const sortedEdits = [...dedupeResult.edits].sort((a, b) => {
    const lineA = getEditLineNumber(a);
    const lineB = getEditLineNumber(b);
    if (lineB !== lineA)
      return lineB - lineA;
    return (EDIT_PRECEDENCE[a.op] ?? 3) - (EDIT_PRECEDENCE[b.op] ?? 3);
  });
  let noopEdits = 0;
  let lines = content.length === 0 ? [] : content.split(`
`);
  const refs = collectLineRefs(sortedEdits);
  validateLineRefs(lines, refs);
  const overlapError = detectOverlappingRanges(sortedEdits);
  if (overlapError)
    throw new Error(overlapError);
  for (const edit of sortedEdits) {
    switch (edit.op) {
      case "replace": {
        const next = edit.end ? applyReplaceLines(lines, edit.pos, edit.end, edit.lines, { skipValidation: true }) : applySetLine(lines, edit.pos, edit.lines, { skipValidation: true });
        if (arraysEqual(next, lines)) {
          noopEdits += 1;
          break;
        }
        lines = next;
        break;
      }
      case "append": {
        const next = edit.pos ? applyInsertAfter(lines, edit.pos, edit.lines, { skipValidation: true }) : applyAppend(lines, edit.lines);
        if (arraysEqual(next, lines)) {
          noopEdits += 1;
          break;
        }
        lines = next;
        break;
      }
      case "prepend": {
        const next = edit.pos ? applyInsertBefore(lines, edit.pos, edit.lines, { skipValidation: true }) : applyPrepend(lines, edit.lines);
        if (arraysEqual(next, lines)) {
          noopEdits += 1;
          break;
        }
        lines = next;
        break;
      }
    }
  }
  return {
    content: lines.join(`
`),
    noopEdits,
    deduplicatedEdits: dedupeResult.deduplicatedEdits
  };
}
// packages/hashline-core/src/file-text-canonicalization.ts
function detectLineEnding(content) {
  const crlfIndex = content.indexOf(`\r
`);
  const lfIndex = content.indexOf(`
`);
  if (lfIndex === -1)
    return `
`;
  if (crlfIndex === -1)
    return `
`;
  return crlfIndex < lfIndex ? `\r
` : `
`;
}
function stripBom(content) {
  if (!content.startsWith("\uFEFF")) {
    return { content, hadBom: false };
  }
  return { content: content.slice(1), hadBom: true };
}
function normalizeToLf(content) {
  return content.replace(/\r\n/g, `
`).replace(/\r/g, `
`);
}
function restoreLineEndings(content, lineEnding) {
  if (lineEnding === `
`)
    return content;
  return content.replace(/\n/g, `\r
`);
}
function canonicalizeFileText(content) {
  const stripped = stripBom(content);
  return {
    content: normalizeToLf(stripped.content),
    hadBom: stripped.hadBom,
    lineEnding: detectLineEnding(stripped.content)
  };
}
function restoreFileText(content, envelope) {
  const withLineEnding = restoreLineEndings(content, envelope.lineEnding);
  if (!envelope.hadBom)
    return withLineEnding;
  return `\uFEFF${withLineEnding}`;
}
// packages/hashline-core/src/normalize-edits.ts
function normalizeAnchor(value) {
  if (typeof value !== "string")
    return;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}
function requireLines(edit, index) {
  if (edit.lines === undefined) {
    throw new Error(`Edit ${index}: lines is required for ${edit.op ?? "unknown"}`);
  }
  if (edit.lines === null) {
    return [];
  }
  return edit.lines;
}
function requireLine(anchor, index, op) {
  if (!anchor) {
    throw new Error(`Edit ${index}: ${op} requires at least one anchor line reference (pos or end)`);
  }
  return anchor;
}
function normalizeReplaceEdit(edit, index) {
  const pos = normalizeAnchor(edit.pos);
  const end = normalizeAnchor(edit.end);
  const anchor = requireLine(pos ?? end, index, "replace");
  const lines = requireLines(edit, index);
  const normalized = {
    op: "replace",
    pos: anchor,
    lines
  };
  if (end)
    normalized.end = end;
  return normalized;
}
function normalizeAppendEdit(edit, index) {
  const pos = normalizeAnchor(edit.pos);
  const end = normalizeAnchor(edit.end);
  const anchor = pos ?? end;
  const lines = requireLines(edit, index);
  const normalized = {
    op: "append",
    lines
  };
  if (anchor)
    normalized.pos = anchor;
  return normalized;
}
function normalizePrependEdit(edit, index) {
  const pos = normalizeAnchor(edit.pos);
  const end = normalizeAnchor(edit.end);
  const anchor = pos ?? end;
  const lines = requireLines(edit, index);
  const normalized = {
    op: "prepend",
    lines
  };
  if (anchor)
    normalized.pos = anchor;
  return normalized;
}
function normalizeHashlineEdits(rawEdits) {
  return rawEdits.map((rawEdit, index) => {
    const edit = rawEdit ?? {};
    switch (edit.op) {
      case "replace":
        return normalizeReplaceEdit(edit, index);
      case "append":
        return normalizeAppendEdit(edit, index);
      case "prepend":
        return normalizePrependEdit(edit, index);
      default:
        throw new Error(`Edit ${index}: unsupported op "${String(edit.op)}". Legacy format was removed; use op/pos/end/lines.`);
    }
  });
}
// node_modules/.bun/diff@9.0.0/node_modules/diff/libesm/diff/base.js
class Diff {
  diff(oldStr, newStr, options = {}) {
    let callback;
    if (typeof options === "function") {
      callback = options;
      options = {};
    } else if ("callback" in options) {
      callback = options.callback;
    }
    const oldString = this.castInput(oldStr, options);
    const newString = this.castInput(newStr, options);
    const oldTokens = this.removeEmpty(this.tokenize(oldString, options));
    const newTokens = this.removeEmpty(this.tokenize(newString, options));
    return this.diffWithOptionsObj(oldTokens, newTokens, options, callback);
  }
  diffWithOptionsObj(oldTokens, newTokens, options, callback) {
    var _a;
    const done = (value) => {
      value = this.postProcess(value, options);
      if (callback) {
        setTimeout(function() {
          callback(value);
        }, 0);
        return;
      } else {
        return value;
      }
    };
    const newLen = newTokens.length, oldLen = oldTokens.length;
    let editLength = 1;
    let maxEditLength = newLen + oldLen;
    if (options.maxEditLength != null) {
      maxEditLength = Math.min(maxEditLength, options.maxEditLength);
    }
    const maxExecutionTime = (_a = options.timeout) !== null && _a !== undefined ? _a : Infinity;
    const abortAfterTimestamp = Date.now() + maxExecutionTime;
    const bestPath = [{ oldPos: -1, lastComponent: undefined }];
    let newPos = this.extractCommon(bestPath[0], newTokens, oldTokens, 0, options);
    if (bestPath[0].oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
      return done(this.buildValues(bestPath[0].lastComponent, newTokens, oldTokens));
    }
    let minDiagonalToConsider = -Infinity, maxDiagonalToConsider = Infinity;
    const execEditLength = () => {
      for (let diagonalPath = Math.max(minDiagonalToConsider, -editLength);diagonalPath <= Math.min(maxDiagonalToConsider, editLength); diagonalPath += 2) {
        let basePath;
        const removePath = bestPath[diagonalPath - 1], addPath = bestPath[diagonalPath + 1];
        if (removePath) {
          bestPath[diagonalPath - 1] = undefined;
        }
        let canAdd = false;
        if (addPath) {
          const addPathNewPos = addPath.oldPos - diagonalPath;
          canAdd = addPath && 0 <= addPathNewPos && addPathNewPos < newLen;
        }
        const canRemove = removePath && removePath.oldPos + 1 < oldLen;
        if (!canAdd && !canRemove) {
          bestPath[diagonalPath] = undefined;
          continue;
        }
        if (!canRemove || canAdd && removePath.oldPos < addPath.oldPos) {
          basePath = this.addToPath(addPath, true, false, 0, options);
        } else {
          basePath = this.addToPath(removePath, false, true, 1, options);
        }
        newPos = this.extractCommon(basePath, newTokens, oldTokens, diagonalPath, options);
        if (basePath.oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
          return done(this.buildValues(basePath.lastComponent, newTokens, oldTokens)) || true;
        } else {
          bestPath[diagonalPath] = basePath;
          if (basePath.oldPos + 1 >= oldLen) {
            maxDiagonalToConsider = Math.min(maxDiagonalToConsider, diagonalPath - 1);
          }
          if (newPos + 1 >= newLen) {
            minDiagonalToConsider = Math.max(minDiagonalToConsider, diagonalPath + 1);
          }
        }
      }
      editLength++;
    };
    if (callback) {
      (function exec() {
        setTimeout(function() {
          if (editLength > maxEditLength || Date.now() > abortAfterTimestamp) {
            return callback(undefined);
          }
          if (!execEditLength()) {
            exec();
          }
        }, 0);
      })();
    } else {
      while (editLength <= maxEditLength && Date.now() <= abortAfterTimestamp) {
        const ret = execEditLength();
        if (ret) {
          return ret;
        }
      }
    }
  }
  addToPath(path, added, removed, oldPosInc, options) {
    const last = path.lastComponent;
    if (last && !options.oneChangePerToken && last.added === added && last.removed === removed) {
      return {
        oldPos: path.oldPos + oldPosInc,
        lastComponent: { count: last.count + 1, added, removed, previousComponent: last.previousComponent }
      };
    } else {
      return {
        oldPos: path.oldPos + oldPosInc,
        lastComponent: { count: 1, added, removed, previousComponent: last }
      };
    }
  }
  extractCommon(basePath, newTokens, oldTokens, diagonalPath, options) {
    const newLen = newTokens.length, oldLen = oldTokens.length;
    let oldPos = basePath.oldPos, newPos = oldPos - diagonalPath, commonCount = 0;
    while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(oldTokens[oldPos + 1], newTokens[newPos + 1], options)) {
      newPos++;
      oldPos++;
      commonCount++;
      if (options.oneChangePerToken) {
        basePath.lastComponent = { count: 1, previousComponent: basePath.lastComponent, added: false, removed: false };
      }
    }
    if (commonCount && !options.oneChangePerToken) {
      basePath.lastComponent = { count: commonCount, previousComponent: basePath.lastComponent, added: false, removed: false };
    }
    basePath.oldPos = oldPos;
    return newPos;
  }
  equals(left, right, options) {
    if (options.comparator) {
      return options.comparator(left, right);
    } else {
      return left === right || !!options.ignoreCase && left.toLowerCase() === right.toLowerCase();
    }
  }
  removeEmpty(array) {
    const ret = [];
    for (let i = 0;i < array.length; i++) {
      if (array[i]) {
        ret.push(array[i]);
      }
    }
    return ret;
  }
  castInput(value, options) {
    return value;
  }
  tokenize(value, options) {
    return Array.from(value);
  }
  join(chars) {
    return chars.join("");
  }
  postProcess(changeObjects, options) {
    return changeObjects;
  }
  get useLongestToken() {
    return false;
  }
  buildValues(lastComponent, newTokens, oldTokens) {
    const components = [];
    let nextComponent;
    while (lastComponent) {
      components.push(lastComponent);
      nextComponent = lastComponent.previousComponent;
      delete lastComponent.previousComponent;
      lastComponent = nextComponent;
    }
    components.reverse();
    const componentLen = components.length;
    let componentPos = 0, newPos = 0, oldPos = 0;
    for (;componentPos < componentLen; componentPos++) {
      const component = components[componentPos];
      if (!component.removed) {
        if (!component.added && this.useLongestToken) {
          let value = newTokens.slice(newPos, newPos + component.count);
          value = value.map(function(value2, i) {
            const oldValue = oldTokens[oldPos + i];
            return oldValue.length > value2.length ? oldValue : value2;
          });
          component.value = this.join(value);
        } else {
          component.value = this.join(newTokens.slice(newPos, newPos + component.count));
        }
        newPos += component.count;
        if (!component.added) {
          oldPos += component.count;
        }
      } else {
        component.value = this.join(oldTokens.slice(oldPos, oldPos + component.count));
        oldPos += component.count;
      }
    }
    return components;
  }
}

// node_modules/.bun/diff@9.0.0/node_modules/diff/libesm/diff/line.js
class LineDiff extends Diff {
  constructor() {
    super(...arguments);
    this.tokenize = tokenize;
  }
  equals(left, right, options) {
    if (options.ignoreWhitespace) {
      if (!options.newlineIsToken || !left.includes(`
`)) {
        left = left.trim();
      }
      if (!options.newlineIsToken || !right.includes(`
`)) {
        right = right.trim();
      }
    } else if (options.ignoreNewlineAtEof && !options.newlineIsToken) {
      if (left.endsWith(`
`)) {
        left = left.slice(0, -1);
      }
      if (right.endsWith(`
`)) {
        right = right.slice(0, -1);
      }
    }
    return super.equals(left, right, options);
  }
}
var lineDiff = new LineDiff;
function diffLines(oldStr, newStr, options) {
  return lineDiff.diff(oldStr, newStr, options);
}
function tokenize(value, options) {
  if (options.stripTrailingCr) {
    value = value.replace(/\r\n/g, `
`);
  }
  const retLines = [], linesAndNewlines = value.split(/(\n|\r\n)/);
  if (!linesAndNewlines[linesAndNewlines.length - 1]) {
    linesAndNewlines.pop();
  }
  for (let i = 0;i < linesAndNewlines.length; i++) {
    const line = linesAndNewlines[i];
    if (i % 2 && !options.newlineIsToken) {
      retLines[retLines.length - 1] += line;
    } else {
      retLines.push(line);
    }
  }
  return retLines;
}

// node_modules/.bun/diff@9.0.0/node_modules/diff/libesm/patch/create.js
function needsQuoting(s) {
  for (let i = 0;i < s.length; i++) {
    if (s[i] < " " || s[i] > "~" || s[i] === '"' || s[i] === "\\") {
      return true;
    }
  }
  return false;
}
function quoteFileNameIfNeeded(s) {
  if (!needsQuoting(s)) {
    return s;
  }
  let result = '"';
  const bytes = new TextEncoder().encode(s);
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b === 7) {
      result += "\\a";
    } else if (b === 8) {
      result += "\\b";
    } else if (b === 9) {
      result += "\\t";
    } else if (b === 10) {
      result += "\\n";
    } else if (b === 11) {
      result += "\\v";
    } else if (b === 12) {
      result += "\\f";
    } else if (b === 13) {
      result += "\\r";
    } else if (b === 34) {
      result += "\\\"";
    } else if (b === 92) {
      result += "\\\\";
    } else if (b >= 32 && b <= 126) {
      result += String.fromCharCode(b);
    } else {
      result += "\\" + b.toString(8).padStart(3, "0");
    }
    i++;
  }
  result += '"';
  return result;
}
var INCLUDE_HEADERS = {
  includeIndex: true,
  includeUnderline: true,
  includeFileHeaders: true
};
function structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
  let optionsObj;
  if (!options) {
    optionsObj = {};
  } else if (typeof options === "function") {
    optionsObj = { callback: options };
  } else {
    optionsObj = options;
  }
  if (typeof optionsObj.context === "undefined") {
    optionsObj.context = 4;
  }
  const context = optionsObj.context;
  if (optionsObj.newlineIsToken) {
    throw new Error("newlineIsToken may not be used with patch-generation functions, only with diffing functions");
  }
  if (!optionsObj.callback) {
    return diffLinesResultToPatch(diffLines(oldStr, newStr, optionsObj));
  } else {
    const { callback } = optionsObj;
    diffLines(oldStr, newStr, Object.assign(Object.assign({}, optionsObj), { callback: (diff) => {
      const patch = diffLinesResultToPatch(diff);
      callback(patch);
    } }));
  }
  function diffLinesResultToPatch(diff) {
    if (!diff) {
      return;
    }
    diff.push({ value: "", lines: [] });
    function contextLines(lines) {
      return lines.map(function(entry) {
        return " " + entry;
      });
    }
    const hunks = [];
    let oldRangeStart = 0, newRangeStart = 0, curRange = [], oldLine = 1, newLine = 1;
    for (let i = 0;i < diff.length; i++) {
      const current = diff[i], lines = current.lines || splitLines(current.value);
      current.lines = lines;
      if (current.added || current.removed) {
        if (!oldRangeStart) {
          const prev = diff[i - 1];
          oldRangeStart = oldLine;
          newRangeStart = newLine;
          if (prev) {
            curRange = context > 0 ? contextLines(prev.lines.slice(-context)) : [];
            oldRangeStart -= curRange.length;
            newRangeStart -= curRange.length;
          }
        }
        for (const line of lines) {
          curRange.push((current.added ? "+" : "-") + line);
        }
        if (current.added) {
          newLine += lines.length;
        } else {
          oldLine += lines.length;
        }
      } else {
        if (oldRangeStart) {
          if (lines.length <= context * 2 && i < diff.length - 2) {
            for (const line of contextLines(lines)) {
              curRange.push(line);
            }
          } else {
            const contextSize = Math.min(lines.length, context);
            for (const line of contextLines(lines.slice(0, contextSize))) {
              curRange.push(line);
            }
            const hunk = {
              oldStart: oldRangeStart,
              oldLines: oldLine - oldRangeStart + contextSize,
              newStart: newRangeStart,
              newLines: newLine - newRangeStart + contextSize,
              lines: curRange
            };
            hunks.push(hunk);
            oldRangeStart = 0;
            newRangeStart = 0;
            curRange = [];
          }
        }
        oldLine += lines.length;
        newLine += lines.length;
      }
    }
    for (const hunk of hunks) {
      for (let i = 0;i < hunk.lines.length; i++) {
        if (hunk.lines[i].endsWith(`
`)) {
          hunk.lines[i] = hunk.lines[i].slice(0, -1);
        } else {
          hunk.lines.splice(i + 1, 0, "\\ No newline at end of file");
          i++;
        }
      }
    }
    return {
      oldFileName,
      newFileName,
      oldHeader,
      newHeader,
      hunks
    };
  }
}
function formatPatch(patch, headerOptions) {
  var _a, _b, _c, _d, _e, _f;
  if (!headerOptions) {
    headerOptions = INCLUDE_HEADERS;
  }
  if (Array.isArray(patch)) {
    if (patch.length > 1 && !headerOptions.includeFileHeaders && !patch.every((p) => p.isGit)) {
      throw new Error("Cannot omit file headers on a multi-file patch. " + "(The result would be unparseable; how would a tool trying to apply " + "the patch know which changes are to which file?)");
    }
    return patch.map((p) => formatPatch(p, headerOptions)).join(`
`);
  }
  const ret = [];
  if (patch.isGit) {
    headerOptions = INCLUDE_HEADERS;
    if (!patch.oldFileName) {
      throw new Error("oldFileName must be specified for Git patches");
    }
    if (!patch.newFileName) {
      throw new Error("newFileName must be specified for Git patches");
    }
    let gitOldName = patch.oldFileName;
    let gitNewName = patch.newFileName;
    if (patch.isCreate && gitOldName === "/dev/null") {
      gitOldName = gitNewName.replace(/^b\//, "a/");
    } else if (patch.isDelete && gitNewName === "/dev/null") {
      gitNewName = gitOldName.replace(/^a\//, "b/");
    }
    ret.push("diff --git " + quoteFileNameIfNeeded(gitOldName) + " " + quoteFileNameIfNeeded(gitNewName));
    if (patch.isDelete) {
      ret.push("deleted file mode " + ((_a = patch.oldMode) !== null && _a !== undefined ? _a : "100644"));
    }
    if (patch.isCreate) {
      ret.push("new file mode " + ((_b = patch.newMode) !== null && _b !== undefined ? _b : "100644"));
    }
    if (patch.oldMode && patch.newMode && !patch.isDelete && !patch.isCreate) {
      ret.push("old mode " + patch.oldMode);
      ret.push("new mode " + patch.newMode);
    }
    if (patch.isRename) {
      ret.push("rename from " + quoteFileNameIfNeeded(((_c = patch.oldFileName) !== null && _c !== undefined ? _c : "").replace(/^a\//, "")));
      ret.push("rename to " + quoteFileNameIfNeeded(((_d = patch.newFileName) !== null && _d !== undefined ? _d : "").replace(/^b\//, "")));
    }
    if (patch.isCopy) {
      ret.push("copy from " + quoteFileNameIfNeeded(((_e = patch.oldFileName) !== null && _e !== undefined ? _e : "").replace(/^a\//, "")));
      ret.push("copy to " + quoteFileNameIfNeeded(((_f = patch.newFileName) !== null && _f !== undefined ? _f : "").replace(/^b\//, "")));
    }
  } else {
    if (headerOptions.includeIndex && patch.oldFileName == patch.newFileName && patch.oldFileName !== undefined) {
      ret.push("Index: " + patch.oldFileName);
    }
    if (headerOptions.includeUnderline) {
      ret.push("===================================================================");
    }
  }
  const hasHunks = patch.hunks.length > 0;
  if (headerOptions.includeFileHeaders && patch.oldFileName !== undefined && patch.newFileName !== undefined && (!patch.isGit || hasHunks)) {
    ret.push("--- " + quoteFileNameIfNeeded(patch.oldFileName) + (patch.oldHeader ? "\t" + patch.oldHeader : ""));
    ret.push("+++ " + quoteFileNameIfNeeded(patch.newFileName) + (patch.newHeader ? "\t" + patch.newHeader : ""));
  }
  for (let i = 0;i < patch.hunks.length; i++) {
    const hunk = patch.hunks[i];
    const oldStart = hunk.oldLines === 0 ? hunk.oldStart - 1 : hunk.oldStart;
    const newStart = hunk.newLines === 0 ? hunk.newStart - 1 : hunk.newStart;
    ret.push("@@ -" + oldStart + "," + hunk.oldLines + " +" + newStart + "," + hunk.newLines + " @@");
    for (const line of hunk.lines) {
      ret.push(line);
    }
  }
  return ret.join(`
`) + `
`;
}
function createTwoFilesPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
  if (typeof options === "function") {
    options = { callback: options };
  }
  if (!(options === null || options === undefined ? undefined : options.callback)) {
    const patchObj = structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options);
    if (!patchObj) {
      return;
    }
    return formatPatch(patchObj, options === null || options === undefined ? undefined : options.headerOptions);
  } else {
    const { callback } = options;
    structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, Object.assign(Object.assign({}, options), { callback: (patchObj) => {
      if (!patchObj) {
        callback(undefined);
      } else {
        callback(formatPatch(patchObj, options.headerOptions));
      }
    } }));
  }
}
function splitLines(text) {
  const hasTrailingNl = text.endsWith(`
`);
  const result = text.split(`
`).map((line) => line + `
`);
  if (hasTrailingNl) {
    result.pop();
  } else {
    result.push(result.pop().slice(0, -1));
  }
  return result;
}
// packages/hashline-core/src/diff-utils.ts
function generateUnifiedDiff(oldContent, newContent, filePath) {
  return createTwoFilesPatch(filePath, filePath, oldContent, newContent, undefined, undefined, { context: 3 });
}
function countLineDiffs(oldContent, newContent) {
  const oldLines = oldContent.split(`
`);
  const newLines = newContent.split(`
`);
  const oldSet = new Map;
  for (const line of oldLines) {
    oldSet.set(line, (oldSet.get(line) ?? 0) + 1);
  }
  const newSet = new Map;
  for (const line of newLines) {
    newSet.set(line, (newSet.get(line) ?? 0) + 1);
  }
  let deletions = 0;
  for (const [line, count] of oldSet) {
    const newCount = newSet.get(line) ?? 0;
    if (count > newCount) {
      deletions += count - newCount;
    }
  }
  let additions = 0;
  for (const [line, count] of newSet) {
    const oldCount = oldSet.get(line) ?? 0;
    if (count > oldCount) {
      additions += count - oldCount;
    }
  }
  return { additions, deletions };
}
// src/tools/hashline-edit/tools.ts
import { tool } from "@opencode-ai/plugin/tool";

// src/tools/hashline-edit/hashline-edit-executor.ts
import * as path4 from "path";

// src/features/tool-metadata-store/store.ts
var pendingStore = new Map;
var STALE_TIMEOUT_MS = 15 * 60 * 1000;
function makeKey(sessionID, callID) {
  return `${sessionID}:${callID}`;
}
function cleanupStaleEntries() {
  const now = Date.now();
  for (const [key, entry] of pendingStore) {
    if (now - entry.storedAt > STALE_TIMEOUT_MS) {
      pendingStore.delete(key);
    }
  }
}
function storeToolMetadata(sessionID, callID, data) {
  cleanupStaleEntries();
  pendingStore.set(makeKey(sessionID, callID), { ...data, storedAt: Date.now() });
}
function consumeToolMetadata(sessionID, callID) {
  const key = makeKey(sessionID, callID);
  const stored = pendingStore.get(key);
  if (stored) {
    pendingStore.delete(key);
    const { storedAt: _, ...data } = stored;
    return data;
  }
  return;
}
// src/features/tool-metadata-store/resolve-tool-call-id.ts
init_logger();
function normalizeCallID(value) {
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}
function resolveToolCallID(ctx) {
  const resolved = normalizeCallID(ctx.callID) ?? normalizeCallID(ctx.callId) ?? normalizeCallID(ctx.call_id);
  if (!resolved) {
    log("[tool-metadata-store] Missing tool call ID for metadata correlation");
  }
  return resolved;
}
// src/features/tool-metadata-store/task-metadata-contract.ts
init_logger();
// src/features/tool-metadata-store/publish-tool-metadata.ts
init_logger();
async function publishToolMetadata(ctx, payload) {
  await ctx.metadata?.(payload);
  const callID = resolveToolCallID(ctx);
  if (!callID) {
    log("[tool-metadata-store] Skipping metadata store publish because tool call ID is unavailable", {
      sessionID: ctx.sessionID,
      hasTitle: typeof payload.title === "string",
      hasMetadata: payload.metadata !== undefined
    });
    return { stored: false };
  }
  storeToolMetadata(ctx.sessionID, callID, payload);
  return { stored: true };
}
// src/features/tool-metadata-store/recover-tool-metadata.ts
function recoverToolMetadata(sessionID, source) {
  if (typeof source === "string") {
    return consumeToolMetadata(sessionID, source);
  }
  const callID = source ? resolveToolCallID(source) : undefined;
  if (!callID) {
    return;
  }
  return consumeToolMetadata(sessionID, callID);
}
// src/shared/bun-file-shim.ts
import { access, readFile, unlink, writeFile } from "fs/promises";
var runtime2 = globalThis;
var IS_BUN = typeof runtime2.Bun !== "undefined";
function byteLength(data) {
  if (typeof data === "string")
    return Buffer.byteLength(data, "utf8");
  return data.byteLength;
}
function toWritableData(data) {
  if (typeof data === "string")
    return data;
  if (data instanceof Uint8Array)
    return data;
  return new Uint8Array(data);
}
function createNodeFile(path2) {
  return {
    text() {
      return readFile(path2, "utf8");
    },
    async arrayBuffer() {
      const buffer2 = await readFile(path2);
      return buffer2.buffer.slice(buffer2.byteOffset, buffer2.byteOffset + buffer2.byteLength);
    },
    exists() {
      return access(path2).then(() => true, () => false);
    },
    delete() {
      return unlink(path2);
    }
  };
}
function bunFile(path2) {
  if (IS_BUN)
    return runtime2.Bun.file(path2);
  return createNodeFile(path2);
}
async function bunWrite(path2, data) {
  if (IS_BUN)
    return runtime2.Bun.write(path2, data);
  await writeFile(path2, toWritableData(data));
  return byteLength(data);
}
// src/tools/hashline-edit/formatter-trigger.ts
import path3 from "path";

// packages/utils/src/deep-merge.ts
var DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
// packages/utils/src/record-type-guard.ts
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
// node_modules/.bun/js-yaml@4.2.0/node_modules/js-yaml/dist/js-yaml.mjs
/*! js-yaml 4.2.0 https://github.com/nodeca/js-yaml @license MIT */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function")
    for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key;i < n; i++) {
      key = keys[i];
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: ((k) => from[k]).bind(null, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
    }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
  value: mod,
  enumerable: true
}) : target, mod));
var require_common = /* @__PURE__ */ __commonJSMin((exports, module) => {
  function isNothing(subject) {
    return typeof subject === "undefined" || subject === null;
  }
  function isObject(subject) {
    return typeof subject === "object" && subject !== null;
  }
  function toArray(sequence) {
    if (Array.isArray(sequence))
      return sequence;
    else if (isNothing(sequence))
      return [];
    return [sequence];
  }
  function extend(target, source) {
    if (source) {
      const sourceKeys = Object.keys(source);
      for (let index = 0, length = sourceKeys.length;index < length; index += 1) {
        const key = sourceKeys[index];
        target[key] = source[key];
      }
    }
    return target;
  }
  function repeat(string, count) {
    let result = "";
    for (let cycle = 0;cycle < count; cycle += 1)
      result += string;
    return result;
  }
  function isNegativeZero(number) {
    return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
  }
  module.exports.isNothing = isNothing;
  module.exports.isObject = isObject;
  module.exports.toArray = toArray;
  module.exports.repeat = repeat;
  module.exports.isNegativeZero = isNegativeZero;
  module.exports.extend = extend;
});
var require_exception = /* @__PURE__ */ __commonJSMin((exports, module) => {
  function formatError(exception, compact) {
    let where = "";
    const message = exception.reason || "(unknown reason)";
    if (!exception.mark)
      return message;
    if (exception.mark.name)
      where += 'in "' + exception.mark.name + '" ';
    where += "(" + (exception.mark.line + 1) + ":" + (exception.mark.column + 1) + ")";
    if (!compact && exception.mark.snippet)
      where += `

` + exception.mark.snippet;
    return message + " " + where;
  }
  function YAMLException(reason, mark) {
    Error.call(this);
    this.name = "YAMLException";
    this.reason = reason;
    this.mark = mark;
    this.message = formatError(this, false);
    if (Error.captureStackTrace)
      Error.captureStackTrace(this, this.constructor);
    else
      this.stack = (/* @__PURE__ */ new Error()).stack || "";
  }
  YAMLException.prototype = Object.create(Error.prototype);
  YAMLException.prototype.constructor = YAMLException;
  YAMLException.prototype.toString = function toString(compact) {
    return this.name + ": " + formatError(this, compact);
  };
  module.exports = YAMLException;
});
var require_snippet = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var common = require_common();
  function getLine(buffer2, lineStart, lineEnd, position, maxLineLength) {
    let head = "";
    let tail = "";
    const maxHalfLength = Math.floor(maxLineLength / 2) - 1;
    if (position - lineStart > maxHalfLength) {
      head = " ... ";
      lineStart = position - maxHalfLength + head.length;
    }
    if (lineEnd - position > maxHalfLength) {
      tail = " ...";
      lineEnd = position + maxHalfLength - tail.length;
    }
    return {
      str: head + buffer2.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
      pos: position - lineStart + head.length
    };
  }
  function padStart(string, max) {
    return common.repeat(" ", max - string.length) + string;
  }
  function makeSnippet(mark, options) {
    options = Object.create(options || null);
    if (!mark.buffer)
      return null;
    if (!options.maxLength)
      options.maxLength = 79;
    if (typeof options.indent !== "number")
      options.indent = 1;
    if (typeof options.linesBefore !== "number")
      options.linesBefore = 3;
    if (typeof options.linesAfter !== "number")
      options.linesAfter = 2;
    const re = /\r?\n|\r|\0/g;
    const lineStarts = [0];
    const lineEnds = [];
    let match;
    let foundLineNo = -1;
    while (match = re.exec(mark.buffer)) {
      lineEnds.push(match.index);
      lineStarts.push(match.index + match[0].length);
      if (mark.position <= match.index && foundLineNo < 0)
        foundLineNo = lineStarts.length - 2;
    }
    if (foundLineNo < 0)
      foundLineNo = lineStarts.length - 1;
    let result = "";
    const lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
    const maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
    for (let i = 1;i <= options.linesBefore; i++) {
      if (foundLineNo - i < 0)
        break;
      const line2 = getLine(mark.buffer, lineStarts[foundLineNo - i], lineEnds[foundLineNo - i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]), maxLineLength);
      result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line2.str + `
` + result;
    }
    const line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
    result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + `
`;
    result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + `^
`;
    for (let i = 1;i <= options.linesAfter; i++) {
      if (foundLineNo + i >= lineEnds.length)
        break;
      const line2 = getLine(mark.buffer, lineStarts[foundLineNo + i], lineEnds[foundLineNo + i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]), maxLineLength);
      result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line2.str + `
`;
    }
    return result.replace(/\n$/, "");
  }
  module.exports = makeSnippet;
});
var require_type = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var YAMLException = require_exception();
  var TYPE_CONSTRUCTOR_OPTIONS = [
    "kind",
    "multi",
    "resolve",
    "construct",
    "instanceOf",
    "predicate",
    "represent",
    "representName",
    "defaultStyle",
    "styleAliases"
  ];
  var YAML_NODE_KINDS = [
    "scalar",
    "sequence",
    "mapping"
  ];
  function compileStyleAliases(map) {
    const result = {};
    if (map !== null)
      Object.keys(map).forEach(function(style) {
        map[style].forEach(function(alias) {
          result[String(alias)] = style;
        });
      });
    return result;
  }
  function Type(tag, options) {
    options = options || {};
    Object.keys(options).forEach(function(name) {
      if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1)
        throw new YAMLException('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
    });
    this.options = options;
    this.tag = tag;
    this.kind = options["kind"] || null;
    this.resolve = options["resolve"] || function() {
      return true;
    };
    this.construct = options["construct"] || function(data) {
      return data;
    };
    this.instanceOf = options["instanceOf"] || null;
    this.predicate = options["predicate"] || null;
    this.represent = options["represent"] || null;
    this.representName = options["representName"] || null;
    this.defaultStyle = options["defaultStyle"] || null;
    this.multi = options["multi"] || false;
    this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
    if (YAML_NODE_KINDS.indexOf(this.kind) === -1)
      throw new YAMLException('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
  }
  module.exports = Type;
});
var require_schema = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var YAMLException = require_exception();
  var Type = require_type();
  function compileList(schema, name) {
    const result = [];
    schema[name].forEach(function(currentType) {
      let newIndex = result.length;
      result.forEach(function(previousType, previousIndex) {
        if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi)
          newIndex = previousIndex;
      });
      result[newIndex] = currentType;
    });
    return result;
  }
  function compileMap() {
    const result = {
      scalar: {},
      sequence: {},
      mapping: {},
      fallback: {},
      multi: {
        scalar: [],
        sequence: [],
        mapping: [],
        fallback: []
      }
    };
    function collectType(type) {
      if (type.multi) {
        result.multi[type.kind].push(type);
        result.multi["fallback"].push(type);
      } else
        result[type.kind][type.tag] = result["fallback"][type.tag] = type;
    }
    for (let index = 0, length = arguments.length;index < length; index += 1)
      arguments[index].forEach(collectType);
    return result;
  }
  function Schema(definition) {
    return this.extend(definition);
  }
  Schema.prototype.extend = function extend(definition) {
    let implicit = [];
    let explicit = [];
    if (definition instanceof Type)
      explicit.push(definition);
    else if (Array.isArray(definition))
      explicit = explicit.concat(definition);
    else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
      if (definition.implicit)
        implicit = implicit.concat(definition.implicit);
      if (definition.explicit)
        explicit = explicit.concat(definition.explicit);
    } else
      throw new YAMLException("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
    implicit.forEach(function(type) {
      if (!(type instanceof Type))
        throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
      if (type.loadKind && type.loadKind !== "scalar")
        throw new YAMLException("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
      if (type.multi)
        throw new YAMLException("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
    });
    explicit.forEach(function(type) {
      if (!(type instanceof Type))
        throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    });
    const result = Object.create(Schema.prototype);
    result.implicit = (this.implicit || []).concat(implicit);
    result.explicit = (this.explicit || []).concat(explicit);
    result.compiledImplicit = compileList(result, "implicit");
    result.compiledExplicit = compileList(result, "explicit");
    result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
    return result;
  };
  module.exports = Schema;
});
var require_str = /* @__PURE__ */ __commonJSMin((exports, module) => {
  module.exports = new (require_type())("tag:yaml.org,2002:str", {
    kind: "scalar",
    construct: function(data) {
      return data !== null ? data : "";
    }
  });
});
var require_seq = /* @__PURE__ */ __commonJSMin((exports, module) => {
  module.exports = new (require_type())("tag:yaml.org,2002:seq", {
    kind: "sequence",
    construct: function(data) {
      return data !== null ? data : [];
    }
  });
});
var require_map = /* @__PURE__ */ __commonJSMin((exports, module) => {
  module.exports = new (require_type())("tag:yaml.org,2002:map", {
    kind: "mapping",
    construct: function(data) {
      return data !== null ? data : {};
    }
  });
});
var require_failsafe = /* @__PURE__ */ __commonJSMin((exports, module) => {
  module.exports = new (require_schema())({ explicit: [
    require_str(),
    require_seq(),
    require_map()
  ] });
});
var require_null = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var Type = require_type();
  function resolveYamlNull(data) {
    if (data === null)
      return true;
    const max = data.length;
    return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
  }
  function constructYamlNull() {
    return null;
  }
  function isNull(object) {
    return object === null;
  }
  module.exports = new Type("tag:yaml.org,2002:null", {
    kind: "scalar",
    resolve: resolveYamlNull,
    construct: constructYamlNull,
    predicate: isNull,
    represent: {
      canonical: function() {
        return "~";
      },
      lowercase: function() {
        return "null";
      },
      uppercase: function() {
        return "NULL";
      },
      camelcase: function() {
        return "Null";
      },
      empty: function() {
        return "";
      }
    },
    defaultStyle: "lowercase"
  });
});
var require_bool = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var Type = require_type();
  function resolveYamlBoolean(data) {
    if (data === null)
      return false;
    const max = data.length;
    return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
  }
  function constructYamlBoolean(data) {
    return data === "true" || data === "True" || data === "TRUE";
  }
  function isBoolean(object) {
    return Object.prototype.toString.call(object) === "[object Boolean]";
  }
  module.exports = new Type("tag:yaml.org,2002:bool", {
    kind: "scalar",
    resolve: resolveYamlBoolean,
    construct: constructYamlBoolean,
    predicate: isBoolean,
    represent: {
      lowercase: function(object) {
        return object ? "true" : "false";
      },
      uppercase: function(object) {
        return object ? "TRUE" : "FALSE";
      },
      camelcase: function(object) {
        return object ? "True" : "False";
      }
    },
    defaultStyle: "lowercase"
  });
});
var require_int = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var common = require_common();
  var Type = require_type();
  function isHexCode(c) {
    return c >= 48 && c <= 57 || c >= 65 && c <= 70 || c >= 97 && c <= 102;
  }
  function isOctCode(c) {
    return c >= 48 && c <= 55;
  }
  function isDecCode(c) {
    return c >= 48 && c <= 57;
  }
  function resolveYamlInteger(data) {
    if (data === null)
      return false;
    const max = data.length;
    let index = 0;
    let hasDigits = false;
    if (!max)
      return false;
    let ch = data[index];
    if (ch === "-" || ch === "+")
      ch = data[++index];
    if (ch === "0") {
      if (index + 1 === max)
        return true;
      ch = data[++index];
      if (ch === "b") {
        index++;
        for (;index < max; index++) {
          ch = data[index];
          if (ch !== "0" && ch !== "1")
            return false;
          hasDigits = true;
        }
        return hasDigits && Number.isFinite(parseYamlInteger(data));
      }
      if (ch === "x") {
        index++;
        for (;index < max; index++) {
          if (!isHexCode(data.charCodeAt(index)))
            return false;
          hasDigits = true;
        }
        return hasDigits && Number.isFinite(parseYamlInteger(data));
      }
      if (ch === "o") {
        index++;
        for (;index < max; index++) {
          if (!isOctCode(data.charCodeAt(index)))
            return false;
          hasDigits = true;
        }
        return hasDigits && Number.isFinite(parseYamlInteger(data));
      }
    }
    for (;index < max; index++) {
      if (!isDecCode(data.charCodeAt(index)))
        return false;
      hasDigits = true;
    }
    if (!hasDigits)
      return false;
    return Number.isFinite(parseYamlInteger(data));
  }
  function parseYamlInteger(data) {
    let value = data;
    let sign = 1;
    let ch = value[0];
    if (ch === "-" || ch === "+") {
      if (ch === "-")
        sign = -1;
      value = value.slice(1);
      ch = value[0];
    }
    if (value === "0")
      return 0;
    if (ch === "0") {
      if (value[1] === "b")
        return sign * parseInt(value.slice(2), 2);
      if (value[1] === "x")
        return sign * parseInt(value.slice(2), 16);
      if (value[1] === "o")
        return sign * parseInt(value.slice(2), 8);
    }
    return sign * parseInt(value, 10);
  }
  function constructYamlInteger(data) {
    return parseYamlInteger(data);
  }
  function isInteger(object) {
    return Object.prototype.toString.call(object) === "[object Number]" && object % 1 === 0 && !common.isNegativeZero(object);
  }
  module.exports = new Type("tag:yaml.org,2002:int", {
    kind: "scalar",
    resolve: resolveYamlInteger,
    construct: constructYamlInteger,
    predicate: isInteger,
    represent: {
      binary: function(obj) {
        return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
      },
      octal: function(obj) {
        return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
      },
      decimal: function(obj) {
        return obj.toString(10);
      },
      hexadecimal: function(obj) {
        return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
      }
    },
    defaultStyle: "decimal",
    styleAliases: {
      binary: [2, "bin"],
      octal: [8, "oct"],
      decimal: [10, "dec"],
      hexadecimal: [16, "hex"]
    }
  });
});
var require_float = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var common = require_common();
  var Type = require_type();
  var YAML_FLOAT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?(?:[0-9]+)(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
  var YAML_FLOAT_SPECIAL_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
  function resolveYamlFloat(data) {
    if (data === null)
      return false;
    if (!YAML_FLOAT_PATTERN.test(data))
      return false;
    if (Number.isFinite(parseFloat(data, 10)))
      return true;
    return YAML_FLOAT_SPECIAL_PATTERN.test(data);
  }
  function constructYamlFloat(data) {
    let value = data.toLowerCase();
    const sign = value[0] === "-" ? -1 : 1;
    if ("+-".indexOf(value[0]) >= 0)
      value = value.slice(1);
    if (value === ".inf")
      return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    else if (value === ".nan")
      return NaN;
    return sign * parseFloat(value, 10);
  }
  var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
  function representYamlFloat(object, style) {
    if (isNaN(object))
      switch (style) {
        case "lowercase":
          return ".nan";
        case "uppercase":
          return ".NAN";
        case "camelcase":
          return ".NaN";
      }
    else if (Number.POSITIVE_INFINITY === object)
      switch (style) {
        case "lowercase":
          return ".inf";
        case "uppercase":
          return ".INF";
        case "camelcase":
          return ".Inf";
      }
    else if (Number.NEGATIVE_INFINITY === object)
      switch (style) {
        case "lowercase":
          return "-.inf";
        case "uppercase":
          return "-.INF";
        case "camelcase":
          return "-.Inf";
      }
    else if (common.isNegativeZero(object))
      return "-0.0";
    const res = object.toString(10);
    return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
  }
  function isFloat(object) {
    return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
  }
  module.exports = new Type("tag:yaml.org,2002:float", {
    kind: "scalar",
    resolve: resolveYamlFloat,
    construct: constructYamlFloat,
    predicate: isFloat,
    represent: representYamlFloat,
    defaultStyle: "lowercase"
  });
});
var require_json = /* @__PURE__ */ __commonJSMin((exports, module) => {
  module.exports = require_failsafe().extend({ implicit: [
    require_null(),
    require_bool(),
    require_int(),
    require_float()
  ] });
});
var require_core = /* @__PURE__ */ __commonJSMin((exports, module) => {
  module.exports = require_json();
});
var require_timestamp = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var Type = require_type();
  var YAML_DATE_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$");
  var YAML_TIMESTAMP_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
  function resolveYamlTimestamp(data) {
    if (data === null)
      return false;
    if (YAML_DATE_REGEXP.exec(data) !== null)
      return true;
    if (YAML_TIMESTAMP_REGEXP.exec(data) !== null)
      return true;
    return false;
  }
  function constructYamlTimestamp(data) {
    let fraction = 0;
    let delta = null;
    let match = YAML_DATE_REGEXP.exec(data);
    if (match === null)
      match = YAML_TIMESTAMP_REGEXP.exec(data);
    if (match === null)
      throw new Error("Date resolve error");
    const year = +match[1];
    const month = +match[2] - 1;
    const day = +match[3];
    if (!match[4])
      return new Date(Date.UTC(year, month, day));
    const hour = +match[4];
    const minute = +match[5];
    const second = +match[6];
    if (match[7]) {
      fraction = match[7].slice(0, 3);
      while (fraction.length < 3)
        fraction += "0";
      fraction = +fraction;
    }
    if (match[9]) {
      const tzHour = +match[10];
      const tzMinute = +(match[11] || 0);
      delta = (tzHour * 60 + tzMinute) * 60000;
      if (match[9] === "-")
        delta = -delta;
    }
    const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
    if (delta)
      date.setTime(date.getTime() - delta);
    return date;
  }
  function representYamlTimestamp(object) {
    return object.toISOString();
  }
  module.exports = new Type("tag:yaml.org,2002:timestamp", {
    kind: "scalar",
    resolve: resolveYamlTimestamp,
    construct: constructYamlTimestamp,
    instanceOf: Date,
    represent: representYamlTimestamp
  });
});
var require_merge = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var Type = require_type();
  function resolveYamlMerge(data) {
    return data === "<<" || data === null;
  }
  module.exports = new Type("tag:yaml.org,2002:merge", {
    kind: "scalar",
    resolve: resolveYamlMerge
  });
});
var require_binary = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var Type = require_type();
  var BASE64_MAP = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;
  function resolveYamlBinary(data) {
    if (data === null)
      return false;
    let bitlen = 0;
    const max = data.length;
    const map = BASE64_MAP;
    for (let idx = 0;idx < max; idx++) {
      const code = map.indexOf(data.charAt(idx));
      if (code > 64)
        continue;
      if (code < 0)
        return false;
      bitlen += 6;
    }
    return bitlen % 8 === 0;
  }
  function constructYamlBinary(data) {
    const input = data.replace(/[\r\n=]/g, "");
    const max = input.length;
    const map = BASE64_MAP;
    let bits = 0;
    const result = [];
    for (let idx = 0;idx < max; idx++) {
      if (idx % 4 === 0 && idx) {
        result.push(bits >> 16 & 255);
        result.push(bits >> 8 & 255);
        result.push(bits & 255);
      }
      bits = bits << 6 | map.indexOf(input.charAt(idx));
    }
    const tailbits = max % 4 * 6;
    if (tailbits === 0) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    } else if (tailbits === 18) {
      result.push(bits >> 10 & 255);
      result.push(bits >> 2 & 255);
    } else if (tailbits === 12)
      result.push(bits >> 4 & 255);
    return new Uint8Array(result);
  }
  function representYamlBinary(object) {
    let result = "";
    let bits = 0;
    const max = object.length;
    const map = BASE64_MAP;
    for (let idx = 0;idx < max; idx++) {
      if (idx % 3 === 0 && idx) {
        result += map[bits >> 18 & 63];
        result += map[bits >> 12 & 63];
        result += map[bits >> 6 & 63];
        result += map[bits & 63];
      }
      bits = (bits << 8) + object[idx];
    }
    const tail = max % 3;
    if (tail === 0) {
      result += map[bits >> 18 & 63];
      result += map[bits >> 12 & 63];
      result += map[bits >> 6 & 63];
      result += map[bits & 63];
    } else if (tail === 2) {
      result += map[bits >> 10 & 63];
      result += map[bits >> 4 & 63];
      result += map[bits << 2 & 63];
      result += map[64];
    } else if (tail === 1) {
      result += map[bits >> 2 & 63];
      result += map[bits << 4 & 63];
      result += map[64];
      result += map[64];
    }
    return result;
  }
  function isBinary(obj) {
    return Object.prototype.toString.call(obj) === "[object Uint8Array]";
  }
  module.exports = new Type("tag:yaml.org,2002:binary", {
    kind: "scalar",
    resolve: resolveYamlBinary,
    construct: constructYamlBinary,
    predicate: isBinary,
    represent: representYamlBinary
  });
});
var require_omap = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var Type = require_type();
  var _hasOwnProperty = Object.prototype.hasOwnProperty;
  var _toString = Object.prototype.toString;
  function resolveYamlOmap(data) {
    if (data === null)
      return true;
    const objectKeys = [];
    const object = data;
    for (let index = 0, length = object.length;index < length; index += 1) {
      const pair = object[index];
      let pairHasKey = false;
      if (_toString.call(pair) !== "[object Object]")
        return false;
      let pairKey;
      for (pairKey in pair)
        if (_hasOwnProperty.call(pair, pairKey))
          if (!pairHasKey)
            pairHasKey = true;
          else
            return false;
      if (!pairHasKey)
        return false;
      if (objectKeys.indexOf(pairKey) === -1)
        objectKeys.push(pairKey);
      else
        return false;
    }
    return true;
  }
  function constructYamlOmap(data) {
    return data !== null ? data : [];
  }
  module.exports = new Type("tag:yaml.org,2002:omap", {
    kind: "sequence",
    resolve: resolveYamlOmap,
    construct: constructYamlOmap
  });
});
var require_pairs = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var Type = require_type();
  var _toString = Object.prototype.toString;
  function resolveYamlPairs(data) {
    if (data === null)
      return true;
    const object = data;
    const result = new Array(object.length);
    for (let index = 0, length = object.length;index < length; index += 1) {
      const pair = object[index];
      if (_toString.call(pair) !== "[object Object]")
        return false;
      const keys = Object.keys(pair);
      if (keys.length !== 1)
        return false;
      result[index] = [keys[0], pair[keys[0]]];
    }
    return true;
  }
  function constructYamlPairs(data) {
    if (data === null)
      return [];
    const object = data;
    const result = new Array(object.length);
    for (let index = 0, length = object.length;index < length; index += 1) {
      const pair = object[index];
      const keys = Object.keys(pair);
      result[index] = [keys[0], pair[keys[0]]];
    }
    return result;
  }
  module.exports = new Type("tag:yaml.org,2002:pairs", {
    kind: "sequence",
    resolve: resolveYamlPairs,
    construct: constructYamlPairs
  });
});
var require_set = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var Type = require_type();
  var _hasOwnProperty = Object.prototype.hasOwnProperty;
  function resolveYamlSet(data) {
    if (data === null)
      return true;
    const object = data;
    for (const key in object)
      if (_hasOwnProperty.call(object, key)) {
        if (object[key] !== null)
          return false;
      }
    return true;
  }
  function constructYamlSet(data) {
    return data !== null ? data : {};
  }
  module.exports = new Type("tag:yaml.org,2002:set", {
    kind: "mapping",
    resolve: resolveYamlSet,
    construct: constructYamlSet
  });
});
var require_default = /* @__PURE__ */ __commonJSMin((exports, module) => {
  module.exports = require_core().extend({
    implicit: [require_timestamp(), require_merge()],
    explicit: [
      require_binary(),
      require_omap(),
      require_pairs(),
      require_set()
    ]
  });
});
var require_loader = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var common = require_common();
  var YAMLException = require_exception();
  var makeSnippet = require_snippet();
  var DEFAULT_SCHEMA = require_default();
  var _hasOwnProperty = Object.prototype.hasOwnProperty;
  var CONTEXT_FLOW_IN = 1;
  var CONTEXT_FLOW_OUT = 2;
  var CONTEXT_BLOCK_IN = 3;
  var CONTEXT_BLOCK_OUT = 4;
  var CHOMPING_CLIP = 1;
  var CHOMPING_STRIP = 2;
  var CHOMPING_KEEP = 3;
  var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
  var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
  var PATTERN_FLOW_INDICATORS = /[,\[\]{}]/;
  var PATTERN_TAG_HANDLE = /^(?:!|!!|![0-9A-Za-z-]+!)$/;
  var PATTERN_TAG_URI = /^(?:!|[^,\[\]{}])(?:%[0-9a-f]{2}|[0-9a-z\-#;/?:@&=+$,_.!~*'()\[\]])*$/i;
  function _class(obj) {
    return Object.prototype.toString.call(obj);
  }
  function isEol(c) {
    return c === 10 || c === 13;
  }
  function isWhiteSpace(c) {
    return c === 9 || c === 32;
  }
  function isWsOrEol(c) {
    return c === 9 || c === 32 || c === 10 || c === 13;
  }
  function isFlowIndicator(c) {
    return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
  }
  function fromHexCode(c) {
    if (c >= 48 && c <= 57)
      return c - 48;
    const lc = c | 32;
    if (lc >= 97 && lc <= 102)
      return lc - 97 + 10;
    return -1;
  }
  function escapedHexLen(c) {
    if (c === 120)
      return 2;
    if (c === 117)
      return 4;
    if (c === 85)
      return 8;
    return 0;
  }
  function fromDecimalCode(c) {
    if (c >= 48 && c <= 57)
      return c - 48;
    return -1;
  }
  function simpleEscapeSequence(c) {
    switch (c) {
      case 48:
        return "\x00";
      case 97:
        return "\x07";
      case 98:
        return "\b";
      case 116:
        return "\t";
      case 9:
        return "\t";
      case 110:
        return `
`;
      case 118:
        return "\v";
      case 102:
        return "\f";
      case 114:
        return "\r";
      case 101:
        return "\x1B";
      case 32:
        return " ";
      case 34:
        return '"';
      case 47:
        return "/";
      case 92:
        return "\\";
      case 78:
        return "\x85";
      case 95:
        return "\xA0";
      case 76:
        return "\u2028";
      case 80:
        return "\u2029";
      default:
        return "";
    }
  }
  function charFromCodepoint(c) {
    if (c <= 65535)
      return String.fromCharCode(c);
    return String.fromCharCode((c - 65536 >> 10) + 55296, (c - 65536 & 1023) + 56320);
  }
  function setProperty(object, key, value) {
    if (key === "__proto__")
      Object.defineProperty(object, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value
      });
    else
      object[key] = value;
  }
  var simpleEscapeCheck = new Array(256);
  var simpleEscapeMap = new Array(256);
  for (let i = 0;i < 256; i++) {
    simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
    simpleEscapeMap[i] = simpleEscapeSequence(i);
  }
  function State(input, options) {
    this.input = input;
    this.filename = options["filename"] || null;
    this.schema = options["schema"] || DEFAULT_SCHEMA;
    this.onWarning = options["onWarning"] || null;
    this.legacy = options["legacy"] || false;
    this.json = options["json"] || false;
    this.listener = options["listener"] || null;
    this.maxDepth = typeof options["maxDepth"] === "number" ? options["maxDepth"] : 100;
    this.maxMergeSeqLength = typeof options["maxMergeSeqLength"] === "number" ? options["maxMergeSeqLength"] : 20;
    this.implicitTypes = this.schema.compiledImplicit;
    this.typeMap = this.schema.compiledTypeMap;
    this.length = input.length;
    this.position = 0;
    this.line = 0;
    this.lineStart = 0;
    this.lineIndent = 0;
    this.depth = 0;
    this.firstTabInLine = -1;
    this.documents = [];
    this.anchorMapTransactions = [];
  }
  function generateError(state, message) {
    const mark = {
      name: state.filename,
      buffer: state.input.slice(0, -1),
      position: state.position,
      line: state.line,
      column: state.position - state.lineStart
    };
    mark.snippet = makeSnippet(mark);
    return new YAMLException(message, mark);
  }
  function throwError(state, message) {
    throw generateError(state, message);
  }
  function throwWarning(state, message) {
    if (state.onWarning)
      state.onWarning.call(null, generateError(state, message));
  }
  function storeAnchor(state, name, value) {
    const transactions = state.anchorMapTransactions;
    if (transactions.length !== 0) {
      const transaction = transactions[transactions.length - 1];
      if (!_hasOwnProperty.call(transaction, name))
        transaction[name] = {
          existed: _hasOwnProperty.call(state.anchorMap, name),
          value: state.anchorMap[name]
        };
    }
    state.anchorMap[name] = value;
  }
  function beginAnchorTransaction(state) {
    state.anchorMapTransactions.push(Object.create(null));
  }
  function commitAnchorTransaction(state) {
    const transaction = state.anchorMapTransactions.pop();
    const transactions = state.anchorMapTransactions;
    if (transactions.length === 0)
      return;
    const parent = transactions[transactions.length - 1];
    const names = Object.keys(transaction);
    for (let index = 0, length = names.length;index < length; index += 1) {
      const name = names[index];
      if (!_hasOwnProperty.call(parent, name))
        parent[name] = transaction[name];
    }
  }
  function rollbackAnchorTransaction(state) {
    const transaction = state.anchorMapTransactions.pop();
    const names = Object.keys(transaction);
    for (let index = names.length - 1;index >= 0; index -= 1) {
      const entry = transaction[names[index]];
      if (entry.existed)
        state.anchorMap[names[index]] = entry.value;
      else
        delete state.anchorMap[names[index]];
    }
  }
  function snapshotState(state) {
    return {
      position: state.position,
      line: state.line,
      lineStart: state.lineStart,
      lineIndent: state.lineIndent,
      firstTabInLine: state.firstTabInLine,
      tag: state.tag,
      anchor: state.anchor,
      kind: state.kind,
      result: state.result
    };
  }
  function restoreState(state, snapshot) {
    state.position = snapshot.position;
    state.line = snapshot.line;
    state.lineStart = snapshot.lineStart;
    state.lineIndent = snapshot.lineIndent;
    state.firstTabInLine = snapshot.firstTabInLine;
    state.tag = snapshot.tag;
    state.anchor = snapshot.anchor;
    state.kind = snapshot.kind;
    state.result = snapshot.result;
  }
  var directiveHandlers = {
    YAML: function handleYamlDirective(state, name, args) {
      if (state.version !== null)
        throwError(state, "duplication of %YAML directive");
      if (args.length !== 1)
        throwError(state, "YAML directive accepts exactly one argument");
      const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
      if (match === null)
        throwError(state, "ill-formed argument of the YAML directive");
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      if (major !== 1)
        throwError(state, "unacceptable YAML version of the document");
      state.version = args[0];
      state.checkLineBreaks = minor < 2;
      if (minor !== 1 && minor !== 2)
        throwWarning(state, "unsupported YAML version of the document");
    },
    TAG: function handleTagDirective(state, name, args) {
      let prefix;
      if (args.length !== 2)
        throwError(state, "TAG directive accepts exactly two arguments");
      const handle = args[0];
      prefix = args[1];
      if (!PATTERN_TAG_HANDLE.test(handle))
        throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
      if (_hasOwnProperty.call(state.tagMap, handle))
        throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
      if (!PATTERN_TAG_URI.test(prefix))
        throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
      try {
        prefix = decodeURIComponent(prefix);
      } catch (err) {
        throwError(state, "tag prefix is malformed: " + prefix);
      }
      state.tagMap[handle] = prefix;
    }
  };
  function captureSegment(state, start, end, checkJson) {
    if (start < end) {
      const _result = state.input.slice(start, end);
      if (checkJson)
        for (let _position = 0, _length = _result.length;_position < _length; _position += 1) {
          const _character = _result.charCodeAt(_position);
          if (!(_character === 9 || _character >= 32 && _character <= 1114111))
            throwError(state, "expected valid JSON character");
        }
      else if (PATTERN_NON_PRINTABLE.test(_result))
        throwError(state, "the stream contains non-printable characters");
      state.result += _result;
    }
  }
  function mergeMappings(state, destination, source, overridableKeys) {
    if (!common.isObject(source))
      throwError(state, "cannot merge mappings; the provided source object is unacceptable");
    const sourceKeys = Object.keys(source);
    for (let index = 0, quantity = sourceKeys.length;index < quantity; index += 1) {
      const key = sourceKeys[index];
      if (!_hasOwnProperty.call(destination, key)) {
        setProperty(destination, key, source[key]);
        overridableKeys[key] = true;
      }
    }
  }
  function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
    if (Array.isArray(keyNode)) {
      keyNode = Array.prototype.slice.call(keyNode);
      for (let index = 0, quantity = keyNode.length;index < quantity; index += 1) {
        if (Array.isArray(keyNode[index]))
          throwError(state, "nested arrays are not supported inside keys");
        if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]")
          keyNode[index] = "[object Object]";
      }
    }
    if (typeof keyNode === "object" && _class(keyNode) === "[object Object]")
      keyNode = "[object Object]";
    keyNode = String(keyNode);
    if (_result === null)
      _result = {};
    if (keyTag === "tag:yaml.org,2002:merge")
      if (Array.isArray(valueNode)) {
        if (valueNode.length > state.maxMergeSeqLength)
          throwError(state, "merge sequence length exceeded maxMergeSeqLength (" + state.maxMergeSeqLength + ")");
        const seen = /* @__PURE__ */ new Set;
        for (let index = 0, quantity = valueNode.length;index < quantity; index += 1) {
          const src = valueNode[index];
          if (seen.has(src))
            continue;
          seen.add(src);
          mergeMappings(state, _result, src, overridableKeys);
        }
      } else
        mergeMappings(state, _result, valueNode, overridableKeys);
    else {
      if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
        state.line = startLine || state.line;
        state.lineStart = startLineStart || state.lineStart;
        state.position = startPos || state.position;
        throwError(state, "duplicated mapping key");
      }
      setProperty(_result, keyNode, valueNode);
      delete overridableKeys[keyNode];
    }
    return _result;
  }
  function readLineBreak(state) {
    const ch = state.input.charCodeAt(state.position);
    if (ch === 10)
      state.position++;
    else if (ch === 13) {
      state.position++;
      if (state.input.charCodeAt(state.position) === 10)
        state.position++;
    } else
      throwError(state, "a line break is expected");
    state.line += 1;
    state.lineStart = state.position;
    state.firstTabInLine = -1;
  }
  function skipSeparationSpace(state, allowComments, checkIndent) {
    let lineBreaks = 0;
    let ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      while (isWhiteSpace(ch)) {
        if (ch === 9 && state.firstTabInLine === -1)
          state.firstTabInLine = state.position;
        ch = state.input.charCodeAt(++state.position);
      }
      if (allowComments && ch === 35)
        do
          ch = state.input.charCodeAt(++state.position);
        while (ch !== 10 && ch !== 13 && ch !== 0);
      if (isEol(ch)) {
        readLineBreak(state);
        ch = state.input.charCodeAt(state.position);
        lineBreaks++;
        state.lineIndent = 0;
        while (ch === 32) {
          state.lineIndent++;
          ch = state.input.charCodeAt(++state.position);
        }
      } else
        break;
    }
    if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent)
      throwWarning(state, "deficient indentation");
    return lineBreaks;
  }
  function testDocumentSeparator(state) {
    let _position = state.position;
    let ch = state.input.charCodeAt(_position);
    if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
      _position += 3;
      ch = state.input.charCodeAt(_position);
      if (ch === 0 || isWsOrEol(ch))
        return true;
    }
    return false;
  }
  function writeFoldedLines(state, count) {
    if (count === 1)
      state.result += " ";
    else if (count > 1)
      state.result += common.repeat(`
`, count - 1);
  }
  function readPlainScalar(state, nodeIndent, withinFlowCollection) {
    let captureStart;
    let captureEnd;
    let hasPendingContent;
    let _line;
    let _lineStart;
    let _lineIndent;
    const _kind = state.kind;
    const _result = state.result;
    let ch = state.input.charCodeAt(state.position);
    if (isWsOrEol(ch) || isFlowIndicator(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96)
      return false;
    if (ch === 63 || ch === 45) {
      const following = state.input.charCodeAt(state.position + 1);
      if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following))
        return false;
    }
    state.kind = "scalar";
    state.result = "";
    captureStart = captureEnd = state.position;
    hasPendingContent = false;
    while (ch !== 0) {
      if (ch === 58) {
        const following = state.input.charCodeAt(state.position + 1);
        if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following))
          break;
      } else if (ch === 35) {
        if (isWsOrEol(state.input.charCodeAt(state.position - 1)))
          break;
      } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && isFlowIndicator(ch))
        break;
      else if (isEol(ch)) {
        _line = state.line;
        _lineStart = state.lineStart;
        _lineIndent = state.lineIndent;
        skipSeparationSpace(state, false, -1);
        if (state.lineIndent >= nodeIndent) {
          hasPendingContent = true;
          ch = state.input.charCodeAt(state.position);
          continue;
        } else {
          state.position = captureEnd;
          state.line = _line;
          state.lineStart = _lineStart;
          state.lineIndent = _lineIndent;
          break;
        }
      }
      if (hasPendingContent) {
        captureSegment(state, captureStart, captureEnd, false);
        writeFoldedLines(state, state.line - _line);
        captureStart = captureEnd = state.position;
        hasPendingContent = false;
      }
      if (!isWhiteSpace(ch))
        captureEnd = state.position + 1;
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, captureEnd, false);
    if (state.result)
      return true;
    state.kind = _kind;
    state.result = _result;
    return false;
  }
  function readSingleQuotedScalar(state, nodeIndent) {
    let captureStart;
    let captureEnd;
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 39)
      return false;
    state.kind = "scalar";
    state.result = "";
    state.position++;
    captureStart = captureEnd = state.position;
    while ((ch = state.input.charCodeAt(state.position)) !== 0)
      if (ch === 39) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);
        if (ch === 39) {
          captureStart = state.position;
          state.position++;
          captureEnd = state.position;
        } else
          return true;
      } else if (isEol(ch)) {
        captureSegment(state, captureStart, captureEnd, true);
        writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
        captureStart = captureEnd = state.position;
      } else if (state.position === state.lineStart && testDocumentSeparator(state))
        throwError(state, "unexpected end of the document within a single quoted scalar");
      else {
        state.position++;
        if (!isWhiteSpace(ch))
          captureEnd = state.position;
      }
    throwError(state, "unexpected end of the stream within a single quoted scalar");
  }
  function readDoubleQuotedScalar(state, nodeIndent) {
    let captureStart;
    let captureEnd;
    let tmp;
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 34)
      return false;
    state.kind = "scalar";
    state.result = "";
    state.position++;
    captureStart = captureEnd = state.position;
    while ((ch = state.input.charCodeAt(state.position)) !== 0)
      if (ch === 34) {
        captureSegment(state, captureStart, state.position, true);
        state.position++;
        return true;
      } else if (ch === 92) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);
        if (isEol(ch))
          skipSeparationSpace(state, false, nodeIndent);
        else if (ch < 256 && simpleEscapeCheck[ch]) {
          state.result += simpleEscapeMap[ch];
          state.position++;
        } else if ((tmp = escapedHexLen(ch)) > 0) {
          let hexLength = tmp;
          let hexResult = 0;
          for (;hexLength > 0; hexLength--) {
            ch = state.input.charCodeAt(++state.position);
            if ((tmp = fromHexCode(ch)) >= 0)
              hexResult = (hexResult << 4) + tmp;
            else
              throwError(state, "expected hexadecimal character");
          }
          state.result += charFromCodepoint(hexResult);
          state.position++;
        } else
          throwError(state, "unknown escape sequence");
        captureStart = captureEnd = state.position;
      } else if (isEol(ch)) {
        captureSegment(state, captureStart, captureEnd, true);
        writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
        captureStart = captureEnd = state.position;
      } else if (state.position === state.lineStart && testDocumentSeparator(state))
        throwError(state, "unexpected end of the document within a double quoted scalar");
      else {
        state.position++;
        if (!isWhiteSpace(ch))
          captureEnd = state.position;
      }
    throwError(state, "unexpected end of the stream within a double quoted scalar");
  }
  function readFlowCollection(state, nodeIndent) {
    let readNext = true;
    let _line;
    let _lineStart;
    let _pos;
    const _tag = state.tag;
    let _result;
    const _anchor = state.anchor;
    let terminator;
    let isPair;
    let isExplicitPair;
    let isMapping;
    const overridableKeys = Object.create(null);
    let keyNode;
    let keyTag;
    let valueNode;
    let ch = state.input.charCodeAt(state.position);
    if (ch === 91) {
      terminator = 93;
      isMapping = false;
      _result = [];
    } else if (ch === 123) {
      terminator = 125;
      isMapping = true;
      _result = {};
    } else
      return false;
    if (state.anchor !== null)
      storeAnchor(state, state.anchor, _result);
    ch = state.input.charCodeAt(++state.position);
    while (ch !== 0) {
      skipSeparationSpace(state, true, nodeIndent);
      ch = state.input.charCodeAt(state.position);
      if (ch === terminator) {
        state.position++;
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = isMapping ? "mapping" : "sequence";
        state.result = _result;
        return true;
      } else if (!readNext)
        throwError(state, "missed comma between flow collection entries");
      else if (ch === 44)
        throwError(state, "expected the node content, but found ','");
      keyTag = keyNode = valueNode = null;
      isPair = isExplicitPair = false;
      if (ch === 63) {
        if (isWsOrEol(state.input.charCodeAt(state.position + 1))) {
          isPair = isExplicitPair = true;
          state.position++;
          skipSeparationSpace(state, true, nodeIndent);
        }
      }
      _line = state.line;
      _lineStart = state.lineStart;
      _pos = state.position;
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      keyTag = state.tag;
      keyNode = state.result;
      skipSeparationSpace(state, true, nodeIndent);
      ch = state.input.charCodeAt(state.position);
      if ((isExplicitPair || state.line === _line) && ch === 58) {
        isPair = true;
        ch = state.input.charCodeAt(++state.position);
        skipSeparationSpace(state, true, nodeIndent);
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        valueNode = state.result;
      }
      if (isMapping)
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
      else if (isPair)
        _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
      else
        _result.push(keyNode);
      skipSeparationSpace(state, true, nodeIndent);
      ch = state.input.charCodeAt(state.position);
      if (ch === 44) {
        readNext = true;
        ch = state.input.charCodeAt(++state.position);
      } else
        readNext = false;
    }
    throwError(state, "unexpected end of the stream within a flow collection");
  }
  function readBlockScalar(state, nodeIndent) {
    let folding;
    let chomping = CHOMPING_CLIP;
    let didReadContent = false;
    let detectedIndent = false;
    let textIndent = nodeIndent;
    let emptyLines = 0;
    let atMoreIndented = false;
    let tmp;
    let ch = state.input.charCodeAt(state.position);
    if (ch === 124)
      folding = false;
    else if (ch === 62)
      folding = true;
    else
      return false;
    state.kind = "scalar";
    state.result = "";
    while (ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
      if (ch === 43 || ch === 45)
        if (CHOMPING_CLIP === chomping)
          chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
        else
          throwError(state, "repeat of a chomping mode identifier");
      else if ((tmp = fromDecimalCode(ch)) >= 0)
        if (tmp === 0)
          throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
        else if (!detectedIndent) {
          textIndent = nodeIndent + tmp - 1;
          detectedIndent = true;
        } else
          throwError(state, "repeat of an indentation width identifier");
      else
        break;
    }
    if (isWhiteSpace(ch)) {
      do
        ch = state.input.charCodeAt(++state.position);
      while (isWhiteSpace(ch));
      if (ch === 35)
        do
          ch = state.input.charCodeAt(++state.position);
        while (!isEol(ch) && ch !== 0);
    }
    while (ch !== 0) {
      readLineBreak(state);
      state.lineIndent = 0;
      ch = state.input.charCodeAt(state.position);
      while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
      if (!detectedIndent && state.lineIndent > textIndent)
        textIndent = state.lineIndent;
      if (isEol(ch)) {
        emptyLines++;
        continue;
      }
      if (!detectedIndent && textIndent === 0)
        throwError(state, "missing indentation for block scalar");
      if (state.lineIndent < textIndent) {
        if (chomping === CHOMPING_KEEP)
          state.result += common.repeat(`
`, didReadContent ? 1 + emptyLines : emptyLines);
        else if (chomping === CHOMPING_CLIP) {
          if (didReadContent)
            state.result += `
`;
        }
        break;
      }
      if (folding)
        if (isWhiteSpace(ch)) {
          atMoreIndented = true;
          state.result += common.repeat(`
`, didReadContent ? 1 + emptyLines : emptyLines);
        } else if (atMoreIndented) {
          atMoreIndented = false;
          state.result += common.repeat(`
`, emptyLines + 1);
        } else if (emptyLines === 0) {
          if (didReadContent)
            state.result += " ";
        } else
          state.result += common.repeat(`
`, emptyLines);
      else
        state.result += common.repeat(`
`, didReadContent ? 1 + emptyLines : emptyLines);
      didReadContent = true;
      detectedIndent = true;
      emptyLines = 0;
      const captureStart = state.position;
      while (!isEol(ch) && ch !== 0)
        ch = state.input.charCodeAt(++state.position);
      captureSegment(state, captureStart, state.position, false);
    }
    return true;
  }
  function readBlockSequence(state, nodeIndent) {
    const _tag = state.tag;
    const _anchor = state.anchor;
    const _result = [];
    let detected = false;
    if (state.firstTabInLine !== -1)
      return false;
    if (state.anchor !== null)
      storeAnchor(state, state.anchor, _result);
    let ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      if (state.firstTabInLine !== -1) {
        state.position = state.firstTabInLine;
        throwError(state, "tab characters must not be used in indentation");
      }
      if (ch !== 45)
        break;
      if (!isWsOrEol(state.input.charCodeAt(state.position + 1)))
        break;
      detected = true;
      state.position++;
      if (skipSeparationSpace(state, true, -1)) {
        if (state.lineIndent <= nodeIndent) {
          _result.push(null);
          ch = state.input.charCodeAt(state.position);
          continue;
        }
      }
      const _line = state.line;
      composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
      _result.push(state.result);
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
      if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0)
        throwError(state, "bad indentation of a sequence entry");
      else if (state.lineIndent < nodeIndent)
        break;
    }
    if (detected) {
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = "sequence";
      state.result = _result;
      return true;
    }
    return false;
  }
  function readBlockMapping(state, nodeIndent, flowIndent) {
    let allowCompact;
    let _keyLine;
    let _keyLineStart;
    let _keyPos;
    const _tag = state.tag;
    const _anchor = state.anchor;
    const _result = {};
    const overridableKeys = Object.create(null);
    let keyTag = null;
    let keyNode = null;
    let valueNode = null;
    let atExplicitKey = false;
    let detected = false;
    if (state.firstTabInLine !== -1)
      return false;
    if (state.anchor !== null)
      storeAnchor(state, state.anchor, _result);
    let ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      if (!atExplicitKey && state.firstTabInLine !== -1) {
        state.position = state.firstTabInLine;
        throwError(state, "tab characters must not be used in indentation");
      }
      const following = state.input.charCodeAt(state.position + 1);
      const _line = state.line;
      if ((ch === 63 || ch === 58) && isWsOrEol(following)) {
        if (ch === 63) {
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = true;
          allowCompact = true;
        } else if (atExplicitKey) {
          atExplicitKey = false;
          allowCompact = true;
        } else
          throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
        state.position += 1;
        ch = following;
      } else {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;
        if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true))
          break;
        if (state.line === _line) {
          ch = state.input.charCodeAt(state.position);
          while (isWhiteSpace(ch))
            ch = state.input.charCodeAt(++state.position);
          if (ch === 58) {
            ch = state.input.charCodeAt(++state.position);
            if (!isWsOrEol(ch))
              throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
            if (atExplicitKey) {
              storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
              keyTag = keyNode = valueNode = null;
            }
            detected = true;
            atExplicitKey = false;
            allowCompact = false;
            keyTag = state.tag;
            keyNode = state.result;
          } else if (detected)
            throwError(state, "can not read an implicit mapping pair; a colon is missed");
          else {
            state.tag = _tag;
            state.anchor = _anchor;
            return true;
          }
        } else if (detected)
          throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
        else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      }
      if (state.line === _line || state.lineIndent > nodeIndent) {
        if (atExplicitKey) {
          _keyLine = state.line;
          _keyLineStart = state.lineStart;
          _keyPos = state.position;
        }
        if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact))
          if (atExplicitKey)
            keyNode = state.result;
          else
            valueNode = state.result;
        if (!atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
      }
      if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0)
        throwError(state, "bad indentation of a mapping entry");
      else if (state.lineIndent < nodeIndent)
        break;
    }
    if (atExplicitKey)
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
    if (detected) {
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = "mapping";
      state.result = _result;
    }
    return detected;
  }
  function readTagProperty(state) {
    let isVerbatim = false;
    let isNamed = false;
    let tagHandle;
    let tagName;
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 33)
      return false;
    if (state.tag !== null)
      throwError(state, "duplication of a tag property");
    ch = state.input.charCodeAt(++state.position);
    if (ch === 60) {
      isVerbatim = true;
      ch = state.input.charCodeAt(++state.position);
    } else if (ch === 33) {
      isNamed = true;
      tagHandle = "!!";
      ch = state.input.charCodeAt(++state.position);
    } else
      tagHandle = "!";
    let _position = state.position;
    if (isVerbatim) {
      do
        ch = state.input.charCodeAt(++state.position);
      while (ch !== 0 && ch !== 62);
      if (state.position < state.length) {
        tagName = state.input.slice(_position, state.position);
        ch = state.input.charCodeAt(++state.position);
      } else
        throwError(state, "unexpected end of the stream within a verbatim tag");
    } else {
      while (ch !== 0 && !isWsOrEol(ch)) {
        if (ch === 33)
          if (!isNamed) {
            tagHandle = state.input.slice(_position - 1, state.position + 1);
            if (!PATTERN_TAG_HANDLE.test(tagHandle))
              throwError(state, "named tag handle cannot contain such characters");
            isNamed = true;
            _position = state.position + 1;
          } else
            throwError(state, "tag suffix cannot contain exclamation marks");
        ch = state.input.charCodeAt(++state.position);
      }
      tagName = state.input.slice(_position, state.position);
      if (PATTERN_FLOW_INDICATORS.test(tagName))
        throwError(state, "tag suffix cannot contain flow indicator characters");
    }
    if (tagName && !PATTERN_TAG_URI.test(tagName))
      throwError(state, "tag name cannot contain such characters: " + tagName);
    try {
      tagName = decodeURIComponent(tagName);
    } catch (err) {
      throwError(state, "tag name is malformed: " + tagName);
    }
    if (isVerbatim)
      state.tag = tagName;
    else if (_hasOwnProperty.call(state.tagMap, tagHandle))
      state.tag = state.tagMap[tagHandle] + tagName;
    else if (tagHandle === "!")
      state.tag = "!" + tagName;
    else if (tagHandle === "!!")
      state.tag = "tag:yaml.org,2002:" + tagName;
    else
      throwError(state, 'undeclared tag handle "' + tagHandle + '"');
    return true;
  }
  function readAnchorProperty(state) {
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 38)
      return false;
    if (state.anchor !== null)
      throwError(state, "duplication of an anchor property");
    ch = state.input.charCodeAt(++state.position);
    const _position = state.position;
    while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch))
      ch = state.input.charCodeAt(++state.position);
    if (state.position === _position)
      throwError(state, "name of an anchor node must contain at least one character");
    state.anchor = state.input.slice(_position, state.position);
    return true;
  }
  function readAlias(state) {
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 42)
      return false;
    ch = state.input.charCodeAt(++state.position);
    const _position = state.position;
    while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch))
      ch = state.input.charCodeAt(++state.position);
    if (state.position === _position)
      throwError(state, "name of an alias node must contain at least one character");
    const alias = state.input.slice(_position, state.position);
    if (!_hasOwnProperty.call(state.anchorMap, alias))
      throwError(state, 'unidentified alias "' + alias + '"');
    state.result = state.anchorMap[alias];
    skipSeparationSpace(state, true, -1);
    return true;
  }
  function tryReadBlockMappingFromProperty(state, propertyStart, nodeIndent, flowIndent) {
    const fallbackState = snapshotState(state);
    beginAnchorTransaction(state);
    restoreState(state, propertyStart);
    state.tag = null;
    state.anchor = null;
    state.kind = null;
    state.result = null;
    if (readBlockMapping(state, nodeIndent, flowIndent) && state.kind === "mapping") {
      commitAnchorTransaction(state);
      return true;
    }
    rollbackAnchorTransaction(state);
    restoreState(state, fallbackState);
    return false;
  }
  function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
    let allowBlockScalars;
    let allowBlockCollections;
    let indentStatus = 1;
    let atNewLine = false;
    let hasContent = false;
    let propertyStart = null;
    let type;
    let flowIndent;
    let blockIndent;
    if (state.depth >= state.maxDepth)
      throwError(state, "nesting exceeded maxDepth (" + state.maxDepth + ")");
    state.depth += 1;
    if (state.listener !== null)
      state.listener("open", state);
    state.tag = null;
    state.anchor = null;
    state.kind = null;
    state.result = null;
    const allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
    if (allowToSeek) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        if (state.lineIndent > parentIndent)
          indentStatus = 1;
        else if (state.lineIndent === parentIndent)
          indentStatus = 0;
        else if (state.lineIndent < parentIndent)
          indentStatus = -1;
      }
    }
    if (indentStatus === 1)
      while (true) {
        const ch = state.input.charCodeAt(state.position);
        const propertyState = snapshotState(state);
        if (atNewLine && (ch === 33 && state.tag !== null || ch === 38 && state.anchor !== null))
          break;
        if (!readTagProperty(state) && !readAnchorProperty(state))
          break;
        if (propertyStart === null)
          propertyStart = propertyState;
        if (skipSeparationSpace(state, true, -1)) {
          atNewLine = true;
          allowBlockCollections = allowBlockStyles;
          if (state.lineIndent > parentIndent)
            indentStatus = 1;
          else if (state.lineIndent === parentIndent)
            indentStatus = 0;
          else if (state.lineIndent < parentIndent)
            indentStatus = -1;
        } else
          allowBlockCollections = false;
      }
    if (allowBlockCollections)
      allowBlockCollections = atNewLine || allowCompact;
    if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
      if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext)
        flowIndent = parentIndent;
      else
        flowIndent = parentIndent + 1;
      blockIndent = state.position - state.lineStart;
      if (indentStatus === 1)
        if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent))
          hasContent = true;
        else {
          const ch = state.input.charCodeAt(state.position);
          if (propertyStart !== null && allowBlockStyles && !allowBlockCollections && ch !== 124 && ch !== 62 && tryReadBlockMappingFromProperty(state, propertyStart, propertyStart.position - propertyStart.lineStart, flowIndent))
            hasContent = true;
          else if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent))
            hasContent = true;
          else if (readAlias(state)) {
            hasContent = true;
            if (state.tag !== null || state.anchor !== null)
              throwError(state, "alias node should not have any properties");
          } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
            hasContent = true;
            if (state.tag === null)
              state.tag = "?";
          }
          if (state.anchor !== null)
            storeAnchor(state, state.anchor, state.result);
        }
      else if (indentStatus === 0)
        hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
    }
    if (state.tag === null) {
      if (state.anchor !== null)
        storeAnchor(state, state.anchor, state.result);
    } else if (state.tag === "?") {
      if (state.result !== null && state.kind !== "scalar")
        throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
      for (let typeIndex = 0, typeQuantity = state.implicitTypes.length;typeIndex < typeQuantity; typeIndex += 1) {
        type = state.implicitTypes[typeIndex];
        if (type.resolve(state.result)) {
          state.result = type.construct(state.result);
          state.tag = type.tag;
          if (state.anchor !== null)
            storeAnchor(state, state.anchor, state.result);
          break;
        }
      }
    } else if (state.tag !== "!") {
      if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag))
        type = state.typeMap[state.kind || "fallback"][state.tag];
      else {
        type = null;
        const typeList = state.typeMap.multi[state.kind || "fallback"];
        for (let typeIndex = 0, typeQuantity = typeList.length;typeIndex < typeQuantity; typeIndex += 1)
          if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
            type = typeList[typeIndex];
            break;
          }
      }
      if (!type)
        throwError(state, "unknown tag !<" + state.tag + ">");
      if (state.result !== null && type.kind !== state.kind)
        throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"');
      if (!type.resolve(state.result, state.tag))
        throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
      else {
        state.result = type.construct(state.result, state.tag);
        if (state.anchor !== null)
          storeAnchor(state, state.anchor, state.result);
      }
    }
    if (state.listener !== null)
      state.listener("close", state);
    state.depth -= 1;
    return state.tag !== null || state.anchor !== null || hasContent;
  }
  function readDocument(state) {
    const documentStart = state.position;
    let hasDirectives = false;
    let ch;
    state.version = null;
    state.checkLineBreaks = state.legacy;
    state.tagMap = Object.create(null);
    state.anchorMap = Object.create(null);
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
      if (state.lineIndent > 0 || ch !== 37)
        break;
      hasDirectives = true;
      ch = state.input.charCodeAt(++state.position);
      let _position = state.position;
      while (ch !== 0 && !isWsOrEol(ch))
        ch = state.input.charCodeAt(++state.position);
      const directiveName = state.input.slice(_position, state.position);
      const directiveArgs = [];
      if (directiveName.length < 1)
        throwError(state, "directive name must not be less than one character in length");
      while (ch !== 0) {
        while (isWhiteSpace(ch))
          ch = state.input.charCodeAt(++state.position);
        if (ch === 35) {
          do
            ch = state.input.charCodeAt(++state.position);
          while (ch !== 0 && !isEol(ch));
          break;
        }
        if (isEol(ch))
          break;
        _position = state.position;
        while (ch !== 0 && !isWsOrEol(ch))
          ch = state.input.charCodeAt(++state.position);
        directiveArgs.push(state.input.slice(_position, state.position));
      }
      if (ch !== 0)
        readLineBreak(state);
      if (_hasOwnProperty.call(directiveHandlers, directiveName))
        directiveHandlers[directiveName](state, directiveName, directiveArgs);
      else
        throwWarning(state, 'unknown document directive "' + directiveName + '"');
    }
    skipSeparationSpace(state, true, -1);
    if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    } else if (hasDirectives)
      throwError(state, "directives end mark is expected");
    composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
    skipSeparationSpace(state, true, -1);
    if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position)))
      throwWarning(state, "non-ASCII line breaks are interpreted as content");
    state.documents.push(state.result);
    if (state.position === state.lineStart && testDocumentSeparator(state)) {
      if (state.input.charCodeAt(state.position) === 46) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      }
      return;
    }
    if (state.position < state.length - 1)
      throwError(state, "end of the stream or a document separator is expected");
  }
  function loadDocuments(input, options) {
    input = String(input);
    options = options || {};
    if (input.length !== 0) {
      if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13)
        input += `
`;
      if (input.charCodeAt(0) === 65279)
        input = input.slice(1);
    }
    const state = new State(input, options);
    const nullpos = input.indexOf("\x00");
    if (nullpos !== -1) {
      state.position = nullpos;
      throwError(state, "null byte is not allowed in input");
    }
    state.input += "\x00";
    while (state.input.charCodeAt(state.position) === 32) {
      state.lineIndent += 1;
      state.position += 1;
    }
    while (state.position < state.length - 1)
      readDocument(state);
    return state.documents;
  }
  function loadAll(input, iterator, options) {
    if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
      options = iterator;
      iterator = null;
    }
    const documents = loadDocuments(input, options);
    if (typeof iterator !== "function")
      return documents;
    for (let index = 0, length = documents.length;index < length; index += 1)
      iterator(documents[index]);
  }
  function load(input, options) {
    const documents = loadDocuments(input, options);
    if (documents.length === 0)
      return;
    else if (documents.length === 1)
      return documents[0];
    throw new YAMLException("expected a single document in the stream, but found more");
  }
  module.exports.loadAll = loadAll;
  module.exports.load = load;
});
var require_dumper = /* @__PURE__ */ __commonJSMin((exports, module) => {
  var common = require_common();
  var YAMLException = require_exception();
  var DEFAULT_SCHEMA = require_default();
  var _toString = Object.prototype.toString;
  var _hasOwnProperty = Object.prototype.hasOwnProperty;
  var CHAR_BOM = 65279;
  var CHAR_TAB = 9;
  var CHAR_LINE_FEED = 10;
  var CHAR_CARRIAGE_RETURN = 13;
  var CHAR_SPACE = 32;
  var CHAR_EXCLAMATION = 33;
  var CHAR_DOUBLE_QUOTE = 34;
  var CHAR_SHARP = 35;
  var CHAR_PERCENT = 37;
  var CHAR_AMPERSAND = 38;
  var CHAR_SINGLE_QUOTE = 39;
  var CHAR_ASTERISK = 42;
  var CHAR_COMMA = 44;
  var CHAR_MINUS = 45;
  var CHAR_COLON = 58;
  var CHAR_EQUALS = 61;
  var CHAR_GREATER_THAN = 62;
  var CHAR_QUESTION = 63;
  var CHAR_COMMERCIAL_AT = 64;
  var CHAR_LEFT_SQUARE_BRACKET = 91;
  var CHAR_RIGHT_SQUARE_BRACKET = 93;
  var CHAR_GRAVE_ACCENT = 96;
  var CHAR_LEFT_CURLY_BRACKET = 123;
  var CHAR_VERTICAL_LINE = 124;
  var CHAR_RIGHT_CURLY_BRACKET = 125;
  var ESCAPE_SEQUENCES = {};
  ESCAPE_SEQUENCES[0] = "\\0";
  ESCAPE_SEQUENCES[7] = "\\a";
  ESCAPE_SEQUENCES[8] = "\\b";
  ESCAPE_SEQUENCES[9] = "\\t";
  ESCAPE_SEQUENCES[10] = "\\n";
  ESCAPE_SEQUENCES[11] = "\\v";
  ESCAPE_SEQUENCES[12] = "\\f";
  ESCAPE_SEQUENCES[13] = "\\r";
  ESCAPE_SEQUENCES[27] = "\\e";
  ESCAPE_SEQUENCES[34] = "\\\"";
  ESCAPE_SEQUENCES[92] = "\\\\";
  ESCAPE_SEQUENCES[133] = "\\N";
  ESCAPE_SEQUENCES[160] = "\\_";
  ESCAPE_SEQUENCES[8232] = "\\L";
  ESCAPE_SEQUENCES[8233] = "\\P";
  var DEPRECATED_BOOLEANS_SYNTAX = [
    "y",
    "Y",
    "yes",
    "Yes",
    "YES",
    "on",
    "On",
    "ON",
    "n",
    "N",
    "no",
    "No",
    "NO",
    "off",
    "Off",
    "OFF"
  ];
  var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
  function compileStyleMap(schema, map) {
    if (map === null)
      return {};
    const result = {};
    const keys = Object.keys(map);
    for (let index = 0, length = keys.length;index < length; index += 1) {
      let tag = keys[index];
      let style = String(map[tag]);
      if (tag.slice(0, 2) === "!!")
        tag = "tag:yaml.org,2002:" + tag.slice(2);
      const type = schema.compiledTypeMap["fallback"][tag];
      if (type && _hasOwnProperty.call(type.styleAliases, style))
        style = type.styleAliases[style];
      result[tag] = style;
    }
    return result;
  }
  function encodeHex(character) {
    let handle;
    let length;
    const string = character.toString(16).toUpperCase();
    if (character <= 255) {
      handle = "x";
      length = 2;
    } else if (character <= 65535) {
      handle = "u";
      length = 4;
    } else if (character <= 4294967295) {
      handle = "U";
      length = 8;
    } else
      throw new YAMLException("code point within a string may not be greater than 0xFFFFFFFF");
    return "\\" + handle + common.repeat("0", length - string.length) + string;
  }
  var QUOTING_TYPE_SINGLE = 1;
  var QUOTING_TYPE_DOUBLE = 2;
  function State(options) {
    this.schema = options["schema"] || DEFAULT_SCHEMA;
    this.indent = Math.max(1, options["indent"] || 2);
    this.noArrayIndent = options["noArrayIndent"] || false;
    this.skipInvalid = options["skipInvalid"] || false;
    this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
    this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
    this.sortKeys = options["sortKeys"] || false;
    this.lineWidth = options["lineWidth"] || 80;
    this.noRefs = options["noRefs"] || false;
    this.noCompatMode = options["noCompatMode"] || false;
    this.condenseFlow = options["condenseFlow"] || false;
    this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
    this.forceQuotes = options["forceQuotes"] || false;
    this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
    this.implicitTypes = this.schema.compiledImplicit;
    this.explicitTypes = this.schema.compiledExplicit;
    this.tag = null;
    this.result = "";
    this.duplicates = [];
    this.usedDuplicates = null;
  }
  function indentString(string, spaces) {
    const ind = common.repeat(" ", spaces);
    let position = 0;
    let result = "";
    const length = string.length;
    while (position < length) {
      let line;
      const next = string.indexOf(`
`, position);
      if (next === -1) {
        line = string.slice(position);
        position = length;
      } else {
        line = string.slice(position, next + 1);
        position = next + 1;
      }
      if (line.length && line !== `
`)
        result += ind;
      result += line;
    }
    return result;
  }
  function generateNextLine(state, level) {
    return `
` + common.repeat(" ", state.indent * level);
  }
  function testImplicitResolving(state, str) {
    for (let index = 0, length = state.implicitTypes.length;index < length; index += 1)
      if (state.implicitTypes[index].resolve(str))
        return true;
    return false;
  }
  function isWhitespace(c) {
    return c === CHAR_SPACE || c === CHAR_TAB;
  }
  function isPrintable(c) {
    return c >= 32 && c <= 126 || c >= 161 && c <= 55295 && c !== 8232 && c !== 8233 || c >= 57344 && c <= 65533 && c !== CHAR_BOM || c >= 65536 && c <= 1114111;
  }
  function isNsCharOrWhitespace(c) {
    return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
  }
  function isPlainSafe(c, prev, inblock) {
    const cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
    const cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
    return (inblock ? cIsNsCharOrWhitespace : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar;
  }
  function isPlainSafeFirst(c) {
    return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
  }
  function isPlainSafeLast(c) {
    return !isWhitespace(c) && c !== CHAR_COLON;
  }
  function codePointAt(string, pos) {
    const first = string.charCodeAt(pos);
    let second;
    if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
      second = string.charCodeAt(pos + 1);
      if (second >= 56320 && second <= 57343)
        return (first - 55296) * 1024 + second - 56320 + 65536;
    }
    return first;
  }
  function needIndentIndicator(string) {
    return /^\n* /.test(string);
  }
  var STYLE_PLAIN = 1;
  var STYLE_SINGLE = 2;
  var STYLE_LITERAL = 3;
  var STYLE_FOLDED = 4;
  var STYLE_DOUBLE = 5;
  function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
    let i;
    let char = 0;
    let prevChar = null;
    let hasLineBreak = false;
    let hasFoldableLine = false;
    const shouldTrackWidth = lineWidth !== -1;
    let previousLineBreak = -1;
    let plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
    if (singleLineOnly || forceQuotes)
      for (i = 0;i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        if (!isPrintable(char))
          return STYLE_DOUBLE;
        plain = plain && isPlainSafe(char, prevChar, inblock);
        prevChar = char;
      }
    else {
      for (i = 0;i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        if (char === CHAR_LINE_FEED) {
          hasLineBreak = true;
          if (shouldTrackWidth) {
            hasFoldableLine = hasFoldableLine || i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
            previousLineBreak = i;
          }
        } else if (!isPrintable(char))
          return STYLE_DOUBLE;
        plain = plain && isPlainSafe(char, prevChar, inblock);
        prevChar = char;
      }
      hasFoldableLine = hasFoldableLine || shouldTrackWidth && i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
    }
    if (!hasLineBreak && !hasFoldableLine) {
      if (plain && !forceQuotes && !testAmbiguousType(string))
        return STYLE_PLAIN;
      return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
    }
    if (indentPerLevel > 9 && needIndentIndicator(string))
      return STYLE_DOUBLE;
    if (!forceQuotes)
      return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  function writeScalar(state, string, level, iskey, inblock) {
    state.dump = function() {
      if (string.length === 0)
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
      if (!state.noCompatMode) {
        if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string))
          return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
      }
      const indent = state.indent * Math.max(1, level);
      const lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
      const singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
      function testAmbiguity(string2) {
        return testImplicitResolving(state, string2);
      }
      switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity, state.quotingType, state.forceQuotes && !iskey, inblock)) {
        case STYLE_PLAIN:
          return string;
        case STYLE_SINGLE:
          return "'" + string.replace(/'/g, "''") + "'";
        case STYLE_LITERAL:
          return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
        case STYLE_FOLDED:
          return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
        case STYLE_DOUBLE:
          return '"' + escapeString(string, lineWidth) + '"';
        default:
          throw new YAMLException("impossible error: invalid scalar style");
      }
    }();
  }
  function blockHeader(string, indentPerLevel) {
    const indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
    const clip = string[string.length - 1] === `
`;
    return indentIndicator + (clip && (string[string.length - 2] === `
` || string === `
`) ? "+" : clip ? "" : "-") + `
`;
  }
  function dropEndingNewline(string) {
    return string[string.length - 1] === `
` ? string.slice(0, -1) : string;
  }
  function foldString(string, width) {
    const lineRe = /(\n+)([^\n]*)/g;
    let result = function() {
      let nextLF = string.indexOf(`
`);
      nextLF = nextLF !== -1 ? nextLF : string.length;
      lineRe.lastIndex = nextLF;
      return foldLine(string.slice(0, nextLF), width);
    }();
    let prevMoreIndented = string[0] === `
` || string[0] === " ";
    let moreIndented;
    let match;
    while (match = lineRe.exec(string)) {
      const prefix = match[1];
      const line = match[2];
      moreIndented = line[0] === " ";
      result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? `
` : "") + foldLine(line, width);
      prevMoreIndented = moreIndented;
    }
    return result;
  }
  function foldLine(line, width) {
    if (line === "" || line[0] === " ")
      return line;
    const breakRe = / [^ ]/g;
    let match;
    let start = 0;
    let end;
    let curr = 0;
    let next = 0;
    let result = "";
    while (match = breakRe.exec(line)) {
      next = match.index;
      if (next - start > width) {
        end = curr > start ? curr : next;
        result += `
` + line.slice(start, end);
        start = end + 1;
      }
      curr = next;
    }
    result += `
`;
    if (line.length - start > width && curr > start)
      result += line.slice(start, curr) + `
` + line.slice(curr + 1);
    else
      result += line.slice(start);
    return result.slice(1);
  }
  function escapeString(string) {
    let result = "";
    let char = 0;
    for (let i = 0;i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      const escapeSeq = ESCAPE_SEQUENCES[char];
      if (!escapeSeq && isPrintable(char)) {
        result += string[i];
        if (char >= 65536)
          result += string[i + 1];
      } else
        result += escapeSeq || encodeHex(char);
    }
    return result;
  }
  function writeFlowSequence(state, level, object) {
    let _result = "";
    const _tag = state.tag;
    for (let index = 0, length = object.length;index < length; index += 1) {
      let value = object[index];
      if (state.replacer)
        value = state.replacer.call(object, String(index), value);
      if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
        if (_result !== "")
          _result += "," + (!state.condenseFlow ? " " : "");
        _result += state.dump;
      }
    }
    state.tag = _tag;
    state.dump = "[" + _result + "]";
  }
  function writeBlockSequence(state, level, object, compact) {
    let _result = "";
    const _tag = state.tag;
    for (let index = 0, length = object.length;index < length; index += 1) {
      let value = object[index];
      if (state.replacer)
        value = state.replacer.call(object, String(index), value);
      if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
        if (!compact || _result !== "")
          _result += generateNextLine(state, level);
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0))
          _result += "-";
        else
          _result += "- ";
        _result += state.dump;
      }
    }
    state.tag = _tag;
    state.dump = _result || "[]";
  }
  function writeFlowMapping(state, level, object) {
    let _result = "";
    const _tag = state.tag;
    const objectKeyList = Object.keys(object);
    for (let index = 0, length = objectKeyList.length;index < length; index += 1) {
      let pairBuffer = "";
      if (_result !== "")
        pairBuffer += ", ";
      if (state.condenseFlow)
        pairBuffer += '"';
      const objectKey = objectKeyList[index];
      let objectValue = object[objectKey];
      if (state.replacer)
        objectValue = state.replacer.call(object, objectKey, objectValue);
      if (!writeNode(state, level, objectKey, false, false))
        continue;
      if (state.dump.length > 1024)
        pairBuffer += "? ";
      pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
      if (!writeNode(state, level, objectValue, false, false))
        continue;
      pairBuffer += state.dump;
      _result += pairBuffer;
    }
    state.tag = _tag;
    state.dump = "{" + _result + "}";
  }
  function writeBlockMapping(state, level, object, compact) {
    let _result = "";
    const _tag = state.tag;
    const objectKeyList = Object.keys(object);
    if (state.sortKeys === true)
      objectKeyList.sort();
    else if (typeof state.sortKeys === "function")
      objectKeyList.sort(state.sortKeys);
    else if (state.sortKeys)
      throw new YAMLException("sortKeys must be a boolean or a function");
    for (let index = 0, length = objectKeyList.length;index < length; index += 1) {
      let pairBuffer = "";
      if (!compact || _result !== "")
        pairBuffer += generateNextLine(state, level);
      const objectKey = objectKeyList[index];
      let objectValue = object[objectKey];
      if (state.replacer)
        objectValue = state.replacer.call(object, objectKey, objectValue);
      if (!writeNode(state, level + 1, objectKey, true, true, true))
        continue;
      const explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
      if (explicitPair)
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0))
          pairBuffer += "?";
        else
          pairBuffer += "? ";
      pairBuffer += state.dump;
      if (explicitPair)
        pairBuffer += generateNextLine(state, level);
      if (!writeNode(state, level + 1, objectValue, true, explicitPair))
        continue;
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0))
        pairBuffer += ":";
      else
        pairBuffer += ": ";
      pairBuffer += state.dump;
      _result += pairBuffer;
    }
    state.tag = _tag;
    state.dump = _result || "{}";
  }
  function detectType(state, object, explicit) {
    const typeList = explicit ? state.explicitTypes : state.implicitTypes;
    for (let index = 0, length = typeList.length;index < length; index += 1) {
      const type = typeList[index];
      if ((type.instanceOf || type.predicate) && (!type.instanceOf || typeof object === "object" && object instanceof type.instanceOf) && (!type.predicate || type.predicate(object))) {
        if (explicit)
          if (type.multi && type.representName)
            state.tag = type.representName(object);
          else
            state.tag = type.tag;
        else
          state.tag = "?";
        if (type.represent) {
          const style = state.styleMap[type.tag] || type.defaultStyle;
          let _result;
          if (_toString.call(type.represent) === "[object Function]")
            _result = type.represent(object, style);
          else if (_hasOwnProperty.call(type.represent, style))
            _result = type.represent[style](object, style);
          else
            throw new YAMLException("!<" + type.tag + '> tag resolver accepts not "' + style + '" style');
          state.dump = _result;
        }
        return true;
      }
    }
    return false;
  }
  function writeNode(state, level, object, block, compact, iskey, isblockseq) {
    state.tag = null;
    state.dump = object;
    if (!detectType(state, object, false))
      detectType(state, object, true);
    const type = _toString.call(state.dump);
    const inblock = block;
    if (block)
      block = state.flowLevel < 0 || state.flowLevel > level;
    const objectOrArray = type === "[object Object]" || type === "[object Array]";
    let duplicateIndex;
    let duplicate;
    if (objectOrArray) {
      duplicateIndex = state.duplicates.indexOf(object);
      duplicate = duplicateIndex !== -1;
    }
    if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0)
      compact = false;
    if (duplicate && state.usedDuplicates[duplicateIndex])
      state.dump = "*ref_" + duplicateIndex;
    else {
      if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex])
        state.usedDuplicates[duplicateIndex] = true;
      if (type === "[object Object]")
        if (block && Object.keys(state.dump).length !== 0) {
          writeBlockMapping(state, level, state.dump, compact);
          if (duplicate)
            state.dump = "&ref_" + duplicateIndex + state.dump;
        } else {
          writeFlowMapping(state, level, state.dump);
          if (duplicate)
            state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      else if (type === "[object Array]")
        if (block && state.dump.length !== 0) {
          if (state.noArrayIndent && !isblockseq && level > 0)
            writeBlockSequence(state, level - 1, state.dump, compact);
          else
            writeBlockSequence(state, level, state.dump, compact);
          if (duplicate)
            state.dump = "&ref_" + duplicateIndex + state.dump;
        } else {
          writeFlowSequence(state, level, state.dump);
          if (duplicate)
            state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      else if (type === "[object String]") {
        if (state.tag !== "?")
          writeScalar(state, state.dump, level, iskey, inblock);
      } else if (type === "[object Undefined]")
        return false;
      else {
        if (state.skipInvalid)
          return false;
        throw new YAMLException("unacceptable kind of an object to dump " + type);
      }
      if (state.tag !== null && state.tag !== "?") {
        let tagStr = encodeURI(state.tag[0] === "!" ? state.tag.slice(1) : state.tag).replace(/!/g, "%21");
        if (state.tag[0] === "!")
          tagStr = "!" + tagStr;
        else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:")
          tagStr = "!!" + tagStr.slice(18);
        else
          tagStr = "!<" + tagStr + ">";
        state.dump = tagStr + " " + state.dump;
      }
    }
    return true;
  }
  function getDuplicateReferences(object, state) {
    const objects = [];
    const duplicatesIndexes = [];
    inspectNode(object, objects, duplicatesIndexes);
    const length = duplicatesIndexes.length;
    for (let index = 0;index < length; index += 1)
      state.duplicates.push(objects[duplicatesIndexes[index]]);
    state.usedDuplicates = new Array(length);
  }
  function inspectNode(object, objects, duplicatesIndexes) {
    if (object !== null && typeof object === "object") {
      const index = objects.indexOf(object);
      if (index !== -1) {
        if (duplicatesIndexes.indexOf(index) === -1)
          duplicatesIndexes.push(index);
      } else {
        objects.push(object);
        if (Array.isArray(object))
          for (let i = 0, length = object.length;i < length; i += 1)
            inspectNode(object[i], objects, duplicatesIndexes);
        else {
          const objectKeyList = Object.keys(object);
          for (let i = 0, length = objectKeyList.length;i < length; i += 1)
            inspectNode(object[objectKeyList[i]], objects, duplicatesIndexes);
        }
      }
    }
  }
  function dump(input, options) {
    options = options || {};
    const state = new State(options);
    if (!state.noRefs)
      getDuplicateReferences(input, state);
    let value = input;
    if (state.replacer)
      value = state.replacer.call({ "": value }, "", value);
    if (writeNode(state, 0, value, true, true))
      return state.dump + `
`;
    return "";
  }
  module.exports.dump = dump;
});
var import_js_yaml = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin((exports, module) => {
  var loader = require_loader();
  var dumper = require_dumper();
  function renamed(from, to) {
    return function() {
      throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
    };
  }
  module.exports.Type = require_type();
  module.exports.Schema = require_schema();
  module.exports.FAILSAFE_SCHEMA = require_failsafe();
  module.exports.JSON_SCHEMA = require_json();
  module.exports.CORE_SCHEMA = require_core();
  module.exports.DEFAULT_SCHEMA = require_default();
  module.exports.load = loader.load;
  module.exports.loadAll = loader.loadAll;
  module.exports.dump = dumper.dump;
  module.exports.YAMLException = require_exception();
  module.exports.types = {
    binary: require_binary(),
    float: require_float(),
    map: require_map(),
    null: require_null(),
    pairs: require_pairs(),
    set: require_set(),
    timestamp: require_timestamp(),
    bool: require_bool(),
    int: require_int(),
    merge: require_merge(),
    omap: require_omap(),
    seq: require_seq(),
    str: require_str()
  };
  module.exports.safeLoad = renamed("safeLoad", "load");
  module.exports.safeLoadAll = renamed("safeLoadAll", "loadAll");
  module.exports.safeDump = renamed("safeDump", "dump");
}))(), 1);
var { Type, Schema, FAILSAFE_SCHEMA, JSON_SCHEMA, CORE_SCHEMA, DEFAULT_SCHEMA, load, loadAll, dump, YAMLException, types, safeLoad, safeLoadAll, safeDump } = import_js_yaml.default;
var index_vite_proxy_tmp_default = import_js_yaml.default;
// node_modules/.bun/jsonc-parser@3.3.1/node_modules/jsonc-parser/lib/esm/impl/scanner.js
var CharacterCodes;
(function(CharacterCodes2) {
  CharacterCodes2[CharacterCodes2["lineFeed"] = 10] = "lineFeed";
  CharacterCodes2[CharacterCodes2["carriageReturn"] = 13] = "carriageReturn";
  CharacterCodes2[CharacterCodes2["space"] = 32] = "space";
  CharacterCodes2[CharacterCodes2["_0"] = 48] = "_0";
  CharacterCodes2[CharacterCodes2["_1"] = 49] = "_1";
  CharacterCodes2[CharacterCodes2["_2"] = 50] = "_2";
  CharacterCodes2[CharacterCodes2["_3"] = 51] = "_3";
  CharacterCodes2[CharacterCodes2["_4"] = 52] = "_4";
  CharacterCodes2[CharacterCodes2["_5"] = 53] = "_5";
  CharacterCodes2[CharacterCodes2["_6"] = 54] = "_6";
  CharacterCodes2[CharacterCodes2["_7"] = 55] = "_7";
  CharacterCodes2[CharacterCodes2["_8"] = 56] = "_8";
  CharacterCodes2[CharacterCodes2["_9"] = 57] = "_9";
  CharacterCodes2[CharacterCodes2["a"] = 97] = "a";
  CharacterCodes2[CharacterCodes2["b"] = 98] = "b";
  CharacterCodes2[CharacterCodes2["c"] = 99] = "c";
  CharacterCodes2[CharacterCodes2["d"] = 100] = "d";
  CharacterCodes2[CharacterCodes2["e"] = 101] = "e";
  CharacterCodes2[CharacterCodes2["f"] = 102] = "f";
  CharacterCodes2[CharacterCodes2["g"] = 103] = "g";
  CharacterCodes2[CharacterCodes2["h"] = 104] = "h";
  CharacterCodes2[CharacterCodes2["i"] = 105] = "i";
  CharacterCodes2[CharacterCodes2["j"] = 106] = "j";
  CharacterCodes2[CharacterCodes2["k"] = 107] = "k";
  CharacterCodes2[CharacterCodes2["l"] = 108] = "l";
  CharacterCodes2[CharacterCodes2["m"] = 109] = "m";
  CharacterCodes2[CharacterCodes2["n"] = 110] = "n";
  CharacterCodes2[CharacterCodes2["o"] = 111] = "o";
  CharacterCodes2[CharacterCodes2["p"] = 112] = "p";
  CharacterCodes2[CharacterCodes2["q"] = 113] = "q";
  CharacterCodes2[CharacterCodes2["r"] = 114] = "r";
  CharacterCodes2[CharacterCodes2["s"] = 115] = "s";
  CharacterCodes2[CharacterCodes2["t"] = 116] = "t";
  CharacterCodes2[CharacterCodes2["u"] = 117] = "u";
  CharacterCodes2[CharacterCodes2["v"] = 118] = "v";
  CharacterCodes2[CharacterCodes2["w"] = 119] = "w";
  CharacterCodes2[CharacterCodes2["x"] = 120] = "x";
  CharacterCodes2[CharacterCodes2["y"] = 121] = "y";
  CharacterCodes2[CharacterCodes2["z"] = 122] = "z";
  CharacterCodes2[CharacterCodes2["A"] = 65] = "A";
  CharacterCodes2[CharacterCodes2["B"] = 66] = "B";
  CharacterCodes2[CharacterCodes2["C"] = 67] = "C";
  CharacterCodes2[CharacterCodes2["D"] = 68] = "D";
  CharacterCodes2[CharacterCodes2["E"] = 69] = "E";
  CharacterCodes2[CharacterCodes2["F"] = 70] = "F";
  CharacterCodes2[CharacterCodes2["G"] = 71] = "G";
  CharacterCodes2[CharacterCodes2["H"] = 72] = "H";
  CharacterCodes2[CharacterCodes2["I"] = 73] = "I";
  CharacterCodes2[CharacterCodes2["J"] = 74] = "J";
  CharacterCodes2[CharacterCodes2["K"] = 75] = "K";
  CharacterCodes2[CharacterCodes2["L"] = 76] = "L";
  CharacterCodes2[CharacterCodes2["M"] = 77] = "M";
  CharacterCodes2[CharacterCodes2["N"] = 78] = "N";
  CharacterCodes2[CharacterCodes2["O"] = 79] = "O";
  CharacterCodes2[CharacterCodes2["P"] = 80] = "P";
  CharacterCodes2[CharacterCodes2["Q"] = 81] = "Q";
  CharacterCodes2[CharacterCodes2["R"] = 82] = "R";
  CharacterCodes2[CharacterCodes2["S"] = 83] = "S";
  CharacterCodes2[CharacterCodes2["T"] = 84] = "T";
  CharacterCodes2[CharacterCodes2["U"] = 85] = "U";
  CharacterCodes2[CharacterCodes2["V"] = 86] = "V";
  CharacterCodes2[CharacterCodes2["W"] = 87] = "W";
  CharacterCodes2[CharacterCodes2["X"] = 88] = "X";
  CharacterCodes2[CharacterCodes2["Y"] = 89] = "Y";
  CharacterCodes2[CharacterCodes2["Z"] = 90] = "Z";
  CharacterCodes2[CharacterCodes2["asterisk"] = 42] = "asterisk";
  CharacterCodes2[CharacterCodes2["backslash"] = 92] = "backslash";
  CharacterCodes2[CharacterCodes2["closeBrace"] = 125] = "closeBrace";
  CharacterCodes2[CharacterCodes2["closeBracket"] = 93] = "closeBracket";
  CharacterCodes2[CharacterCodes2["colon"] = 58] = "colon";
  CharacterCodes2[CharacterCodes2["comma"] = 44] = "comma";
  CharacterCodes2[CharacterCodes2["dot"] = 46] = "dot";
  CharacterCodes2[CharacterCodes2["doubleQuote"] = 34] = "doubleQuote";
  CharacterCodes2[CharacterCodes2["minus"] = 45] = "minus";
  CharacterCodes2[CharacterCodes2["openBrace"] = 123] = "openBrace";
  CharacterCodes2[CharacterCodes2["openBracket"] = 91] = "openBracket";
  CharacterCodes2[CharacterCodes2["plus"] = 43] = "plus";
  CharacterCodes2[CharacterCodes2["slash"] = 47] = "slash";
  CharacterCodes2[CharacterCodes2["formFeed"] = 12] = "formFeed";
  CharacterCodes2[CharacterCodes2["tab"] = 9] = "tab";
})(CharacterCodes || (CharacterCodes = {}));

// node_modules/.bun/jsonc-parser@3.3.1/node_modules/jsonc-parser/lib/esm/impl/string-intern.js
var cachedSpaces = new Array(20).fill(0).map((_, index) => {
  return " ".repeat(index);
});
var maxCachedValues = 200;
var cachedBreakLinesWithSpaces = {
  " ": {
    "\n": new Array(maxCachedValues).fill(0).map((_, index) => {
      return `
` + " ".repeat(index);
    }),
    "\r": new Array(maxCachedValues).fill(0).map((_, index) => {
      return "\r" + " ".repeat(index);
    }),
    "\r\n": new Array(maxCachedValues).fill(0).map((_, index) => {
      return `\r
` + " ".repeat(index);
    })
  },
  "\t": {
    "\n": new Array(maxCachedValues).fill(0).map((_, index) => {
      return `
` + "\t".repeat(index);
    }),
    "\r": new Array(maxCachedValues).fill(0).map((_, index) => {
      return "\r" + "\t".repeat(index);
    }),
    "\r\n": new Array(maxCachedValues).fill(0).map((_, index) => {
      return `\r
` + "\t".repeat(index);
    })
  }
};

// node_modules/.bun/jsonc-parser@3.3.1/node_modules/jsonc-parser/lib/esm/impl/parser.js
var ParseOptions;
(function(ParseOptions2) {
  ParseOptions2.DEFAULT = {
    allowTrailingComma: false
  };
})(ParseOptions || (ParseOptions = {}));

// node_modules/.bun/jsonc-parser@3.3.1/node_modules/jsonc-parser/lib/esm/main.js
var ScanError;
(function(ScanError2) {
  ScanError2[ScanError2["None"] = 0] = "None";
  ScanError2[ScanError2["UnexpectedEndOfComment"] = 1] = "UnexpectedEndOfComment";
  ScanError2[ScanError2["UnexpectedEndOfString"] = 2] = "UnexpectedEndOfString";
  ScanError2[ScanError2["UnexpectedEndOfNumber"] = 3] = "UnexpectedEndOfNumber";
  ScanError2[ScanError2["InvalidUnicode"] = 4] = "InvalidUnicode";
  ScanError2[ScanError2["InvalidEscapeCharacter"] = 5] = "InvalidEscapeCharacter";
  ScanError2[ScanError2["InvalidCharacter"] = 6] = "InvalidCharacter";
})(ScanError || (ScanError = {}));
var SyntaxKind;
(function(SyntaxKind2) {
  SyntaxKind2[SyntaxKind2["OpenBraceToken"] = 1] = "OpenBraceToken";
  SyntaxKind2[SyntaxKind2["CloseBraceToken"] = 2] = "CloseBraceToken";
  SyntaxKind2[SyntaxKind2["OpenBracketToken"] = 3] = "OpenBracketToken";
  SyntaxKind2[SyntaxKind2["CloseBracketToken"] = 4] = "CloseBracketToken";
  SyntaxKind2[SyntaxKind2["CommaToken"] = 5] = "CommaToken";
  SyntaxKind2[SyntaxKind2["ColonToken"] = 6] = "ColonToken";
  SyntaxKind2[SyntaxKind2["NullKeyword"] = 7] = "NullKeyword";
  SyntaxKind2[SyntaxKind2["TrueKeyword"] = 8] = "TrueKeyword";
  SyntaxKind2[SyntaxKind2["FalseKeyword"] = 9] = "FalseKeyword";
  SyntaxKind2[SyntaxKind2["StringLiteral"] = 10] = "StringLiteral";
  SyntaxKind2[SyntaxKind2["NumericLiteral"] = 11] = "NumericLiteral";
  SyntaxKind2[SyntaxKind2["LineCommentTrivia"] = 12] = "LineCommentTrivia";
  SyntaxKind2[SyntaxKind2["BlockCommentTrivia"] = 13] = "BlockCommentTrivia";
  SyntaxKind2[SyntaxKind2["LineBreakTrivia"] = 14] = "LineBreakTrivia";
  SyntaxKind2[SyntaxKind2["Trivia"] = 15] = "Trivia";
  SyntaxKind2[SyntaxKind2["Unknown"] = 16] = "Unknown";
  SyntaxKind2[SyntaxKind2["EOF"] = 17] = "EOF";
})(SyntaxKind || (SyntaxKind = {}));
var ParseErrorCode;
(function(ParseErrorCode2) {
  ParseErrorCode2[ParseErrorCode2["InvalidSymbol"] = 1] = "InvalidSymbol";
  ParseErrorCode2[ParseErrorCode2["InvalidNumberFormat"] = 2] = "InvalidNumberFormat";
  ParseErrorCode2[ParseErrorCode2["PropertyNameExpected"] = 3] = "PropertyNameExpected";
  ParseErrorCode2[ParseErrorCode2["ValueExpected"] = 4] = "ValueExpected";
  ParseErrorCode2[ParseErrorCode2["ColonExpected"] = 5] = "ColonExpected";
  ParseErrorCode2[ParseErrorCode2["CommaExpected"] = 6] = "CommaExpected";
  ParseErrorCode2[ParseErrorCode2["CloseBraceExpected"] = 7] = "CloseBraceExpected";
  ParseErrorCode2[ParseErrorCode2["CloseBracketExpected"] = 8] = "CloseBracketExpected";
  ParseErrorCode2[ParseErrorCode2["EndOfFileExpected"] = 9] = "EndOfFileExpected";
  ParseErrorCode2[ParseErrorCode2["InvalidCommentToken"] = 10] = "InvalidCommentToken";
  ParseErrorCode2[ParseErrorCode2["UnexpectedEndOfComment"] = 11] = "UnexpectedEndOfComment";
  ParseErrorCode2[ParseErrorCode2["UnexpectedEndOfString"] = 12] = "UnexpectedEndOfString";
  ParseErrorCode2[ParseErrorCode2["UnexpectedEndOfNumber"] = 13] = "UnexpectedEndOfNumber";
  ParseErrorCode2[ParseErrorCode2["InvalidUnicode"] = 14] = "InvalidUnicode";
  ParseErrorCode2[ParseErrorCode2["InvalidEscapeCharacter"] = 15] = "InvalidEscapeCharacter";
  ParseErrorCode2[ParseErrorCode2["InvalidCharacter"] = 16] = "InvalidCharacter";
})(ParseErrorCode || (ParseErrorCode = {}));

// packages/utils/src/jsonc-parser.ts
var pluginConfigFileDetectionCache = new Map;
// src/shared/command-executor/execute-command.ts
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
// src/shared/file-reference-resolver.ts
init_logger();
// src/shared/model-sanitizer.ts
init_src();

// src/shared/index.ts
init_logger();
// src/shared/pattern-matcher.ts
var regexCache = new Map;
// src/shared/context-limit-resolver.ts
init_src();

// src/shared/context-window-usage.ts
init_logger();

// src/shared/normalize-sdk-response.ts
function normalizeSDKResponse(response, fallback, options) {
  if (response == null) {
    return fallback;
  }
  if (Array.isArray(response)) {
    return response;
  }
  if (typeof response === "object" && "data" in response) {
    const data = response.data;
    if (data != null) {
      return data;
    }
    if (options?.preferResponseOnMissingData === true) {
      return response;
    }
    return fallback;
  }
  if (options?.preferResponseOnMissingData === true) {
    return response;
  }
  return fallback;
}

// src/shared/context-window-usage.ts
var usageCacheByClient = new WeakMap;
// src/shared/data-path.ts
init_plugin_identity();
import * as path2 from "path";
import * as os2 from "os";
import { accessSync, constants, mkdirSync } from "fs";
function resolveWritableDirectory(preferredDir, fallbackSuffix) {
  try {
    mkdirSync(preferredDir, { recursive: true });
    accessSync(preferredDir, constants.W_OK);
    return preferredDir;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
    const fallbackDir = path2.join(os2.tmpdir(), fallbackSuffix);
    mkdirSync(fallbackDir, { recursive: true });
    return fallbackDir;
  }
}
function getDataDir() {
  const preferredDir = process.env.XDG_DATA_HOME ?? path2.join(os2.homedir(), ".local", "share");
  return resolveWritableDirectory(preferredDir, "opencode-data");
}
function getOpenCodeStorageDir() {
  return path2.join(getDataDir(), "opencode", "storage");
}
function getCacheDir() {
  const preferredDir = process.env.XDG_CACHE_HOME ?? path2.join(os2.homedir(), ".cache");
  return resolveWritableDirectory(preferredDir, "opencode-cache");
}
function getOmoOpenCodeCacheDir() {
  return path2.join(getCacheDir(), CACHE_DIR_NAME);
}
// src/shared/migration/agent-names.ts
var BUILTIN_AGENT_NAMES = new Set([
  "sisyphus",
  "oracle",
  "librarian",
  "explore",
  "multimodal-looker",
  "metis",
  "momus",
  "prometheus",
  "atlas",
  "build"
]);
// src/shared/migration/model-versions.ts
var CURRENT_USER_SELECTABLE_MODELS = new Set([
  "anthropic/claude-opus-4-5",
  "anthropic/claude-opus-4-6",
  "anthropic/claude-sonnet-4-5"
]);
// src/shared/migration/config-migration.ts
init_logger();

// src/shared/tolerant-fsync.ts
init_logger();
var TOLERATED_FSYNC_CODES = new Set([
  "EPERM",
  "EACCES",
  "ENOTSUP",
  "EINVAL"
]);

// src/shared/migration/migrations-sidecar.ts
init_logger();
// src/shared/opencode-config-dir.ts
init_plugin_identity();
// src/shared/resolve-agent-definition-paths.ts
init_logger();
// src/shared/opencode-version.ts
import { execSync } from "child_process";
import { existsSync as existsSync2, readFileSync, realpathSync } from "fs";
import { dirname, join as join3 } from "path";
var OPENCODE_SQLITE_VERSION = "1.1.53";
var NOT_CACHED = Symbol("NOT_CACHED");
var cachedVersion = NOT_CACHED;
var defaultDeps = {
  execCommand: (command, options) => execSync(command, options),
  getBinaryPath: () => {
    const envPath = process.env.OPENCODE_BIN_PATH;
    if (envPath)
      return envPath;
    return globalThis.Bun?.which("opencode") ?? null;
  },
  exists: existsSync2,
  realpath: realpathSync,
  readText: (filePath) => readFileSync(filePath, "utf-8")
};
function parseVersion(version) {
  const cleaned = version.replace(/^v/, "").split("-")[0];
  return cleaned.split(".").map((n) => parseInt(n, 10) || 0);
}
function compareVersions(a, b) {
  const partsA = parseVersion(a);
  const partsB = parseVersion(b);
  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0;i < maxLen; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA < numB)
      return -1;
    if (numA > numB)
      return 1;
  }
  return 0;
}
function isRecord3(value) {
  return typeof value === "object" && value !== null;
}
function parsePackageVersion(content) {
  try {
    const parsed = JSON.parse(content);
    if (!isRecord3(parsed))
      return null;
    const name = parsed.name;
    const version = parsed.version;
    if (typeof name !== "string" || !name.includes("opencode"))
      return null;
    if (typeof version !== "string" || version.length === 0)
      return null;
    return version;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
    return null;
  }
}
function getPackageVersionFromBinary(binaryPath, deps) {
  try {
    const realBinaryPath = deps.realpath(binaryPath);
    const packagePath = join3(dirname(dirname(realBinaryPath)), "package.json");
    if (!deps.exists(packagePath))
      return null;
    return parsePackageVersion(deps.readText(packagePath));
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
    return null;
  }
}
function getOpenCodeVersion(deps = {}) {
  if (cachedVersion !== NOT_CACHED) {
    return cachedVersion;
  }
  const resolvedDeps = { ...defaultDeps, ...deps };
  const binaryPath = resolvedDeps.getBinaryPath();
  if (binaryPath) {
    const packageVersion = getPackageVersionFromBinary(binaryPath, resolvedDeps);
    if (packageVersion) {
      cachedVersion = packageVersion;
      return cachedVersion;
    }
  }
  try {
    const result = resolvedDeps.execCommand("opencode --version", {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    const versionMatch = result.match(/(\d+\.\d+\.\d+(?:-[\w.]+)?)/);
    cachedVersion = versionMatch?.[1] ?? null;
    return cachedVersion;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
    cachedVersion = null;
    return null;
  }
}
function isOpenCodeVersionAtLeast(version) {
  const current = getOpenCodeVersion();
  if (!current)
    return true;
  return compareVersions(current, version) >= 0;
}
// src/shared/opencode-storage-detection.ts
import { existsSync as existsSync3 } from "fs";
import { join as join4 } from "path";
var NOT_CACHED2 = Symbol("NOT_CACHED");
var FALSE_PENDING_RETRY = Symbol("FALSE_PENDING_RETRY");
var cachedResult = NOT_CACHED2;
function isSqliteBackend() {
  if (cachedResult === true)
    return true;
  if (cachedResult === false)
    return false;
  const check = () => {
    const versionOk = isOpenCodeVersionAtLeast(OPENCODE_SQLITE_VERSION);
    const dbPath = join4(getDataDir(), "opencode", "opencode.db");
    return versionOk && existsSync3(dbPath);
  };
  if (cachedResult === FALSE_PENDING_RETRY) {
    const result2 = check();
    cachedResult = result2;
    return result2;
  }
  const result = check();
  if (result) {
    cachedResult = true;
  } else {
    cachedResult = FALSE_PENDING_RETRY;
  }
  return result;
}
// src/shared/load-opencode-plugins.ts
var opencodePluginsCache = new Map;

// src/shared/external-plugin-detector.ts
init_logger();
init_plugin_identity();
// src/shared/zip-extractor.ts
init_bun_spawn_shim();

// src/shared/zip-entry-listing/python-zip-entry-listing.ts
init_bun_spawn_shim();
// src/shared/zip-entry-listing/powershell-zip-entry-listing.ts
init_bun_spawn_shim();
// src/shared/zip-entry-listing/tar-zip-entry-listing.ts
init_bun_spawn_shim();
init_logger();
// src/shared/zip-entry-listing/zipinfo-zip-entry-listing.ts
init_bun_spawn_shim();

// src/shared/zip-entry-listing/read-zip-symlink-target.ts
init_bun_spawn_shim();
// src/shared/binary-downloader.ts
init_bun_spawn_shim();
// src/shared/agent-variant.ts
init_agent_display_names();

// src/shared/model-requirements.ts
init_src();
// src/shared/session-cursor.ts
var sessionCursors = new Map;
// src/shared/system-directive.ts
var SYSTEM_DIRECTIVE_PREFIX = "[SYSTEM DIRECTIVE: OH-MY-OPENCODE";
var SYSTEM_DIRECTIVE_LEADING_KEYWORD_PATTERN = /^\s*(?:ultrawork|ulw)\s+/i;
function createSystemDirective(type) {
  return `${SYSTEM_DIRECTIVE_PREFIX} - ${type}]`;
}
function isSystemDirective(text) {
  const trimmed = text.trimStart();
  if (trimmed.startsWith(SYSTEM_DIRECTIVE_PREFIX)) {
    return true;
  }
  const withoutLeadingKeyword = trimmed.replace(SYSTEM_DIRECTIVE_LEADING_KEYWORD_PATTERN, "");
  return withoutLeadingKeyword.startsWith(SYSTEM_DIRECTIVE_PREFIX);
}
var SystemDirectiveTypes = {
  TODO_CONTINUATION: "TODO CONTINUATION",
  RALPH_LOOP: "RALPH LOOP",
  BOULDER_CONTINUATION: "BOULDER CONTINUATION",
  DELEGATION_REQUIRED: "DELEGATION REQUIRED",
  SINGLE_TASK_ONLY: "SINGLE TASK ONLY",
  COMPACTION_CONTEXT: "COMPACTION CONTEXT",
  CONTEXT_WINDOW_MONITOR: "CONTEXT WINDOW MONITOR",
  PROMETHEUS_READ_ONLY: "PROMETHEUS READ-ONLY"
};
// src/shared/agent-tool-restrictions.ts
init_agent_display_names();
// src/shared/model-resolver.ts
init_src();

// src/shared/connected-providers-cache.ts
init_logger();

// src/shared/json-file-cache-store.ts
init_logger();
import { existsSync as existsSync4, mkdirSync as mkdirSync2, readFileSync as readFileSync2, writeFileSync } from "fs";
import { join as join5 } from "path";
function toLogLabel(cacheLabel) {
  return cacheLabel.toLowerCase();
}
function createJsonFileCacheStore(options) {
  let memoryValue;
  let writtenInCurrentProcess = false;
  function getCacheFilePath() {
    return join5(options.getCacheDir(), options.filename);
  }
  function ensureCacheDir() {
    const cacheDir = options.getCacheDir();
    if (!existsSync4(cacheDir)) {
      mkdirSync2(cacheDir, { recursive: true });
    }
  }
  function read() {
    if (memoryValue !== undefined) {
      return memoryValue;
    }
    const cacheFile = getCacheFilePath();
    if (!existsSync4(cacheFile)) {
      memoryValue = null;
      log(`[${options.logPrefix}] ${options.cacheLabel} file not found`, { cacheFile });
      return null;
    }
    try {
      const content = readFileSync2(cacheFile, "utf-8");
      const value = JSON.parse(content);
      memoryValue = value;
      log(`[${options.logPrefix}] Read ${toLogLabel(options.cacheLabel)}`, options.describe(value));
      return value;
    } catch (error) {
      memoryValue = null;
      log(`[${options.logPrefix}] Error reading ${toLogLabel(options.cacheLabel)}`, {
        error: String(error)
      });
      return null;
    }
  }
  function has() {
    if (memoryValue !== undefined && memoryValue !== null) {
      return true;
    }
    if (writtenInCurrentProcess) {
      return true;
    }
    return existsSync4(getCacheFilePath());
  }
  function write(value) {
    ensureCacheDir();
    const cacheFile = getCacheFilePath();
    try {
      writeFileSync(cacheFile, options.serialize?.(value) ?? JSON.stringify(value, null, 2));
      memoryValue = value;
      writtenInCurrentProcess = true;
      log(`[${options.logPrefix}] ${options.cacheLabel} written`, options.describe(value));
    } catch (error) {
      log(`[${options.logPrefix}] Error writing ${toLogLabel(options.cacheLabel)}`, {
        error: String(error)
      });
    }
  }
  function resetMemory() {
    memoryValue = undefined;
    writtenInCurrentProcess = false;
  }
  return {
    read,
    has,
    write,
    resetMemory
  };
}

// src/shared/connected-providers-cache.ts
var providerModelsCacheWrittenInCurrentProcess = false;
var CONNECTED_PROVIDERS_CACHE_FILE = "connected-providers.json";
var PROVIDER_MODELS_CACHE_FILE = "provider-models.json";
function isRecord4(value) {
  return typeof value === "object" && value !== null;
}
function createConnectedProvidersCacheStore(getCacheDir2 = getOmoOpenCodeCacheDir) {
  const connectedProvidersCacheStore = createJsonFileCacheStore({
    getCacheDir: getCacheDir2,
    filename: CONNECTED_PROVIDERS_CACHE_FILE,
    logPrefix: "connected-providers-cache",
    cacheLabel: "Cache",
    describe: (value) => ({ count: value.connected.length, updatedAt: value.updatedAt })
  });
  const providerModelsCacheStore = createJsonFileCacheStore({
    getCacheDir: getCacheDir2,
    filename: PROVIDER_MODELS_CACHE_FILE,
    logPrefix: "connected-providers-cache",
    cacheLabel: "Provider-models cache",
    describe: (value) => ({
      providerCount: Object.keys(value.models).length,
      updatedAt: value.updatedAt
    })
  });
  function readConnectedProvidersCache() {
    return connectedProvidersCacheStore.read()?.connected ?? null;
  }
  function hasConnectedProvidersCache() {
    return connectedProvidersCacheStore.has();
  }
  function writeConnectedProvidersCache(connected) {
    connectedProvidersCacheStore.write({
      connected,
      updatedAt: new Date().toISOString()
    });
  }
  function readProviderModelsCache() {
    return providerModelsCacheStore.read();
  }
  function hasProviderModelsCache() {
    if (providerModelsCacheWrittenInCurrentProcess) {
      return true;
    }
    return providerModelsCacheStore.has();
  }
  function writeProviderModelsCache(data) {
    providerModelsCacheStore.write({
      ...data,
      updatedAt: new Date().toISOString()
    });
    providerModelsCacheWrittenInCurrentProcess = true;
  }
  async function updateConnectedProvidersCache(client) {
    if (!client?.provider?.list) {
      log("[connected-providers-cache] client.provider.list not available");
      return;
    }
    try {
      const result = await client.provider.list();
      const connected = result.data?.connected ?? [];
      log("[connected-providers-cache] Fetched connected providers", {
        count: connected.length,
        providers: connected
      });
      writeConnectedProvidersCache(connected);
      const modelsByProvider = {};
      const allProviders = result.data?.all ?? [];
      for (const provider of allProviders) {
        if (provider.models) {
          const modelMetadata = Object.entries(provider.models).map(([modelID, rawMetadata]) => {
            if (!isRecord4(rawMetadata)) {
              return { id: modelID };
            }
            const normalizedID = typeof rawMetadata.id === "string" ? rawMetadata.id : modelID;
            return {
              ...rawMetadata,
              id: normalizedID
            };
          });
          if (modelMetadata.length > 0) {
            modelsByProvider[provider.id] = modelMetadata;
          }
        }
      }
      log("[connected-providers-cache] Extracted models from provider list", {
        providerCount: Object.keys(modelsByProvider).length,
        totalModels: Object.values(modelsByProvider).reduce((sum, ids) => sum + ids.length, 0)
      });
      writeProviderModelsCache({
        models: modelsByProvider,
        connected
      });
    } catch (err) {
      log("[connected-providers-cache] Error updating cache", { error: String(err) });
    }
  }
  function _resetMemCacheForTesting() {
    connectedProvidersCacheStore.resetMemory();
    providerModelsCacheStore.resetMemory();
    providerModelsCacheWrittenInCurrentProcess = false;
  }
  return {
    readConnectedProvidersCache,
    hasConnectedProvidersCache,
    readProviderModelsCache,
    hasProviderModelsCache,
    writeProviderModelsCache,
    updateConnectedProvidersCache,
    _resetMemCacheForTesting
  };
}
var defaultConnectedProvidersCacheStore = createConnectedProvidersCacheStore(() => getOmoOpenCodeCacheDir());
// src/shared/model-normalization.ts
init_src();
// src/shared/model-resolution-pipeline.ts
init_src();
// src/shared/model-availability.ts
init_logger();
// src/shared/model-capabilities/index.ts
init_src();
// src/shared/model-capabilities-cache.ts
init_src();
var MODEL_CAPABILITIES_CACHE_FILE = "model-capabilities.json";
function createModelCapabilitiesCacheStore(getCacheDir2 = getOmoOpenCodeCacheDir) {
  const snapshotCacheStore = createJsonFileCacheStore({
    getCacheDir: getCacheDir2,
    filename: MODEL_CAPABILITIES_CACHE_FILE,
    logPrefix: "model-capabilities-cache",
    cacheLabel: "Cache",
    describe: (snapshot) => ({
      modelCount: Object.keys(snapshot.models).length,
      generatedAt: snapshot.generatedAt
    }),
    serialize: (snapshot) => `${JSON.stringify(snapshot, null, 2)}
`
  });
  function readModelCapabilitiesCache() {
    return snapshotCacheStore.read();
  }
  function hasModelCapabilitiesCache() {
    return snapshotCacheStore.has();
  }
  function writeModelCapabilitiesCache(snapshot) {
    snapshotCacheStore.write(snapshot);
  }
  async function refreshModelCapabilitiesCache(args = {}) {
    const snapshot = await fetchModelCapabilitiesSnapshot(args);
    writeModelCapabilitiesCache(snapshot);
    return snapshot;
  }
  return {
    readModelCapabilitiesCache,
    hasModelCapabilitiesCache,
    writeModelCapabilitiesCache,
    refreshModelCapabilitiesCache
  };
}
var defaultModelCapabilitiesCacheStore = createModelCapabilitiesCacheStore(() => getOmoOpenCodeCacheDir());
// src/shared/model-settings-compatibility.ts
init_src();
// src/shared/fallback-model-availability.ts
init_logger();
// src/features/hook-message-injector/json-message-lookup.ts
import { readFileSync as readFileSync4, readdirSync as readdirSync2 } from "fs";
import { join as join8 } from "path";

// src/shared/compaction-marker.ts
import { existsSync as existsSync5, readdirSync, readFileSync as readFileSync3 } from "fs";
import { join as join7 } from "path";

// src/shared/opencode-storage-paths.ts
import { join as join6 } from "path";
var OPENCODE_STORAGE = getOpenCodeStorageDir();
var MESSAGE_STORAGE = join6(OPENCODE_STORAGE, "message");
var PART_STORAGE = join6(OPENCODE_STORAGE, "part");
var SESSION_STORAGE = join6(OPENCODE_STORAGE, "session");

// src/shared/compaction-marker.ts
function isCompactionPart(part) {
  return typeof part === "object" && part !== null && part.type === "compaction";
}
function isCompactionAgent(agent) {
  return typeof agent === "string" && agent.trim().toLowerCase() === "compaction";
}
function hasCompactionPart(parts) {
  return Array.isArray(parts) && parts.some((part) => isCompactionPart(part));
}
function isCompactionMessage(message) {
  return isCompactionAgent(message.info?.agent ?? message.agent) || hasCompactionPart(message.parts);
}
function getCompactionPartStorageDir(messageID) {
  return join7(PART_STORAGE, messageID);
}
function hasCompactionPartInStorage(messageID) {
  if (!messageID) {
    return false;
  }
  const partDir = getCompactionPartStorageDir(messageID);
  if (!existsSync5(partDir)) {
    return false;
  }
  try {
    return readdirSync(partDir).filter((fileName) => fileName.endsWith(".json")).some((fileName) => {
      try {
        const content = readFileSync3(join7(partDir, fileName), "utf-8");
        return isCompactionPart(JSON.parse(content));
      } catch (error) {
        if (error instanceof Error) {
          return false;
        }
        return false;
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }
    return false;
  }
}

// src/features/hook-message-injector/json-message-lookup.ts
function parseToolPermission(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "allow" || value === "deny" || value === "ask") {
    return value;
  }
  return null;
}
function parseTools(value) {
  if (!isRecord(value)) {
    return;
  }
  const tools = {};
  for (const [key, rawPermission] of Object.entries(value)) {
    const permission = parseToolPermission(rawPermission);
    if (permission !== null) {
      tools[key] = permission;
    }
  }
  return tools;
}
function parseModel(value) {
  if (!isRecord(value)) {
    return;
  }
  const providerID = typeof value.providerID === "string" ? value.providerID : undefined;
  const modelID = typeof value.modelID === "string" ? value.modelID : undefined;
  const variant = typeof value.variant === "string" ? value.variant : undefined;
  return providerID || modelID || variant ? { providerID, modelID, ...variant ? { variant } : {} } : undefined;
}
function parseCreatedAt(value) {
  if (!isRecord(value)) {
    return;
  }
  return typeof value.created === "number" ? value.created : undefined;
}
function parseStoredMessageWithTime(value) {
  if (!isRecord(value)) {
    return null;
  }
  const created = parseCreatedAt(value.time);
  return {
    id: typeof value.id === "string" ? value.id : undefined,
    agent: typeof value.agent === "string" ? value.agent : undefined,
    model: parseModel(value.model),
    tools: parseTools(value.tools),
    time: created === undefined ? undefined : { created }
  };
}
function readMessageEntry(fileName, messageDir, missingCreatedAt) {
  try {
    const content = readFileSync4(join8(messageDir, fileName), "utf-8");
    const msg = parseStoredMessageWithTime(JSON.parse(content));
    if (!msg) {
      return null;
    }
    return {
      fileName,
      msg,
      hasCompactionMarker: hasCompactionPartInStorage(msg.id),
      createdAt: typeof msg.time?.created === "number" ? msg.time.created : missingCreatedAt
    };
  } catch (error) {
    if (error instanceof Error) {
      return null;
    }
    throw error;
  }
}
function getMessageEntries(messageDir, missingCreatedAt) {
  return readdirSync2(messageDir).filter((fileName) => fileName.endsWith(".json")).map((fileName) => readMessageEntry(fileName, messageDir, missingCreatedAt)).filter((entry) => entry !== null);
}
function isUsableMessageEntry(entry) {
  return !entry.hasCompactionMarker && !isCompactionMessage({ agent: entry.msg.agent });
}
function findNearestMessageWithFields(messageDir) {
  if (isSqliteBackend()) {
    return null;
  }
  try {
    const messages = getMessageEntries(messageDir, Number.NEGATIVE_INFINITY).sort((left, right) => right.createdAt - left.createdAt || right.fileName.localeCompare(left.fileName));
    for (const entry of messages) {
      if (!isUsableMessageEntry(entry)) {
        continue;
      }
      if (entry.msg.agent && entry.msg.model?.providerID && entry.msg.model?.modelID) {
        return entry.msg;
      }
    }
    for (const entry of messages) {
      if (!isUsableMessageEntry(entry)) {
        continue;
      }
      if (entry.msg.agent || entry.msg.model?.providerID && entry.msg.model?.modelID) {
        return entry.msg;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      return null;
    }
    throw error;
  }
  return null;
}

// src/features/hook-message-injector/sdk-message-lookup.ts
init_logger();
function convertSDKMessageToStoredMessage(msg) {
  if (isCompactionMessage(msg)) {
    return null;
  }
  const info = msg.info;
  if (!info)
    return null;
  const providerID = info.model?.providerID ?? info.providerID;
  const modelID = info.model?.modelID ?? info.modelID;
  const variant = info.model?.variant;
  if (!info.agent && !providerID && !modelID) {
    return null;
  }
  return {
    agent: info.agent,
    model: providerID && modelID ? { providerID, modelID, ...variant ? { variant } : {} } : undefined,
    tools: info.tools
  };
}
async function fetchSDKMessages(client, sessionID) {
  try {
    const response = await client.session.messages({ path: { id: sessionID } });
    const emptyMessages = [];
    return normalizeSDKResponse(response, emptyMessages, { preferResponseOnMissingData: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("[hook-message-injector] SDK message fetch failed", {
      sessionID,
      error: errorMessage
    });
  }
  return null;
}
function findNearestMessageWithFieldsFromMessages(messages) {
  const sortedMessages = messages.map((message) => ({
    stored: convertSDKMessageToStoredMessage(message),
    createdAt: message.info?.time?.created ?? Number.NEGATIVE_INFINITY,
    id: typeof message.id === "string" ? message.id : ""
  })).sort((left, right) => right.createdAt - left.createdAt || right.id.localeCompare(left.id));
  for (const message of sortedMessages) {
    const stored = message.stored;
    if (stored?.agent && stored.model?.providerID && stored.model?.modelID) {
      return stored;
    }
  }
  for (const message of sortedMessages) {
    const stored = message.stored;
    if (stored?.agent || stored?.model?.providerID && stored?.model?.modelID) {
      return stored;
    }
  }
  return null;
}
async function findNearestMessageWithFieldsFromSDK(client, sessionID) {
  const messages = await fetchSDKMessages(client, sessionID);
  return messages ? findNearestMessageWithFieldsFromMessages(messages) : null;
}
// src/features/hook-message-injector/id-generation.ts
import { randomBytes } from "crypto";
var processPrefix = randomBytes(4).toString("hex");
// src/shared/internal-initiator-marker.ts
var OMO_INTERNAL_INITIATOR_MARKER = "<!-- OMO_INTERNAL_INITIATOR -->";
var INTERNAL_INITIATOR_MARKER_DETECT_PATTERN = /<!--\s*OMO_INTERNAL_INITIATOR\s*-->/;
var INTERNAL_INITIATOR_MARKER_PATTERN = /\n*<!--\s*OMO_INTERNAL_INITIATOR\s*-->\s*/g;
function hasInternalInitiatorMarker(text) {
  return INTERNAL_INITIATOR_MARKER_DETECT_PATTERN.test(text);
}
function isTextPartLike(part) {
  return part.type === "text" && typeof part.text === "string";
}
function isSyntheticOrInternalTextPart(part) {
  return isTextPartLike(part) && (part.synthetic === true || hasInternalInitiatorMarker(part.text));
}
function isSyntheticOrInternalOnlyTextParts(parts) {
  const textParts = (parts ?? []).filter(isTextPartLike);
  return textParts.length > 0 && textParts.every(isSyntheticOrInternalTextPart);
}
function isSyntheticOrInternalUserMessage(message) {
  const role = message.info?.role ?? message.role;
  return role === "user" && isSyntheticOrInternalOnlyTextParts(message.parts);
}
function stripInternalInitiatorMarkers(text) {
  return text.replace(INTERNAL_INITIATOR_MARKER_PATTERN, "").trimEnd();
}
function createInternalAgentTextPart(text) {
  const cleanText = stripInternalInitiatorMarkers(text);
  return {
    type: "text",
    text: `${cleanText}
${OMO_INTERNAL_INITIATOR_MARKER}`
  };
}
function createInternalAgentContinuationTextPart(text) {
  return {
    ...createInternalAgentTextPart(text),
    synthetic: true,
    metadata: { compaction_continue: true }
  };
}

// src/features/hook-message-injector/message-injection.ts
init_logger();
// src/shared/opencode-message-dir.ts
import { existsSync as existsSync6, readdirSync as readdirSync3 } from "fs";
import { join as join9 } from "path";
init_logger();
function getMessageDir(sessionID) {
  if (!sessionID.startsWith("ses_"))
    return null;
  if (/[/\\]|\.\./.test(sessionID))
    return null;
  if (!existsSync6(MESSAGE_STORAGE))
    return null;
  const directPath = join9(MESSAGE_STORAGE, sessionID);
  if (existsSync6(directPath)) {
    return directPath;
  }
  try {
    for (const dir of readdirSync3(MESSAGE_STORAGE)) {
      const sessionPath = join9(MESSAGE_STORAGE, dir, sessionID);
      if (existsSync6(sessionPath)) {
        return sessionPath;
      }
    }
  } catch (error) {
    log("[opencode-message-dir] Failed to scan message directories", { sessionID, error: String(error) });
    return null;
  }
  return null;
}

// src/shared/session-utils.ts
init_logger();
init_agent_display_names();
// src/shared/event-session-id.ts
function getStringField(record, key) {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
function resolveSessionEventID(properties) {
  const props = isRecord(properties) ? properties : undefined;
  const info = isRecord(props?.info) ? props.info : undefined;
  return getStringField(props, "sessionID") ?? getStringField(info, "sessionID") ?? getStringField(info, "id");
}
function resolveMessageEventSessionID(properties) {
  const props = isRecord(properties) ? properties : undefined;
  const info = isRecord(props?.info) ? props.info : undefined;
  const part = isRecord(props?.part) ? props.part : undefined;
  return getStringField(props, "sessionID") ?? getStringField(info, "sessionID") ?? getStringField(part, "sessionID");
}
// src/shared/tmux/constants.ts
var SESSION_TIMEOUT_MS = 60 * 60 * 1000;
var SESSION_MISSING_GRACE_MS = 30 * 1000;

// src/shared/tmux/index.ts
init_runner();
// src/shared/tmux/tmux-utils/server-health.ts
var SERVER_RUNNING_KEY = Symbol.for("oh-my-opencode:server-running-in-process");
// src/shared/tmux/tmux-utils/pane-dimensions.ts
init_tmux_path_resolver();
// src/shared/tmux/tmux-utils/pane-spawn.ts
init_tmux_path_resolver();
// src/shared/tmux/tmux-utils/pane-replace.ts
init_tmux_path_resolver();
// src/shared/tmux/tmux-utils/pane-activate.ts
init_tmux_path_resolver();
init_logger();
init_runner();
// src/shared/tmux/tmux-utils/window-spawn.ts
init_tmux_path_resolver();
// src/shared/tmux/tmux-utils/session-spawn.ts
init_tmux_path_resolver();
// src/shared/tmux/tmux-utils/layout.ts
init_tmux_path_resolver();
// src/shared/model-suggestion-retry.ts
init_src();
init_logger();

// src/shared/prompt-async-gate.ts
init_logger();

// src/shared/session-idle-settle.ts
var DEFAULT_SESSION_IDLE_SETTLE_MS = 150;
var DEFAULT_SESSION_STATUS_TIMEOUT_MS = 5000;
function settleAfterSessionIdle(ms = DEFAULT_SESSION_IDLE_SETTLE_MS) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}
function withStatusTimeout(promise, timeoutMs) {
  let timeoutID;
  const timeoutPromise = new Promise((_resolve, reject) => {
    timeoutID = setTimeout(() => {
      reject(new Error(`session.status() timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutID !== undefined) {
      clearTimeout(timeoutID);
    }
  });
}
var ACTIVE_SESSION_STATUSES = new Set(["busy", "retry", "running"]);
function isRecord5(value) {
  return typeof value === "object" && value !== null;
}
function getSessionStatusPayload(response) {
  if (isRecord5(response) && isRecord5(response.data)) {
    return response.data;
  }
  if (isRecord5(response)) {
    return response;
  }
  return {};
}
function isActiveSessionStatusType(statusType) {
  return ACTIVE_SESSION_STATUSES.has(statusType);
}
async function isSessionActive(client, sessionID, statusTimeoutMs = DEFAULT_SESSION_STATUS_TIMEOUT_MS) {
  if (typeof client.session?.status !== "function") {
    return false;
  }
  try {
    const statusResult = await withStatusTimeout(client.session.status(), statusTimeoutMs);
    const status = getSessionStatusPayload(statusResult)[sessionID];
    if (!isRecord5(status)) {
      return false;
    }
    const statusType = status.type;
    return typeof statusType === "string" && isActiveSessionStatusType(statusType);
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }
    return false;
  }
}

// src/shared/prompt-async-gate/queue.ts
init_logger();

// src/shared/prompt-async-gate/session-idle-dispatch.ts
init_logger();

// src/shared/prompt-async-gate/pending-tool-turn.ts
init_logger();

// src/shared/prompt-async-gate/prompt-message-state.ts
function messageRole(message) {
  if (!isRecord(message)) {
    return;
  }
  const info = message.info;
  if (isRecord(info) && typeof info.role === "string") {
    return info.role;
  }
  return typeof message.role === "string" ? message.role : undefined;
}
function messageFinish(message) {
  if (!isRecord(message)) {
    return;
  }
  const info = message.info;
  if (isRecord(info)) {
    if (info.finish === true) {
      return true;
    }
    if (typeof info.finish === "string" && info.finish.length > 0) {
      return info.finish;
    }
  }
  if (message.finish === true) {
    return true;
  }
  return typeof message.finish === "string" && message.finish.length > 0 ? message.finish : undefined;
}
function messageCompleted(message) {
  if (!isRecord(message)) {
    return false;
  }
  const info = message.info;
  const time = isRecord(info) && isRecord(info.time) ? info.time : undefined;
  const completed = time?.completed;
  if (typeof completed === "number" && Number.isFinite(completed)) {
    return true;
  }
  return typeof completed === "string" && completed.length > 0;
}
function toInternalInitiatorTextPartLike(part) {
  const result = {};
  if (!isRecord(part)) {
    return result;
  }
  if (typeof part.type === "string") {
    result.type = part.type;
  }
  if (typeof part.text === "string") {
    result.text = part.text;
  }
  if (typeof part.synthetic === "boolean") {
    result.synthetic = part.synthetic;
  }
  return result;
}
function toInternalInitiatorMessageLike(message) {
  if (!isRecord(message)) {
    return;
  }
  const result = {};
  const info = message.info;
  if (isRecord(info) && typeof info.role === "string") {
    result.info = { role: info.role };
  }
  if (typeof message.role === "string") {
    result.role = message.role;
  }
  if (Array.isArray(message.parts)) {
    result.parts = message.parts.map(toInternalInitiatorTextPartLike);
  }
  return result;
}
function messageIsSyntheticOrInternalUser(message) {
  const initiatorMessage = toInternalInitiatorMessageLike(message);
  return initiatorMessage !== undefined && isSyntheticOrInternalUserMessage(initiatorMessage);
}
var QUESTION_TOOL_NAMES = new Set(["question", "ask_user_question", "askuserquestion"]);
function partToolName(part) {
  if (typeof part.name === "string") {
    return part.name;
  }
  if (typeof part.tool === "string") {
    return part.tool;
  }
  return typeof part.toolName === "string" ? part.toolName : undefined;
}
function partIsToolCall(part) {
  return part.type === "tool" || part.type === "tool_use" || part.type === "tool-call" || part.type === "tool-invocation";
}
function partIsQuestionTool(part) {
  if (!isRecord(part) || !partIsToolCall(part)) {
    return false;
  }
  const toolName = partToolName(part);
  return toolName !== undefined && QUESTION_TOOL_NAMES.has(toolName.toLowerCase());
}
function partIsUnansweredQuestionTool(part) {
  if (!partIsQuestionTool(part) || !isRecord(part)) {
    return false;
  }
  const state = part.state;
  if (!isRecord(state)) {
    return true;
  }
  return state.status !== "completed";
}
function partIsWaitingOnTool(part) {
  if (!isRecord(part)) {
    return false;
  }
  if (!partIsToolCall(part)) {
    return false;
  }
  const state = part.state;
  if (!isRecord(state)) {
    return false;
  }
  return state.status === "pending" || state.status === "running";
}
function partIsUnresolvedTool(part) {
  if (!isRecord(part) || !partIsToolCall(part)) {
    return false;
  }
  const state = part.state;
  if (!isRecord(state)) {
    return true;
  }
  return state.status !== "completed";
}
function partHasSubstantiveAssistantOutput(part) {
  if (!isRecord(part)) {
    return false;
  }
  if (part.type === "step-start" || part.type === "step-finish") {
    return false;
  }
  if (part.type === "text") {
    return typeof part.text === "string" && part.text.trim().length > 0;
  }
  return typeof part.type === "string" && part.type.length > 0;
}
function messageHasQuestionTool(message) {
  return isRecord(message) && Array.isArray(message.parts) && message.parts.some(partIsUnansweredQuestionTool);
}
function messageHasWaitingTool(message) {
  return isRecord(message) && Array.isArray(message.parts) && message.parts.some(partIsWaitingOnTool);
}
function messageHasUnresolvedTool(message) {
  return isRecord(message) && Array.isArray(message.parts) && message.parts.some(partIsUnresolvedTool);
}
function messageHasSubstantiveAssistantOutput(message) {
  return isRecord(message) && Array.isArray(message.parts) && message.parts.some(partHasSubstantiveAssistantOutput);
}

// src/shared/prompt-async-gate/message-inspection-error.ts
function isPromptMessageInspectionAborted(error) {
  if (error instanceof Error && error.name === "MessageAbortedError") {
    return true;
  }
  return isRecord(error) && error.name === "MessageAbortedError";
}

// src/shared/prompt-async-gate/timing.ts
var DEFAULT_PROMPT_ASYNC_POST_DISPATCH_HOLD_MS = 2000;
var DEFAULT_PROMPT_SEMANTIC_DEDUPE_HOLD_MS = 15000;
var DEFAULT_PROMPT_DISPATCH_TIMEOUT_MS = 30000;
var DEFAULT_PROMPT_GATE_MESSAGES_FETCH_TIMEOUT_MS = 5000;
var DEFAULT_PROMPT_QUEUE_RETRY_MS = 250;
var promptGateMessagesFetchTimeoutMsForTesting;
function getPromptGateMessagesFetchTimeoutMs() {
  return promptGateMessagesFetchTimeoutMsForTesting ?? DEFAULT_PROMPT_GATE_MESSAGES_FETCH_TIMEOUT_MS;
}
async function withDispatchTimeout(operation, dispatchTimeoutMs, operationName) {
  if (dispatchTimeoutMs <= 0) {
    return operation;
  }
  let timeoutID;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutID = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${dispatchTimeoutMs}ms`));
    }, dispatchTimeoutMs);
  });
  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutID !== undefined) {
      clearTimeout(timeoutID);
    }
  }
}

// src/shared/prompt-async-gate/pending-tool-turn.ts
function getPromptQuery(input) {
  if (!isRecord(input)) {
    return { directory: "" };
  }
  const query = input.query;
  if (!isRecord(query)) {
    return { directory: "" };
  }
  const promptQuery = { directory: "" };
  if (typeof query.directory === "string") {
    return typeof query.limit === "number" ? { directory: query.directory, limit: query.limit } : { directory: query.directory };
  }
  if (typeof query.limit === "number") {
    return { ...promptQuery, limit: query.limit };
  }
  return promptQuery;
}
function getMessagesData(response) {
  if (isRecord(response) && Array.isArray(response.data)) {
    return response.data;
  }
  return Array.isArray(response) ? response : [];
}
function latestAssistantTurnBlocksInternalPrompt(messages) {
  let sawAssistantAfterLatestUser = false;
  for (let index = messages.length - 1;index >= 0; index--) {
    const message = messages[index];
    const role = messageRole(message);
    if (role === "assistant") {
      sawAssistantAfterLatestUser = true;
      if (messageHasQuestionTool(message)) {
        return true;
      }
      const finish = messageFinish(message);
      if (finish === "tool-calls") {
        return !isRecord(message) || !Array.isArray(message.parts) || messageHasUnresolvedTool(message);
      }
      if ((finish === undefined || finish === "unknown") && !messageHasSubstantiveAssistantOutput(message)) {
        return true;
      }
      if (messageCompleted(message)) {
        return false;
      }
      if (finish === true) {
        return false;
      }
      if (finish === undefined || finish === "unknown") {
        return true;
      }
      if (!isRecord(message) || !Array.isArray(message.parts)) {
        return finish === "tool-calls";
      }
      return messageHasWaitingTool(message);
    }
    if (role === "user") {
      if (messageIsSyntheticOrInternalUser(message)) {
        if (!sawAssistantAfterLatestUser) {
          return true;
        }
        continue;
      }
      return false;
    }
  }
  return false;
}
async function sessionLatestAssistantBlocksInternalPrompt(args) {
  const session = args.client.session;
  if (typeof session?.messages !== "function") {
    return false;
  }
  const messages = session.messages.bind(session);
  try {
    const response = await withDispatchTimeout(messages({
      path: { id: args.sessionID },
      query: getPromptQuery(args.input)
    }), args.timeoutMs, `[prompt-async-gate] ${args.sessionName} session.messages`);
    return latestAssistantTurnBlocksInternalPrompt(getMessagesData(response));
  } catch (error) {
    log("[prompt-async-gate] latest assistant prompt-block check failed", {
      sessionID: args.sessionID,
      source: args.source,
      error: String(error)
    });
    return !isPromptMessageInspectionAborted(error);
  }
}

// src/shared/prompt-async-gate/recent-dispatches.ts
init_logger();
var recentPromptDispatches = new Map;
function recentDispatchKey(sessionID, dedupeKey) {
  return `${sessionID}\x00${dedupeKey}`;
}
function pruneRecentPromptDispatches(now = Date.now()) {
  for (const [key, dispatch] of recentPromptDispatches) {
    if (dispatch.expiresAt <= now) {
      recentPromptDispatches.delete(key);
    }
  }
}
function getRecentPromptDispatch(sessionID, dedupeKey) {
  pruneRecentPromptDispatches();
  return recentPromptDispatches.get(recentDispatchKey(sessionID, dedupeKey));
}
function rememberRecentPromptDispatch(args) {
  pruneRecentPromptDispatches();
  if (args.holdMs <= 0) {
    return;
  }
  recentPromptDispatches.set(recentDispatchKey(args.sessionID, args.dedupeKey), {
    source: args.source,
    expiresAt: Date.now() + args.holdMs
  });
  log("[prompt-async-gate] remembered semantic prompt dispatch", {
    sessionID: args.sessionID,
    source: args.source,
    holdMs: args.holdMs
  });
}

// src/shared/prompt-async-gate/reservations.ts
init_logger();
var promptAsyncReservations = new Map;
var expiredReservationHandler;
function setExpiredReservationHandler(handler) {
  expiredReservationHandler = handler;
}
function notifyExpiredReservation(sessionID) {
  expiredReservationHandler?.(sessionID);
}
function pruneExpiredReservations(now = Date.now()) {
  const expiredSessionIDs = [];
  for (const [sessionID, reservation] of promptAsyncReservations) {
    if (typeof reservation.expiresAt === "number" && reservation.expiresAt <= now) {
      promptAsyncReservations.delete(sessionID);
      expiredSessionIDs.push(sessionID);
      log("[prompt-async-gate] expired reservation released", {
        sessionID,
        source: reservation.source
      });
    }
  }
  for (const sessionID of expiredSessionIDs) {
    notifyExpiredReservation(sessionID);
  }
}
function getActiveReservation(sessionID) {
  pruneExpiredReservations();
  return promptAsyncReservations.get(sessionID);
}
function setPromptReservation(sessionID, reservation) {
  promptAsyncReservations.set(sessionID, reservation);
}
function finishPromptReservation(sessionID, reservation, dispatchAttempted, postDispatchHoldMs) {
  const current = promptAsyncReservations.get(sessionID);
  if (current?.token !== reservation.token) {
    return;
  }
  if (dispatchAttempted && postDispatchHoldMs > 0) {
    promptAsyncReservations.set(sessionID, {
      ...reservation,
      expiresAt: Date.now() + postDispatchHoldMs
    });
    return;
  }
  promptAsyncReservations.delete(sessionID);
}

// src/shared/prompt-async-gate/session-idle-dispatch.ts
async function dispatchAfterSessionIdle(args) {
  const {
    sessionName,
    client,
    sessionID,
    input,
    source,
    dedupeKey,
    settleMs,
    postDispatchHoldMs,
    semanticDedupeHoldMs,
    dispatchTimeoutMs,
    checkStatus,
    checkToolState,
    dispatch
  } = args;
  const existing = getActiveReservation(sessionID);
  if (existing) {
    log(`[prompt-async-gate] ${sessionName} skipped because session is reserved`, {
      sessionID,
      source,
      reservedBy: existing.source,
      reservedAgeMs: Date.now() - existing.reservedAt
    });
    return { status: "reserved", reservedBy: existing.source };
  }
  const reservation = {
    source,
    dedupeKey,
    reservedAt: Date.now(),
    token: Symbol(source)
  };
  setPromptReservation(sessionID, reservation);
  let dispatchAttempted = false;
  try {
    const canReadStatus = checkStatus && typeof client.session?.status === "function";
    if (settleMs > 0) {
      await settleAfterSessionIdle(settleMs);
    }
    let sessionActive = false;
    if (canReadStatus) {
      try {
        sessionActive = await withDispatchTimeout(isSessionActive(client, sessionID), Math.min(dispatchTimeoutMs, 5000), `[prompt-async-gate] ${sessionName} isSessionActive`);
      } catch (error) {
        if (error instanceof Error) {
          sessionActive = false;
        }
        sessionActive = false;
      }
    }
    if (sessionActive) {
      log(`[prompt-async-gate] ${sessionName} skipped because session is active`, { sessionID, source });
      return { status: "active" };
    }
    if (checkToolState && typeof client.session?.messages === "function" && await sessionLatestAssistantBlocksInternalPrompt({
      client,
      sessionID,
      input,
      sessionName,
      source,
      timeoutMs: Math.min(dispatchTimeoutMs, getPromptGateMessagesFetchTimeoutMs())
    })) {
      log(`[prompt-async-gate] ${sessionName} skipped because latest assistant is still active`, {
        sessionID,
        source
      });
      return { status: "active" };
    }
    log(`[prompt-async-gate] ${sessionName} dispatching`, { sessionID, source });
    dispatchAttempted = true;
    const response = await withDispatchTimeout(dispatch(input), dispatchTimeoutMs, `[prompt-async-gate] ${sessionName} dispatch`);
    rememberRecentPromptDispatch({
      sessionID,
      dedupeKey,
      source,
      holdMs: semanticDedupeHoldMs
    });
    log(`[prompt-async-gate] ${sessionName} dispatched`, { sessionID, source });
    return { status: "dispatched", response };
  } catch (error) {
    if (dispatchAttempted) {
      rememberRecentPromptDispatch({
        sessionID,
        dedupeKey,
        source,
        holdMs: semanticDedupeHoldMs
      });
    }
    const errorText = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    log(`[prompt-async-gate] ${sessionName} failed`, { sessionID, source, error: errorText });
    return { status: "failed", error, dispatchAttempted };
  } finally {
    finishPromptReservation(sessionID, reservation, dispatchAttempted, postDispatchHoldMs);
  }
}

// src/shared/prompt-async-gate/queue.ts
var promptQueues = new Map;
var promptQueueDraining = new Set;
var promptQueueInFlight = new Map;
var promptQueueTimers = new Map;
var promptQueueSequence = 0;
setExpiredReservationHandler((sessionID) => {
  schedulePromptQueueDrain(sessionID, 0);
});
function getPromptQueue(sessionID) {
  const existing = promptQueues.get(sessionID);
  if (existing) {
    return existing;
  }
  const queue = [];
  promptQueues.set(sessionID, queue);
  return queue;
}
function setPromptQueue(sessionID, queue) {
  if (queue.length === 0) {
    promptQueues.delete(sessionID);
    return;
  }
  promptQueues.set(sessionID, queue);
}
function queuedResult(entry, position, queuedBy = entry.source) {
  return {
    status: "queued",
    queuedBy,
    position
  };
}
function clearPromptQueueTimer(sessionID) {
  const timer = promptQueueTimers.get(sessionID);
  if (timer !== undefined) {
    clearTimeout(timer);
    promptQueueTimers.delete(sessionID);
  }
}
function schedulePromptQueueDrain(sessionID, delayMs) {
  const queue = promptQueues.get(sessionID);
  if (!queue || queue.length === 0) {
    clearPromptQueueTimer(sessionID);
    return;
  }
  clearPromptQueueTimer(sessionID);
  const timer = setTimeout(() => {
    promptQueueTimers.delete(sessionID);
    drainPromptQueue(sessionID).catch((error) => {
      log("[prompt-async-gate] queued prompt drain failed", {
        sessionID,
        error: String(error)
      });
    });
  }, Math.max(0, delayMs));
  promptQueueTimers.set(sessionID, timer);
}
function removePromptQueueEntry(sessionID, entry) {
  const queue = promptQueues.get(sessionID);
  if (!queue) {
    return;
  }
  const nextQueue = queue.filter((queued) => queued.id !== entry.id);
  setPromptQueue(sessionID, nextQueue);
}
function getQueuedPromptBlocker(sessionID) {
  const inFlight = promptQueueInFlight.get(sessionID);
  if (inFlight) {
    return inFlight.source;
  }
  const queue = promptQueues.get(sessionID);
  return queue?.[0]?.source;
}
function isPromptQueueDraining(sessionID) {
  return promptQueueDraining.has(sessionID);
}
function nextPromptQueueID() {
  promptQueueSequence += 1;
  return promptQueueSequence;
}
async function drainPromptQueue(sessionID, awaitedEntry) {
  if (promptQueueDraining.has(sessionID)) {
    return awaitedEntry ? queuedResult(awaitedEntry, 1) : undefined;
  }
  promptQueueDraining.add(sessionID);
  clearPromptQueueTimer(sessionID);
  let awaitedResult;
  try {
    while (true) {
      const queue = promptQueues.get(sessionID);
      const entry = queue?.[0];
      if (!entry) {
        break;
      }
      promptQueueInFlight.set(sessionID, entry);
      const result = await dispatchAfterSessionIdle({
        sessionName: entry.sessionName,
        client: entry.client,
        sessionID: entry.sessionID,
        input: entry.input,
        source: entry.source,
        dedupeKey: entry.dedupeKey,
        settleMs: entry.settleMs,
        postDispatchHoldMs: entry.postDispatchHoldMs,
        semanticDedupeHoldMs: entry.semanticDedupeHoldMs,
        dispatchTimeoutMs: entry.dispatchTimeoutMs,
        checkStatus: entry.checkStatus,
        checkToolState: entry.checkToolState,
        dispatch: entry.dispatch
      });
      if (promptQueueInFlight.get(sessionID)?.id === entry.id) {
        promptQueueInFlight.delete(sessionID);
      }
      if (result.status === "active" || result.status === "reserved") {
        const queued = queuedResult(entry, 1, result.status === "reserved" ? result.reservedBy : entry.source);
        if (awaitedEntry?.id === entry.id) {
          awaitedResult = queued;
        }
        schedulePromptQueueDrain(sessionID, entry.queueRetryMs);
        break;
      }
      removePromptQueueEntry(sessionID, entry);
      if (awaitedEntry?.id === entry.id) {
        awaitedResult = result;
      }
      const remainingQueue = promptQueues.get(sessionID);
      if (!remainingQueue || remainingQueue.length === 0) {
        break;
      }
      schedulePromptQueueDrain(sessionID, entry.postDispatchHoldMs);
      break;
    }
  } finally {
    promptQueueDraining.delete(sessionID);
  }
  return awaitedResult;
}
async function enqueueInternalPrompt(entry) {
  const activeReservation = getActiveReservation(entry.sessionID);
  if (activeReservation?.dedupeKey === entry.dedupeKey) {
    log("[prompt-async-gate] queued prompt coalesced with recent dispatch", {
      sessionID: entry.sessionID,
      source: entry.source,
      queuedBy: activeReservation.source
    });
    return queuedResult(entry, 0, activeReservation.source);
  }
  const queue = getPromptQueue(entry.sessionID);
  const existingIndex = queue.findIndex((queued) => queued.dedupeKey === entry.dedupeKey);
  if (existingIndex >= 0) {
    const existing = queue[existingIndex];
    if (existing) {
      log("[prompt-async-gate] queued prompt coalesced with pending dispatch", {
        sessionID: entry.sessionID,
        source: entry.source,
        queuedBy: existing.source,
        position: existingIndex + 1
      });
      return queuedResult(existing, existingIndex + 1);
    }
  }
  queue.push(entry);
  log("[prompt-async-gate] queued prompt accepted", {
    sessionID: entry.sessionID,
    source: entry.source,
    position: queue.length
  });
  if (queue.length > 1 || promptQueueDraining.has(entry.sessionID)) {
    schedulePromptQueueDrain(entry.sessionID, 0);
    return queuedResult(entry, queue.length);
  }
  const result = await drainPromptQueue(entry.sessionID, entry);
  return result ?? queuedResult(entry, 1);
}

// src/shared/prompt-async-gate/semantic-dedupe.ts
import { createHash } from "crypto";
init_logger();
var MAX_PROMPT_DEDUPE_DEPTH = 64;
function isPlainRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function canonicalizePromptInputForDedupe(key, value, seen = new WeakSet, depth = 0) {
  if (key === "signal") {
    return "[AbortSignal]";
  }
  if (typeof value === "function") {
    return `[Function:${value.name}]`;
  }
  if (depth > MAX_PROMPT_DEDUPE_DEPTH) {
    return "[MaxDepth]";
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);
    try {
      return value.map((entry) => canonicalizePromptInputForDedupe("", entry, seen, depth + 1));
    } finally {
      seen.delete(value);
    }
  }
  if (!isPlainRecord(value)) {
    return value;
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);
  try {
    const canonicalEntries = [];
    for (const entryKey of Object.keys(value).sort()) {
      canonicalEntries.push([
        entryKey,
        canonicalizePromptInputForDedupe(entryKey, value[entryKey], seen, depth + 1)
      ]);
    }
    return Object.fromEntries(canonicalEntries);
  } finally {
    seen.delete(value);
  }
}
function isContinuationTextPartLike(value) {
  if (!isPlainRecord(value)) {
    return false;
  }
  if (value.type !== "text" || typeof value.text !== "string") {
    return false;
  }
  if (!hasInternalInitiatorMarker(value.text)) {
    return false;
  }
  if (!isPlainRecord(value.metadata)) {
    return false;
  }
  return value.metadata.compaction_continue === true;
}
function hasContinuationPromptIntent(input) {
  if (!isPlainRecord(input) || !isPlainRecord(input.body) || !Array.isArray(input.body.parts)) {
    return false;
  }
  return input.body.parts.some((part) => isContinuationTextPartLike(part));
}
function normalizePromptInputForSemanticDedupe(input) {
  if (hasContinuationPromptIntent(input)) {
    return {
      __omo_internal_intent: "continuation"
    };
  }
  return canonicalizePromptInputForDedupe("", input);
}
function stringifyPromptInputForDedupe(input) {
  try {
    const serialized = JSON.stringify(normalizePromptInputForSemanticDedupe(input));
    return serialized ?? String(input);
  } catch (error) {
    const errorTag = error instanceof Error ? error.name : String(error);
    return `${String(input)}:[unserializable:${errorTag}]`;
  }
}
function createSemanticPromptDedupeKey(input) {
  const fingerprint = stringifyPromptInputForDedupe(input);
  const digest = createHash("sha256").update(fingerprint, "utf8").digest("hex");
  return `semantic:${digest}`;
}
function coalesceRecentSemanticPromptDispatch(args) {
  const recentDispatch = getRecentPromptDispatch(args.sessionID, args.dedupeKey);
  if (!recentDispatch) {
    return;
  }
  log("[prompt-async-gate] prompt coalesced with recent semantic dispatch", {
    sessionID: args.sessionID,
    source: args.source,
    queuedBy: recentDispatch.source
  });
  return { status: "queued", queuedBy: recentDispatch.source, position: 0 };
}

// src/shared/prompt-async-gate.ts
function hasObjectSessionPath(input) {
  return typeof input === "object" && input !== null && "path" in input && typeof input.path === "object" && input.path !== null && "id" in input.path && typeof input.path.id === "string";
}
function isObjectPathTypeError(error) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return message.includes('The "path" property must be of type string') && message.includes("got object");
}
async function dispatchWithPathCompatibility(dispatch, input) {
  try {
    return await dispatch(input);
  } catch (error) {
    if (!isObjectPathTypeError(error) || !hasObjectSessionPath(input)) {
      throw error;
    }
    const retryInput = {
      ...input,
      path: input.path.id
    };
    return dispatch(retryInput);
  }
}
async function dispatchInternalPrompt(args) {
  const {
    client,
    sessionID,
    input,
    source,
    settleMs = DEFAULT_SESSION_IDLE_SETTLE_MS
  } = args;
  const dedupeKey = args.dedupeKey ?? createSemanticPromptDedupeKey(input);
  const queueRetryMs = args.queueRetryMs ?? DEFAULT_PROMPT_QUEUE_RETRY_MS;
  const postDispatchHoldMs = args.postDispatchHoldMs ?? DEFAULT_PROMPT_ASYNC_POST_DISPATCH_HOLD_MS;
  const semanticDedupeHoldMs = args.semanticDedupeHoldMs ?? (postDispatchHoldMs > 0 ? DEFAULT_PROMPT_SEMANTIC_DEDUPE_HOLD_MS : 0);
  const dispatchTimeoutMs = args.dispatchTimeoutMs ?? DEFAULT_PROMPT_DISPATCH_TIMEOUT_MS;
  const sessionName = args.mode === "async" ? "promptAsync" : "prompt";
  const dispatch = (() => {
    if (args.mode === "async") {
      const session2 = args.client.session;
      if (typeof session2?.promptAsync !== "function") {
        return;
      }
      const dispatchPromptAsync = session2.promptAsync.bind(session2);
      return (dispatchInput) => dispatchPromptAsync(dispatchInput);
    }
    const session = args.client.session;
    if (typeof session?.prompt !== "function") {
      return;
    }
    const dispatchPrompt = session.prompt.bind(session);
    return (dispatchInput) => dispatchPrompt(dispatchInput);
  })();
  if (!dispatch) {
    log(`[prompt-async-gate] ${sessionName} unavailable`, { sessionID, source });
    return { status: "unavailable" };
  }
  const queueBehavior = args.queueBehavior ?? (args.mode === "sync" ? "defer" : "enqueue");
  if (queueBehavior === "defer") {
    const activeReservation = getActiveReservation(sessionID);
    if (activeReservation) {
      return { status: "reserved", reservedBy: activeReservation.source };
    }
    const queuedBy = getQueuedPromptBlocker(sessionID);
    if (queuedBy !== undefined || isPromptQueueDraining(sessionID)) {
      return { status: "reserved", reservedBy: queuedBy ?? source };
    }
    const recentDispatchResult2 = coalesceRecentSemanticPromptDispatch({ sessionID, dedupeKey, source });
    if (recentDispatchResult2) {
      return recentDispatchResult2;
    }
    return dispatchAfterSessionIdle({
      sessionName,
      client,
      sessionID,
      input,
      source,
      dedupeKey,
      settleMs,
      postDispatchHoldMs,
      semanticDedupeHoldMs,
      dispatchTimeoutMs,
      checkStatus: args.checkStatus !== false,
      checkToolState: args.checkToolState !== false,
      dispatch: (dispatchInput) => dispatchWithPathCompatibility(dispatch, dispatchInput)
    });
  }
  if (args.queue !== false) {
    const recentDispatchResult2 = coalesceRecentSemanticPromptDispatch({ sessionID, dedupeKey, source });
    if (recentDispatchResult2) {
      return recentDispatchResult2;
    }
    return enqueueInternalPrompt({
      id: nextPromptQueueID(),
      sessionID,
      sessionName,
      client,
      input,
      source,
      dedupeKey,
      settleMs,
      postDispatchHoldMs,
      semanticDedupeHoldMs,
      dispatchTimeoutMs,
      queueRetryMs,
      checkStatus: args.checkStatus !== false,
      checkToolState: args.checkToolState !== false,
      dispatch: async (_dispatchInput) => dispatchWithPathCompatibility(dispatch, input)
    });
  }
  const recentDispatchResult = coalesceRecentSemanticPromptDispatch({ sessionID, dedupeKey, source });
  if (recentDispatchResult) {
    return recentDispatchResult;
  }
  return dispatchAfterSessionIdle({
    sessionName,
    client,
    sessionID,
    input,
    source,
    dedupeKey,
    settleMs,
    postDispatchHoldMs,
    semanticDedupeHoldMs,
    dispatchTimeoutMs,
    checkStatus: args.checkStatus !== false,
    checkToolState: args.checkToolState !== false,
    dispatch: (dispatchInput) => dispatchWithPathCompatibility(dispatch, dispatchInput)
  });
}
function isInternalPromptDispatchAccepted(result) {
  return result.status === "dispatched" || result.status === "queued";
}

// src/shared/prompt-failure-classifier.ts
function extractPromptFailureMessage(error) {
  if (typeof error === "string")
    return error;
  if (error instanceof Error)
    return error.message;
  if (typeof error === "object" && error !== null) {
    const record = error;
    if (typeof record.message === "string")
      return record.message;
    try {
      return JSON.stringify(error);
    } catch (stringifyError) {
      stringifyError instanceof Error;
      return "";
    }
  }
  return String(error);
}
function isAmbiguousPromptDispatchFailure(error) {
  const message = extractPromptFailureMessage(error).toLowerCase();
  return message.includes("unexpected eof") || message.includes("json parse error") || message.includes("unexpected end of json input") || message.includes("timed out");
}
function isAmbiguousPostDispatchPromptFailure(result) {
  return result.dispatchAttempted === true && isAmbiguousPromptDispatchFailure(result.error);
}
// src/shared/opencode-server-auth.ts
init_logger();
// src/shared/opencode-provider-auth.ts
init_logger();
// src/shared/opencode-http-api.ts
init_logger();
// src/shared/safe-create-hook.ts
init_logger();
// src/shared/project-discovery-dirs.ts
init_plugin_identity();
var worktreePathCache = new Map;
// src/shared/session-tools-store.ts
var store = new Map;
function getSessionTools(sessionID) {
  const tools = store.get(sessionID);
  return tools ? { ...tools } : undefined;
}

// src/shared/prompt-tools.ts
function normalizePromptTools(tools) {
  if (!tools) {
    return;
  }
  const normalized = {};
  for (const [toolName, permission] of Object.entries(tools)) {
    if (permission === false || permission === "deny") {
      normalized[toolName] = false;
      continue;
    }
    if (permission === true || permission === "allow" || permission === "ask") {
      normalized[toolName] = true;
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}
function resolveInheritedPromptTools(sessionID, fallbackTools) {
  const sessionTools = getSessionTools(sessionID);
  if (sessionTools && Object.keys(sessionTools).length > 0) {
    return { ...sessionTools };
  }
  return normalizePromptTools(fallbackTools);
}
// src/features/claude-code-plugin-loader/loader.ts
init_logger();

// src/features/claude-code-plugin-loader/discovery-core.ts
init_logger();

// src/features/claude-code-plugin-loader/installed-plugin-database.ts
init_logger();

// src/features/claude-code-plugin-loader/install-path-resolver.ts
init_logger();

// src/features/claude-code-plugin-loader/plugin-manifest.ts
init_logger();

// src/features/claude-code-plugin-loader/plugin-settings.ts
init_logger();
// src/features/claude-code-plugin-loader/command-loader.ts
init_logger();

// src/features/claude-code-plugin-loader/skill-loader.ts
init_logger();

// src/features/claude-code-plugin-loader/agent-loader.ts
init_logger();

// src/shared/model-format-normalizer.ts
init_src();

// src/features/claude-code-agent-loader/claude-model-mapper.ts
var ANTHROPIC_PREFIX = "anthropic/";
var CLAUDE_CODE_ALIAS_MAP = new Map([
  ["sonnet", `${ANTHROPIC_PREFIX}claude-sonnet-4-6`],
  ["opus", `${ANTHROPIC_PREFIX}claude-opus-4-7`],
  ["haiku", `${ANTHROPIC_PREFIX}claude-haiku-4-5`]
]);

// src/features/claude-code-mcp-loader/env-expander.ts
init_logger();

// src/features/claude-code-mcp-loader/configure-allowed-env-vars.ts
var additionalAllowedMcpEnvVars = new Set;

// src/features/claude-code-plugin-loader/mcp-server-loader.ts
init_logger();

// src/features/claude-code-plugin-loader/hook-loader.ts
init_logger();

// src/features/claude-code-plugin-loader/loader.ts
var cachedPluginComponentsByKey = new Map;
// src/shared/session-category-registry.ts
var sessionCategoryMap = new Map;

// src/shared/index.ts
init_plugin_identity();

// src/shared/legacy-plugin-warning.ts
init_plugin_identity();

// src/shared/log-legacy-plugin-startup-warning.ts
init_logger();

// src/shared/migrate-legacy-plugin-entry.ts
init_logger();
init_plugin_identity();

// src/shared/plugin-entry-migrator.ts
init_plugin_identity();

// src/shared/log-legacy-plugin-startup-warning.ts
init_plugin_identity();
// src/shared/legacy-workspace-migration.ts
init_logger();
// src/shared/model-string-parser.ts
init_src();
// src/shared/excluded-dirs.ts
var EXCLUDED_DIR_NAMES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".omo",
  ".sisyphus",
  ".turbo",
  "coverage",
  "out",
  ".cache",
  ".vscode-test",
  "target",
  ".local-ignore"
];
var EXCLUDED_DIRS = Object.freeze(new Set(EXCLUDED_DIR_NAMES));
// src/tools/hashline-edit/formatter-trigger.ts
init_bun_spawn_shim();
var cachedFormattersByDirectory = new Map;
function getFormatterCacheKey(directory) {
  return path3.resolve(directory);
}
function unwrapConfigResponse(response) {
  if ("data" in response)
    return response.data;
  return response;
}
async function resolveFormatters(client, directory) {
  const cacheKey = getFormatterCacheKey(directory);
  const cachedFormatters = cachedFormattersByDirectory.get(cacheKey);
  if (cachedFormatters)
    return cachedFormatters;
  const result = new Map;
  try {
    const response = await client.config.get({ query: { directory } });
    const config = unwrapConfigResponse(response);
    if (!config)
      return result;
    if (config.formatter && typeof config.formatter === "object") {
      for (const [, formatter] of Object.entries(config.formatter)) {
        if (formatter.disabled || !formatter.command?.length || !formatter.extensions?.length)
          continue;
        for (const ext of formatter.extensions) {
          const normalizedExt = ext.startsWith(".") ? ext : `.${ext}`;
          const existing = result.get(normalizedExt) ?? [];
          existing.push({
            command: formatter.command,
            environment: formatter.environment ?? {}
          });
          result.set(normalizedExt, existing);
        }
      }
    }
    if (config.experimental?.hook?.file_edited) {
      for (const [ext, commands] of Object.entries(config.experimental.hook.file_edited)) {
        const normalizedExt = ext.startsWith(".") ? ext : `.${ext}`;
        const existing = result.get(normalizedExt) ?? [];
        for (const cmd of commands) {
          existing.push({
            command: cmd.command,
            environment: cmd.environment ?? {}
          });
        }
        result.set(normalizedExt, existing);
      }
    }
    cachedFormattersByDirectory.set(cacheKey, result);
  } catch (error) {
    log("[formatter-trigger] Failed to fetch formatter config", { error });
  }
  return result;
}
function buildFormatterCommand(command, filePath) {
  return command.map((arg) => arg.replace(/\$FILE/g, filePath));
}
async function runFormattersForFile(client, directory, filePath) {
  const ext = path3.extname(filePath);
  if (!ext)
    return;
  const formatters = await resolveFormatters(client, directory);
  const matching = formatters.get(ext);
  if (!matching?.length)
    return;
  for (const formatter of matching) {
    const cmd = buildFormatterCommand(formatter.command, filePath);
    try {
      log("[formatter-trigger] Running formatter", { command: cmd, file: filePath });
      const proc = spawn(cmd, {
        cwd: directory,
        env: { ...process.env, ...formatter.environment },
        stdout: "ignore",
        stderr: "pipe"
      });
      await proc.exited;
      if (proc.exitCode !== 0) {
        const stderr = await new Response(proc.stderr).text();
        log("[formatter-trigger] Formatter failed", {
          command: cmd,
          exitCode: proc.exitCode,
          stderr: stderr.slice(0, 500)
        });
      }
    } catch (error) {
      log("[formatter-trigger] Formatter execution error", { command: cmd, error });
    }
  }
}

// src/tools/hashline-edit/hashline-edit-executor.ts
function canCreateFromMissingFile(edits) {
  if (edits.length === 0)
    return false;
  return edits.every((edit) => (edit.op === "append" || edit.op === "prepend") && !edit.pos);
}
function buildSuccessMeta(baseDir, effectivePath, beforeContent, afterContent, noopEdits, deduplicatedEdits) {
  const unifiedDiff = generateUnifiedDiff(beforeContent, afterContent, effectivePath);
  const { additions, deletions } = countLineDiffs(beforeContent, afterContent);
  const relativePath = baseDir ? path4.relative(baseDir, effectivePath).replaceAll("\\", "/") : effectivePath;
  const beforeLines = beforeContent.split(`
`);
  const afterLines = afterContent.split(`
`);
  const maxLength = Math.max(beforeLines.length, afterLines.length);
  let firstChangedLine;
  for (let index = 0;index < maxLength; index += 1) {
    if ((beforeLines[index] ?? "") !== (afterLines[index] ?? "")) {
      firstChangedLine = index + 1;
      break;
    }
  }
  return {
    title: effectivePath,
    metadata: {
      filePath: effectivePath,
      path: effectivePath,
      file: effectivePath,
      diff: unifiedDiff,
      files: [
        {
          filePath: effectivePath,
          relativePath,
          type: "update",
          patch: unifiedDiff,
          additions,
          deletions
        }
      ],
      noopEdits,
      deduplicatedEdits,
      firstChangedLine,
      filediff: {
        file: effectivePath,
        path: effectivePath,
        filePath: effectivePath,
        patch: unifiedDiff,
        before: beforeContent,
        after: afterContent,
        additions,
        deletions
      }
    }
  };
}
async function askEditPermission(context, filePath, beforeContent, afterContent) {
  const diff = generateUnifiedDiff(beforeContent, afterContent, filePath);
  const baseDir = context.worktree || context.directory || path4.dirname(filePath);
  const relativePath = path4.relative(baseDir, filePath).replaceAll("\\", "/");
  await context.ask({
    permission: "edit",
    patterns: [relativePath || filePath],
    always: ["*"],
    metadata: {
      filepath: filePath,
      diff
    }
  });
}
async function executeHashlineEditTool(args, context, pluginCtx) {
  try {
    const metadataContext = context;
    const filePath = args.filePath;
    const { delete: deleteMode, rename } = args;
    if (deleteMode && rename) {
      return "Error: delete and rename cannot be used together";
    }
    if (deleteMode && args.edits.length > 0) {
      return "Error: delete mode requires edits to be an empty array";
    }
    if (!deleteMode && (!args.edits || !Array.isArray(args.edits) || args.edits.length === 0)) {
      return "Error: edits parameter must be a non-empty array";
    }
    const edits = deleteMode ? [] : normalizeHashlineEdits(args.edits);
    const file = bunFile(filePath);
    const exists = await file.exists();
    if (!exists && !deleteMode && !canCreateFromMissingFile(edits)) {
      return `Error: File not found: ${filePath}`;
    }
    if (deleteMode) {
      if (!exists)
        return `Error: File not found: ${filePath}`;
      const rawOldContent2 = Buffer.from(await file.arrayBuffer()).toString("utf8");
      const oldEnvelope2 = canonicalizeFileText(rawOldContent2);
      await askEditPermission(context, filePath, oldEnvelope2.content, "");
      await bunFile(filePath).delete();
      return `Successfully deleted ${filePath}`;
    }
    const rawOldContent = exists ? Buffer.from(await file.arrayBuffer()).toString("utf8") : "";
    const oldEnvelope = canonicalizeFileText(rawOldContent);
    const applyResult = applyHashlineEditsWithReport(oldEnvelope.content, edits);
    const canonicalNewContent = applyResult.content;
    if (canonicalNewContent === oldEnvelope.content && !rename) {
      let diagnostic = `No changes made to ${filePath}. The edits produced identical content.`;
      if (applyResult.noopEdits > 0) {
        diagnostic += ` No-op edits: ${applyResult.noopEdits}. Re-read the file and provide content that differs from current lines.`;
      }
      return `Error: ${diagnostic}`;
    }
    await askEditPermission(context, filePath, oldEnvelope.content, canonicalNewContent);
    const writeContent = restoreFileText(canonicalNewContent, oldEnvelope);
    await bunWrite(filePath, writeContent);
    if (pluginCtx?.client) {
      await runFormattersForFile(pluginCtx.client, context.directory, filePath);
      const formattedContent = Buffer.from(await bunFile(filePath).arrayBuffer()).toString("utf8");
      if (formattedContent !== writeContent) {
        const formattedEnvelope = canonicalizeFileText(formattedContent);
        const formattedMeta = buildSuccessMeta(context.directory, filePath, oldEnvelope.content, formattedEnvelope.content, applyResult.noopEdits, applyResult.deduplicatedEdits);
        await publishToolMetadata(metadataContext, formattedMeta);
        if (rename && rename !== filePath) {
          await bunWrite(rename, formattedContent);
          await bunFile(filePath).delete();
          return `Moved ${filePath} to ${rename}`;
        }
        return `Updated ${filePath}`;
      }
    }
    if (rename && rename !== filePath) {
      await bunWrite(rename, writeContent);
      await bunFile(filePath).delete();
    }
    const effectivePath = rename && rename !== filePath ? rename : filePath;
    const meta = buildSuccessMeta(context.directory, effectivePath, oldEnvelope.content, canonicalNewContent, applyResult.noopEdits, applyResult.deduplicatedEdits);
    await publishToolMetadata(metadataContext, meta);
    if (rename && rename !== filePath) {
      return `Moved ${filePath} to ${rename}`;
    }
    return `Updated ${effectivePath}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof HashlineMismatchError) {
      return `Error: hash mismatch - ${message}
Tip: reuse LINE#ID entries from the latest read/edit output, or batch related edits in one call.`;
    }
    return `Error: ${message}`;
  }
}

// src/tools/hashline-edit/tool-description.ts
var HASHLINE_EDIT_DESCRIPTION = `Edit files using LINE#ID format for precise, safe modifications.

WORKFLOW:
1. Read target file/range and copy exact LINE#ID tags.
2. Pick the smallest operation per logical mutation site.
3. Submit one edit call per file with all related operations.
4. If same file needs another call, re-read first.
5. Use anchors as "LINE#ID" only (never include trailing "|content").

<must>
- SNAPSHOT: All edits in one call reference the ORIGINAL file state. Do NOT adjust line numbers for prior edits in the same call - the system applies them bottom-up automatically.
- replace removes lines pos..end (inclusive) and inserts lines in their place. Lines BEFORE pos and AFTER end are UNTOUCHED - do NOT include them in lines. If you do, they will appear twice.
- lines must contain ONLY the content that belongs inside the consumed range. Content after end survives unchanged.
- Tags MUST be copied exactly from read output or >>> mismatch output. NEVER guess tags.
- Batch = multiple operations in edits[], NOT one big replace covering everything. Each operation targets the smallest possible change.
- lines must contain plain replacement text only (no LINE#ID prefixes, no diff + markers).
</must>

<operations>
LINE#ID FORMAT:
  Each line reference must be in "{line_number}#{hash_id}" format where:
  {line_number}: 1-based line number
  {hash_id}: Two CID letters from the set ZPMQVRWSNKTXJBYH

OPERATION CHOICE:
  replace with pos only -> replace one line at pos
  replace with pos+end -> replace range pos..end inclusive as a block (ranges MUST NOT overlap across edits)
  append with pos/end anchor -> insert after that anchor
  prepend with pos/end anchor -> insert before that anchor
  append/prepend without anchors -> EOF/BOF insertion (also creates missing files)

CONTENT FORMAT:
  lines can be a string (single line) or string[] (multi-line, preferred).
  If you pass a multi-line string, it is split by real newline characters.
  lines: null or lines: [] with replace -> delete those lines.

FILE MODES:
  delete=true deletes file and requires edits=[] with no rename
  rename moves final content to a new path and removes old path

RULES:
  1. Minimize scope: one logical mutation site per operation.
  2. Preserve formatting: keep indentation, punctuation, line breaks, trailing commas, brace style.
  3. Prefer insertion over neighbor rewrites: anchor to structural boundaries (}, ], },), not interior property lines.
  4. No no-ops: replacement content must differ from current content.
  5. Touch only requested code: avoid incidental edits.
  6. Use exact current tokens: NEVER rewrite approximately.
  7. For swaps/moves: prefer one range operation over multiple single-line operations.
  8. Anchor to structural lines (function/class/brace), NEVER blank lines.
  9. Re-read after each successful edit call before issuing another on the same file.
</operations>

<examples>
Given this file content after read:
  10#VK|function hello() {
  11#XJ|  console.log("hi");
  12#MB|  console.log("bye");
  13#QR|}
  14#TN|
  15#WS|function world() {

Single-line replace (change line 11):
  { op: "replace", pos: "11#XJ", lines: ["  console.log(\\"hello\\");"] }
  Result: line 11 replaced. Lines 10, 12-15 unchanged.

Range replace (rewrite function body, lines 11-12):
  { op: "replace", pos: "11#XJ", end: "12#MB", lines: ["  return \\"hello world\\";"] }
  Result: lines 11-12 removed, replaced by 1 new line. Lines 10, 13-15 unchanged.

Delete a line:
  { op: "replace", pos: "12#MB", lines: null }
  Result: line 12 removed. Lines 10-11, 13-15 unchanged.

Insert after line 13 (between functions):
  { op: "append", pos: "13#QR", lines: ["", "function added() {", "  return true;", "}"] }
  Result: 4 new lines inserted after line 13. All existing lines unchanged.

BAD - lines extend past end (DUPLICATES line 13):
  { op: "replace", pos: "11#XJ", end: "12#MB", lines: ["  return \\"hi\\";", "}"] }
  Line 13 is "}" which already exists after end. Including "}" in lines duplicates it.
  CORRECT: { op: "replace", pos: "11#XJ", end: "12#MB", lines: ["  return \\"hi\\";"] }
</examples>

<auto>
Built-in autocorrect (you do NOT need to handle these):
  Merged lines are auto-expanded back to original line count.
  Indentation is auto-restored from original lines.
  BOM and CRLF line endings are preserved automatically.
  Hashline prefixes and diff markers in text are auto-stripped.
  Boundary echo lines (duplicating adjacent surviving lines) are auto-stripped.
</auto>

RECOVERY (when >>> mismatch error appears):
  Copy the updated LINE#ID tags shown in the error output directly.
  Re-read only if the needed tags are missing from the error snippet.`;

// src/tools/hashline-edit/tools.ts
function createHashlineEditTool(ctx) {
  return createHashlineTool(HASHLINE_EDIT_DESCRIPTION, ctx);
}
function createHashlineApplyPatchTool(ctx) {
  return createHashlineTool(`Apply hash-anchored file edits using LINE#ID anchors.

IMPORTANT: This tool intentionally uses the apply_patch name for OpenCode GPT model routing, but it does not accept unified diff patchText. Use filePath plus hashline edits instead.

${HASHLINE_EDIT_DESCRIPTION}`, ctx);
}
function createHashlineTool(description, ctx) {
  return tool({
    description,
    args: {
      filePath: tool.schema.string().describe("Absolute path to the file to edit"),
      delete: tool.schema.boolean().optional().describe("Delete file instead of editing"),
      rename: tool.schema.string().optional().describe("Rename output file path after edits"),
      edits: tool.schema.array(tool.schema.object({
        op: tool.schema.union([
          tool.schema.literal("replace"),
          tool.schema.literal("append"),
          tool.schema.literal("prepend")
        ]).describe("Hashline edit operation mode"),
        pos: tool.schema.string().optional().describe("Primary anchor in LINE#ID format"),
        end: tool.schema.string().optional().describe("Range end anchor in LINE#ID format"),
        lines: tool.schema.union([tool.schema.array(tool.schema.string()), tool.schema.string(), tool.schema.null()]).describe("Replacement or inserted lines as newline-delimited string. null deletes with replace")
      })).describe("Array of edit operations to apply (empty when delete=true)")
    },
    execute: async (args, context) => executeHashlineEditTool(args, context, ctx)
  });
}
// src/hooks/hashline-read-enhancer/hook.ts
var WRITE_SUCCESS_MARKER = "File written successfully.";
var COLON_READ_LINE_PATTERN = /^\s*(\d+): ?(.*)$/;
var PIPE_READ_LINE_PATTERN = /^\s*(\d+)\| ?(.*)$/;
var CONTENT_OPEN_TAG = "<content>";
var CONTENT_CLOSE_TAG = "</content>";
var FILE_OPEN_TAG = "<file>";
var FILE_CLOSE_TAG = "</file>";
var OPENCODE_LINE_TRUNCATION_SUFFIX = "... (line truncated to 2000 chars)";
function isReadTool(toolName) {
  return toolName.toLowerCase() === "read";
}
function isWriteTool(toolName) {
  return toolName.toLowerCase() === "write";
}
function shouldProcess(config) {
  return config.hashline_edit?.enabled ?? false;
}
function isTextFile(output) {
  const firstLine = output.split(`
`)[0] ?? "";
  return COLON_READ_LINE_PATTERN.test(firstLine) || PIPE_READ_LINE_PATTERN.test(firstLine);
}
function parseReadLine(line) {
  const colonMatch = COLON_READ_LINE_PATTERN.exec(line);
  if (colonMatch) {
    return {
      lineNumber: Number.parseInt(colonMatch[1], 10),
      content: colonMatch[2]
    };
  }
  const pipeMatch = PIPE_READ_LINE_PATTERN.exec(line);
  if (pipeMatch) {
    return {
      lineNumber: Number.parseInt(pipeMatch[1], 10),
      content: pipeMatch[2]
    };
  }
  return null;
}
function transformLine(line) {
  const parsed = parseReadLine(line);
  if (!parsed) {
    return line;
  }
  if (parsed.content.endsWith(OPENCODE_LINE_TRUNCATION_SUFFIX)) {
    return line;
  }
  const hash = computeLineHash(parsed.lineNumber, parsed.content);
  return `${parsed.lineNumber}#${hash}|${parsed.content}`;
}
function transformOutput(output) {
  if (!output) {
    return output;
  }
  const lines = output.split(`
`);
  const contentStart = lines.findIndex((line) => line === CONTENT_OPEN_TAG || line.startsWith(CONTENT_OPEN_TAG));
  const contentEnd = lines.indexOf(CONTENT_CLOSE_TAG);
  const fileStart = lines.findIndex((line) => line === FILE_OPEN_TAG || line.startsWith(FILE_OPEN_TAG));
  const fileEnd = lines.indexOf(FILE_CLOSE_TAG);
  const blockStart = contentStart !== -1 ? contentStart : fileStart;
  const blockEnd = contentStart !== -1 ? contentEnd : fileEnd;
  const openTag = contentStart !== -1 ? CONTENT_OPEN_TAG : FILE_OPEN_TAG;
  if (blockStart !== -1 && blockEnd !== -1 && blockEnd > blockStart) {
    const openLine = lines[blockStart] ?? "";
    const inlineFirst = openLine.startsWith(openTag) && openLine !== openTag ? openLine.slice(openTag.length) : null;
    const fileLines = inlineFirst !== null ? [inlineFirst, ...lines.slice(blockStart + 1, blockEnd)] : lines.slice(blockStart + 1, blockEnd);
    if (!isTextFile(fileLines[0] ?? "")) {
      return output;
    }
    const result2 = [];
    for (const line of fileLines) {
      if (!parseReadLine(line)) {
        result2.push(...fileLines.slice(result2.length));
        break;
      }
      result2.push(transformLine(line));
    }
    const prefixLines = inlineFirst !== null ? [...lines.slice(0, blockStart), openTag] : lines.slice(0, blockStart + 1);
    return [...prefixLines, ...result2, ...lines.slice(blockEnd)].join(`
`);
  }
  if (!isTextFile(lines[0] ?? "")) {
    return output;
  }
  const result = [];
  for (const line of lines) {
    if (!parseReadLine(line)) {
      result.push(...lines.slice(result.length));
      break;
    }
    result.push(transformLine(line));
  }
  return result.join(`
`);
}
function extractFilePath(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return;
  }
  const objectMeta = metadata;
  const candidates = [objectMeta.filepath, objectMeta.filePath, objectMeta.path, objectMeta.file];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }
  return;
}
function extractLineCount(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return;
  }
  const objectMeta = metadata;
  const candidates = [objectMeta.lineCount, objectMeta.linesWritten, objectMeta.lines];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isInteger(candidate) && candidate >= 0) {
      return candidate;
    }
  }
  return;
}
async function appendWriteHashlineOutput(output) {
  if (output.output.startsWith(WRITE_SUCCESS_MARKER)) {
    return;
  }
  const outputLower = output.output.toLowerCase();
  if (outputLower.startsWith("error") || outputLower.includes("failed")) {
    return;
  }
  const metadataLineCount = extractLineCount(output.metadata);
  if (metadataLineCount !== undefined) {
    output.output = `${WRITE_SUCCESS_MARKER} ${metadataLineCount} lines written.`;
    return;
  }
  const filePath = extractFilePath(output.metadata);
  if (!filePath) {
    return;
  }
  const file = bunFile(filePath);
  if (!await file.exists()) {
    return;
  }
  const content = await file.text();
  const lineCount = content === "" ? 0 : content.split(`
`).length;
  output.output = `${WRITE_SUCCESS_MARKER} ${lineCount} lines written.`;
}
function createHashlineReadEnhancerHook(_ctx, config) {
  return {
    "tool.execute.after": async (input, output) => {
      if (!isReadTool(input.tool)) {
        if (isWriteTool(input.tool) && typeof output.output === "string" && shouldProcess(config)) {
          await appendWriteHashlineOutput(output);
        }
        return;
      }
      if (typeof output.output !== "string") {
        return;
      }
      if (!shouldProcess(config)) {
        return;
      }
      output.output = transformOutput(output.output);
    }
  };
}
// src/hooks/todo-continuation-enforcer/index.ts
init_logger();

// src/hooks/todo-continuation-enforcer/constants.ts
var HOOK_NAME = "todo-continuation-enforcer";
var DEFAULT_SKIP_AGENTS = ["prometheus", "compaction", "plan"];
var CONTINUATION_PROMPT = `${createSystemDirective(SystemDirectiveTypes.TODO_CONTINUATION)}

Incomplete tasks remain in your todo list. Continue working on the next pending task.

- Proceed without asking for permission
- Mark each task complete when finished
- Do not stop until all tasks are done
- If you believe all work is already complete, the system is questioning your completion claim. Critically re-examine each todo item from a skeptical perspective, verify the work was actually done correctly, and update the todo list accordingly.`;
var COUNTDOWN_SECONDS = 2;
var TOAST_DURATION_MS = 900;
var COUNTDOWN_GRACE_PERIOD_MS = 500;
var ABORT_WINDOW_MS = 3000;
var COMPACTION_GUARD_MS = 60000;
var CONTINUATION_COOLDOWN_MS = 5000;
var MAX_STAGNATION_COUNT = 3;
var MAX_CONSECUTIVE_FAILURES = 5;
var FAILURE_RESET_WINDOW_MS = 5 * 60 * 1000;
// src/features/run-continuation-state/constants.ts
var CONTINUATION_MARKER_DIR = ".omo/run-continuation";
// src/features/run-continuation-state/storage.ts
import { existsSync as existsSync7, mkdirSync as mkdirSync3, readFileSync as readFileSync5, rmSync, writeFileSync as writeFileSync2 } from "fs";
import { join as join11 } from "path";
function getMarkerPath(directory, sessionID) {
  return join11(directory, CONTINUATION_MARKER_DIR, `${sessionID}.json`);
}
function clearContinuationMarker(directory, sessionID) {
  const markerPath = getMarkerPath(directory, sessionID);
  if (!existsSync7(markerPath))
    return;
  try {
    rmSync(markerPath);
  } catch (error) {
    if (error instanceof Error) {
      return;
    }
    return;
  }
}
// src/hooks/todo-continuation-enforcer/handler.ts
init_logger();

// src/hooks/todo-continuation-enforcer/compaction-guard.ts
function armCompactionGuard(state, now) {
  const nextEpoch = (state.recentCompactionEpoch ?? 0) + 1;
  state.recentCompactionAt = now;
  state.recentCompactionEpoch = nextEpoch;
  return nextEpoch;
}
function acknowledgeCompactionGuard(state, compactionEpoch) {
  if (compactionEpoch === undefined) {
    return false;
  }
  if (state.recentCompactionEpoch !== compactionEpoch) {
    return false;
  }
  state.acknowledgedCompactionEpoch = compactionEpoch;
  return true;
}
function isCompactionGuardActive(state, now) {
  if (state.recentCompactionAt === undefined || state.recentCompactionEpoch === undefined) {
    return false;
  }
  if (state.acknowledgedCompactionEpoch === state.recentCompactionEpoch) {
    return false;
  }
  return now - state.recentCompactionAt < COMPACTION_GUARD_MS;
}

// src/features/claude-code-session-state/state.ts
init_agent_display_names();
var subagentSessions = new Set;
var syncSubagentSessions = new Set;
var registeredAgentNames = new Set;
var registeredAgentAliases = new Map;
var ZERO_WIDTH_CHARACTERS_REGEX = /[\u200B\u200C\u200D\uFEFF]/g;
function normalizeRegisteredAgentName(name) {
  return name.replace(ZERO_WIDTH_CHARACTERS_REGEX, "").toLowerCase();
}
function normalizeStoredAgentName(name) {
  return name.replace(ZERO_WIDTH_CHARACTERS_REGEX, "");
}
function resolveRegisteredAgentName(name) {
  if (typeof name !== "string") {
    return;
  }
  const normalizedName = normalizeRegisteredAgentName(name);
  const directMatch = registeredAgentAliases.get(normalizedName);
  if (directMatch !== undefined)
    return directMatch;
  const configKey = getAgentConfigKey(name);
  const normalizedConfigKey = normalizeRegisteredAgentName(configKey);
  if (normalizedConfigKey !== normalizedName) {
    const aliasMatch = registeredAgentAliases.get(normalizedConfigKey);
    if (aliasMatch !== undefined)
      return aliasMatch;
  }
  return normalizeStoredAgentName(name);
}
var sessionAgentMap = new Map;
function getSessionAgent(sessionID) {
  return sessionAgentMap.get(sessionID);
}
// src/hooks/todo-continuation-enforcer/idle-event.ts
init_agent_display_names();
init_logger();

// src/hooks/todo-continuation-enforcer/abort-detection.ts
function isLastAssistantMessageAborted(messages) {
  if (!messages || messages.length === 0)
    return false;
  const assistantMessages = messages.filter((message) => message.info?.role === "assistant");
  if (assistantMessages.length === 0)
    return false;
  const lastAssistant = assistantMessages[assistantMessages.length - 1];
  const errorName = lastAssistant.info?.error?.name;
  if (!errorName)
    return false;
  return errorName === "MessageAbortedError" || errorName === "AbortError";
}

// src/hooks/todo-continuation-enforcer/countdown.ts
init_logger();

// src/hooks/todo-continuation-enforcer/continuation-injection.ts
init_logger();
init_agent_display_names();
// src/shared/model-error-classifier.ts
init_src();

// src/hooks/todo-continuation-enforcer/token-limit-detection.ts
var TOKEN_LIMIT_FALLBACK_PATTERNS = [
  "prompt is too long",
  "is too long",
  "context_length_exceeded",
  "token limit",
  "context length",
  "too many tokens"
];
var TOKEN_LIMIT_ERROR_NAMES = new Set([
  "contextlengtherror",
  "context_length_exceeded"
]);
function isTokenLimitError(error) {
  if (!error)
    return false;
  const isRetryable = isRetryableModelError({
    name: error.name,
    message: error.message
  });
  if (!isRetryable && error.name) {
    const errorNameLower = error.name.toLowerCase();
    if (TOKEN_LIMIT_ERROR_NAMES.has(errorNameLower)) {
      return true;
    }
  }
  if (error.message) {
    const lower = error.message.toLowerCase();
    return TOKEN_LIMIT_FALLBACK_PATTERNS.some((pattern) => lower.includes(pattern));
  }
  return false;
}

// src/hooks/todo-continuation-enforcer/todo.ts
function getIncompleteCount(todos) {
  return todos.filter((todo) => todo.status !== "completed" && todo.status !== "cancelled" && todo.status !== "blocked" && todo.status !== "deleted").length;
}

// src/hooks/todo-continuation-enforcer/continuation-injection.ts
function hasWritePermission(tools) {
  const editPermission = tools?.edit;
  const writePermission = tools?.write;
  return !tools || editPermission !== false && editPermission !== "deny" && writePermission !== false && writePermission !== "deny";
}
async function injectContinuation(args) {
  const {
    ctx,
    sessionID,
    backgroundManager,
    skipAgents = DEFAULT_SKIP_AGENTS,
    resolvedInfo,
    sessionStateStore,
    isContinuationStopped
  } = args;
  const state2 = sessionStateStore.getExistingState(sessionID);
  if (state2?.isRecovering) {
    log(`[${HOOK_NAME}] Skipped injection: in recovery`, { sessionID });
    return;
  }
  if (state2?.wasCancelled) {
    log(`[${HOOK_NAME}] Skipped injection: session was cancelled`, { sessionID });
    return;
  }
  if (isContinuationStopped?.(sessionID)) {
    log(`[${HOOK_NAME}] Skipped injection: continuation stopped for session`, { sessionID });
    return;
  }
  const hasRunningBgTasks = backgroundManager ? backgroundManager.getTasksByParentSession(sessionID).some((task) => task.status === "running" || task.status === "pending") : false;
  if (hasRunningBgTasks) {
    log(`[${HOOK_NAME}] Skipped injection: background tasks running`, { sessionID });
    return;
  }
  let todos = [];
  try {
    const response = await ctx.client.session.todo({ path: { id: sessionID } });
    todos = normalizeSDKResponse(response, [], { preferResponseOnMissingData: true });
  } catch (error) {
    const loggedError = error instanceof Error ? error : String(error);
    log(`[${HOOK_NAME}] Failed to fetch todos`, { sessionID, error: loggedError });
    return;
  }
  const freshIncompleteCount = getIncompleteCount(todos);
  if (freshIncompleteCount === 0) {
    log(`[${HOOK_NAME}] Skipped injection: no incomplete todos`, { sessionID });
    return;
  }
  let agentName = resolvedInfo?.agent ?? getSessionAgent(sessionID);
  let model = resolvedInfo?.model;
  let tools = resolvedInfo?.tools;
  if (!agentName || !model) {
    let previousMessage = null;
    if (isSqliteBackend()) {
      previousMessage = await findNearestMessageWithFieldsFromSDK(ctx.client, sessionID);
    } else {
      const messageDir = getMessageDir(sessionID);
      previousMessage = messageDir ? findNearestMessageWithFields(messageDir) : null;
    }
    agentName = agentName ?? previousMessage?.agent;
    model = model ?? (previousMessage?.model?.providerID && previousMessage?.model?.modelID ? {
      providerID: previousMessage.model.providerID,
      modelID: previousMessage.model.modelID,
      ...previousMessage.model.variant ? { variant: previousMessage.model.variant } : {}
    } : undefined);
    tools = tools ?? previousMessage?.tools;
  }
  const agentConfigKey = getAgentConfigKey(agentName ?? "");
  const registeredAgentName = resolveRegisteredAgentName(agentName);
  const promptAgent = registeredAgentName !== undefined && registeredAgentName !== agentConfigKey ? registeredAgentName : normalizeAgentForPrompt(agentName);
  if (promptAgent && skipAgents.some((s) => getAgentConfigKey(s) === getAgentConfigKey(promptAgent))) {
    log(`[${HOOK_NAME}] Skipped: agent in skipAgents list`, { sessionID, agent: agentName });
    return;
  }
  if (!promptAgent) {
    const compactionState = sessionStateStore.getExistingState(sessionID);
    if (compactionState && isCompactionGuardActive(compactionState, Date.now())) {
      log(`[${HOOK_NAME}] Skipped: agent unknown after compaction`, { sessionID });
      return;
    }
  }
  if (!hasWritePermission(tools)) {
    log(`[${HOOK_NAME}] Skipped: agent lacks write permission`, { sessionID, agent: agentName });
    return;
  }
  const incompleteTodos = todos.filter((todo) => todo.status !== "completed" && todo.status !== "cancelled");
  const todoList = incompleteTodos.map((todo) => `- [${todo.status}] ${todo.content}`).join(`
`);
  const prompt = `${CONTINUATION_PROMPT}

[Status: ${todos.length - freshIncompleteCount}/${todos.length} completed, ${freshIncompleteCount} remaining]

Remaining tasks:
${todoList}`;
  const injectionState = sessionStateStore.getExistingState(sessionID);
  if (injectionState?.wasCancelled) {
    log(`[${HOOK_NAME}] Skipped injection: session was cancelled before prompt`, { sessionID });
    return;
  }
  if (injectionState) {
    injectionState.inFlight = true;
  }
  try {
    log(`[${HOOK_NAME}] Injecting continuation`, {
      sessionID,
      agent: promptAgent,
      model,
      incompleteCount: freshIncompleteCount
    });
    const inheritedTools = resolveInheritedPromptTools(sessionID, tools);
    const launchModel = model ? { providerID: model.providerID, modelID: model.modelID } : undefined;
    const launchVariant = model?.variant;
    const promptResult = await dispatchInternalPrompt({
      mode: "async",
      client: ctx.client,
      sessionID,
      source: HOOK_NAME,
      settleMs: 0,
      queueBehavior: "defer",
      semanticDedupeHoldMs: CONTINUATION_COOLDOWN_MS,
      input: {
        path: { id: sessionID },
        body: {
          agent: promptAgent,
          ...launchModel ? { model: launchModel } : {},
          ...launchVariant ? { variant: launchVariant } : {},
          ...inheritedTools ? { tools: inheritedTools } : {},
          parts: [createInternalAgentContinuationTextPart(prompt)]
        },
        query: { directory: ctx.directory }
      }
    });
    if (promptResult.status === "failed") {
      if (isAmbiguousPostDispatchPromptFailure(promptResult)) {
        if (injectionState) {
          injectionState.inFlight = false;
          injectionState.lastInjectedAt = Date.now();
          injectionState.awaitingPostInjectionProgressCheck = true;
          injectionState.consecutiveFailures = 0;
        }
        return;
      }
      throw promptResult.error;
    }
    if (!isInternalPromptDispatchAccepted(promptResult)) {
      log(`[${HOOK_NAME}] Injection skipped by promptAsync gate`, { sessionID, status: promptResult.status });
      if (injectionState) {
        injectionState.inFlight = false;
      }
      return;
    }
    log(`[${HOOK_NAME}] Injection successful`, { sessionID, status: promptResult.status });
    if (injectionState) {
      injectionState.inFlight = false;
      injectionState.lastInjectedAt = Date.now();
      injectionState.awaitingPostInjectionProgressCheck = true;
      injectionState.consecutiveFailures = 0;
    }
  } catch (error) {
    log(`[${HOOK_NAME}] Injection failed`, { sessionID, error: String(error) });
    if (injectionState) {
      injectionState.inFlight = false;
      injectionState.lastInjectedAt = Date.now();
      injectionState.consecutiveFailures = (injectionState.consecutiveFailures ?? 0) + 1;
      const errorObj = error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) };
      if (isTokenLimitError(errorObj)) {
        injectionState.tokenLimitDetected = true;
        log(`[${HOOK_NAME}] Token limit error detected during injection, stopping continuation`, { sessionID });
      }
    }
  }
}

// src/hooks/todo-continuation-enforcer/countdown.ts
async function showCountdownToast(ctx, seconds, incompleteCount) {
  await ctx.client.tui.showToast({
    body: {
      title: "Todo Continuation",
      message: `Resuming in ${seconds}s... (${incompleteCount} tasks remaining)`,
      variant: "warning",
      duration: TOAST_DURATION_MS
    }
  }).catch(() => {});
}
function startCountdown(args) {
  const {
    ctx,
    sessionID,
    incompleteCount,
    resolvedInfo,
    backgroundManager,
    skipAgents,
    sessionStateStore,
    isContinuationStopped
  } = args;
  const state2 = sessionStateStore.getState(sessionID);
  sessionStateStore.cancelCountdown(sessionID);
  let secondsRemaining = COUNTDOWN_SECONDS;
  showCountdownToast(ctx, secondsRemaining, incompleteCount);
  state2.countdownStartedAt = Date.now();
  state2.countdownInterval = setInterval(() => {
    secondsRemaining--;
    if (secondsRemaining > 0) {
      showCountdownToast(ctx, secondsRemaining, incompleteCount);
    }
  }, 1000);
  state2.countdownTimer = setTimeout(() => {
    sessionStateStore.cancelCountdown(sessionID);
    injectContinuation({
      ctx,
      sessionID,
      backgroundManager,
      skipAgents,
      resolvedInfo,
      sessionStateStore,
      isContinuationStopped
    });
  }, COUNTDOWN_SECONDS * 1000);
  log(`[${HOOK_NAME}] Countdown started`, {
    sessionID,
    seconds: COUNTDOWN_SECONDS,
    incompleteCount
  });
}

// src/hooks/todo-continuation-enforcer/pending-question-detection.ts
init_logger();
var QUESTION_TOOL_NAMES2 = new Set(["question", "ask_user_question", "askuserquestion"]);
function getToolName(part) {
  return part.name ?? part.tool ?? part.toolName;
}
function isUnansweredQuestionTool(part) {
  const toolName = getToolName(part);
  if (!QUESTION_TOOL_NAMES2.has(toolName?.toLowerCase() ?? "")) {
    return false;
  }
  return part.state?.status !== "completed";
}
function hasUnansweredQuestion(messages) {
  if (!messages || messages.length === 0)
    return false;
  for (let i = messages.length - 1;i >= 0; i--) {
    const msg = messages[i];
    const role = msg.info?.role ?? msg.role;
    if (role === "user") {
      if (isSyntheticOrInternalUserMessage(msg)) {
        continue;
      }
      return false;
    }
    if (role === "assistant" && msg.parts) {
      const hasQuestion = msg.parts.some((part) => (part.type === "tool" || part.type === "tool_use" || part.type === "tool-invocation") && isUnansweredQuestionTool(part));
      if (hasQuestion) {
        log(`[${HOOK_NAME}] Detected pending question tool in last assistant message`);
        return true;
      }
      return false;
    }
  }
  return false;
}

// src/hooks/todo-continuation-enforcer/resolve-message-info.ts
async function resolveLatestMessageInfo(ctx, sessionID, prefetchedMessages) {
  const messages = prefetchedMessages ?? normalizeSDKResponse(await ctx.client.session.messages({
    path: { id: sessionID }
  }), []);
  let encounteredCompaction = false;
  let latestMessageWasCompaction = false;
  for (let i = messages.length - 1;i >= 0; i--) {
    const message = messages[i];
    const info = message.info;
    const isCompaction = isCompactionMessage(message);
    if (i === messages.length - 1) {
      latestMessageWasCompaction = isCompaction;
    }
    if (isCompaction) {
      encounteredCompaction = true;
      continue;
    }
    if (isSyntheticOrInternalUserMessage(message)) {
      continue;
    }
    if (info?.agent || info?.model || info?.modelID && info?.providerID) {
      return {
        resolvedInfo: {
          agent: info.agent,
          model: info.model ?? (info.providerID && info.modelID ? { providerID: info.providerID, modelID: info.modelID } : undefined),
          tools: info.tools
        },
        encounteredCompaction,
        latestMessageWasCompaction
      };
    }
  }
  return { resolvedInfo: undefined, encounteredCompaction, latestMessageWasCompaction };
}

// src/hooks/todo-continuation-enforcer/stagnation-detection.ts
init_logger();
function shouldStopForStagnation(args) {
  const { sessionID, incompleteCount, progressUpdate } = args;
  if (progressUpdate.hasProgressed) {
    log(`[${HOOK_NAME}] Progress detected: reset stagnation count`, {
      sessionID,
      previousIncompleteCount: progressUpdate.previousIncompleteCount,
      previousStagnationCount: progressUpdate.previousStagnationCount,
      incompleteCount,
      progressSource: progressUpdate.progressSource,
      recoveredFromStagnationStop: progressUpdate.previousStagnationCount >= MAX_STAGNATION_COUNT
    });
  }
  if (progressUpdate.stagnationCount < MAX_STAGNATION_COUNT) {
    return false;
  }
  log(`[${HOOK_NAME}] Skipped: todo continuation stagnated`, {
    sessionID,
    incompleteCount,
    previousIncompleteCount: progressUpdate.previousIncompleteCount,
    stagnationCount: progressUpdate.stagnationCount,
    maxStagnationCount: MAX_STAGNATION_COUNT
  });
  return true;
}

// src/hooks/todo-continuation-enforcer/idle-event.ts
async function handleSessionIdle(args) {
  const {
    ctx,
    sessionID,
    sessionStateStore,
    backgroundManager,
    skipAgents = DEFAULT_SKIP_AGENTS,
    isContinuationStopped
  } = args;
  log(`[${HOOK_NAME}] session.idle`, { sessionID });
  const state2 = sessionStateStore.getState(sessionID);
  const observedCompactionEpoch = state2.recentCompactionEpoch;
  if (state2.allTodosCompletedAt) {
    log(`[${HOOK_NAME}] Skipped: all todos were already completed`, { sessionID, allTodosCompletedAt: state2.allTodosCompletedAt });
    return;
  }
  if (state2.isRecovering) {
    log(`[${HOOK_NAME}] Skipped: in recovery`, { sessionID });
    return;
  }
  if (state2.wasCancelled) {
    log(`[${HOOK_NAME}] Skipped: session was cancelled`, { sessionID });
    return;
  }
  if (state2.tokenLimitDetected) {
    log(`[${HOOK_NAME}] Skipped: token limit error detected, retry would worsen context overflow`, { sessionID });
    return;
  }
  if (state2.abortDetectedAt) {
    const timeSinceAbort = Date.now() - state2.abortDetectedAt;
    if (timeSinceAbort < ABORT_WINDOW_MS) {
      log(`[${HOOK_NAME}] Skipped: abort detected via event ${timeSinceAbort}ms ago`, { sessionID });
      state2.abortDetectedAt = undefined;
      return;
    }
    state2.abortDetectedAt = undefined;
  }
  const hasRunningBgTasks = backgroundManager ? backgroundManager.getTasksByParentSession(sessionID).some((task) => task.status === "running" || task.status === "pending") : false;
  if (hasRunningBgTasks) {
    log(`[${HOOK_NAME}] Skipped: background tasks running`, { sessionID });
    return;
  }
  let prefetchedMessages;
  try {
    const messagesResp = await ctx.client.session.messages({
      path: { id: sessionID },
      query: { directory: ctx.directory }
    });
    prefetchedMessages = normalizeSDKResponse(messagesResp, []);
    if (isLastAssistantMessageAborted(prefetchedMessages)) {
      log(`[${HOOK_NAME}] Skipped: last assistant message was aborted (API fallback)`, { sessionID });
      return;
    }
    if (hasUnansweredQuestion(prefetchedMessages)) {
      log(`[${HOOK_NAME}] Skipped: pending question awaiting user response`, { sessionID });
      return;
    }
    if (latestAssistantTurnBlocksInternalPrompt(prefetchedMessages)) {
      log(`[${HOOK_NAME}] Skipped: pending internal continuation response`, { sessionID });
      return;
    }
  } catch (error) {
    log(`[${HOOK_NAME}] Messages fetch failed, skipping continuation`, { sessionID, error: String(error) });
    return;
  }
  let todos = [];
  try {
    const response = await ctx.client.session.todo({ path: { id: sessionID } });
    todos = normalizeSDKResponse(response, [], { preferResponseOnMissingData: true });
  } catch (error) {
    log(`[${HOOK_NAME}] Todo fetch failed`, { sessionID, error: String(error) });
    return;
  }
  if (!todos || todos.length === 0) {
    sessionStateStore.resetContinuationProgress(sessionID);
    log(`[${HOOK_NAME}] No todos`, { sessionID });
    return;
  }
  const incompleteCount = getIncompleteCount(todos);
  if (incompleteCount === 0) {
    state2.allTodosCompletedAt = Date.now();
    sessionStateStore.resetContinuationProgress(sessionID);
    log(`[${HOOK_NAME}] All todos complete`, { sessionID, total: todos.length });
    return;
  }
  if (state2.inFlight) {
    log(`[${HOOK_NAME}] Skipped: injection in flight`, { sessionID });
    return;
  }
  if (state2.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && state2.lastInjectedAt && Date.now() - state2.lastInjectedAt >= FAILURE_RESET_WINDOW_MS) {
    state2.consecutiveFailures = 0;
    log(`[${HOOK_NAME}] Reset consecutive failures after recovery window`, { sessionID, failureResetWindowMs: FAILURE_RESET_WINDOW_MS });
  }
  if (state2.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    log(`[${HOOK_NAME}] Skipped: max consecutive failures reached`, { sessionID, consecutiveFailures: state2.consecutiveFailures });
    return;
  }
  const effectiveCooldown = CONTINUATION_COOLDOWN_MS * 2 ** Math.min(state2.consecutiveFailures, 5);
  if (state2.lastInjectedAt && Date.now() - state2.lastInjectedAt < effectiveCooldown) {
    log(`[${HOOK_NAME}] Skipped: cooldown active`, { sessionID, effectiveCooldown, consecutiveFailures: state2.consecutiveFailures });
    return;
  }
  let resolvedInfo;
  let encounteredCompaction = false;
  let latestMessageWasCompaction = false;
  try {
    const messageInfoResult = await resolveLatestMessageInfo(ctx, sessionID, prefetchedMessages);
    resolvedInfo = messageInfoResult.resolvedInfo;
    encounteredCompaction = messageInfoResult.encounteredCompaction;
    latestMessageWasCompaction = messageInfoResult.latestMessageWasCompaction;
  } catch (error) {
    log(`[${HOOK_NAME}] Failed to fetch messages for agent check`, { sessionID, error: String(error) });
  }
  if (latestMessageWasCompaction) {
    log(`[${HOOK_NAME}] Skipped: latest message is a compaction marker`, { sessionID });
    return;
  }
  const sessionAgent = getSessionAgent(sessionID);
  if (!resolvedInfo?.agent && sessionAgent) {
    resolvedInfo = { ...resolvedInfo, agent: sessionAgent };
  }
  const acknowledgedCompaction = resolvedInfo?.agent ? acknowledgeCompactionGuard(state2, observedCompactionEpoch) : false;
  const compactionGuardActive = isCompactionGuardActive(state2, Date.now());
  log(`[${HOOK_NAME}] Agent check`, {
    sessionID,
    agentName: resolvedInfo?.agent,
    skipAgents,
    compactionGuardActive,
    observedCompactionEpoch,
    currentCompactionEpoch: state2.recentCompactionEpoch,
    acknowledgedCompaction
  });
  const resolvedAgentName = resolvedInfo?.agent;
  if (resolvedAgentName && skipAgents.some((s) => getAgentConfigKey(s) === getAgentConfigKey(resolvedAgentName))) {
    log(`[${HOOK_NAME}] Skipped: agent in skipAgents list`, { sessionID, agent: resolvedAgentName });
    return;
  }
  if ((compactionGuardActive || encounteredCompaction) && !resolvedInfo?.agent) {
    log(`[${HOOK_NAME}] Skipped: compaction occurred but no agent info resolved`, { sessionID });
    return;
  }
  if (compactionGuardActive) {
    log(`[${HOOK_NAME}] Skipped: compaction guard still armed for current epoch`, { sessionID, observedCompactionEpoch, currentCompactionEpoch: state2.recentCompactionEpoch });
    return;
  }
  if (isContinuationStopped?.(sessionID)) {
    log(`[${HOOK_NAME}] Skipped: continuation stopped for session`, { sessionID });
    return;
  }
  const progressUpdate = sessionStateStore.trackContinuationProgress(sessionID, incompleteCount, todos);
  if (shouldStopForStagnation({ sessionID, incompleteCount, progressUpdate })) {
    return;
  }
  startCountdown({
    ctx,
    sessionID,
    incompleteCount,
    total: todos.length,
    resolvedInfo,
    backgroundManager,
    skipAgents,
    sessionStateStore,
    isContinuationStopped
  });
}

// src/hooks/todo-continuation-enforcer/non-idle-events.ts
init_logger();
function isEventPart(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value;
  const type = record.type;
  const text = record.text;
  const synthetic = record.synthetic;
  return (type === undefined || typeof type === "string") && (text === undefined || typeof text === "string") && (synthetic === undefined || typeof synthetic === "boolean");
}
function resolveEventParts(properties) {
  const parts = properties?.parts;
  if (!Array.isArray(parts) || !parts.every(isEventPart)) {
    return;
  }
  return parts;
}
function hasInternalSystemDirective(parts) {
  return (parts ?? []).some((part) => part.type === "text" && typeof part.text === "string" && isSystemDirective(part.text));
}
function handleNonIdleEvent(args) {
  const { eventType, properties, sessionStateStore } = args;
  if (eventType === "message.updated") {
    const info = properties?.info;
    const sessionID = resolveMessageEventSessionID(properties);
    const role = info?.role;
    if (!sessionID)
      return;
    if (role === "user") {
      const parts = resolveEventParts(properties);
      if (isSyntheticOrInternalOnlyTextParts(parts)) {
        const state3 = sessionStateStore.getExistingState(sessionID);
        if (state3?.countdownStartedAt && hasInternalSystemDirective(parts)) {
          sessionStateStore.cancelCountdown(sessionID);
          log(`[${HOOK_NAME}] Cancelled countdown for internal continuation message`, { sessionID });
        }
        log(`[${HOOK_NAME}] Ignoring synthetic/internal user message event`, { sessionID });
        return;
      }
      const state2 = sessionStateStore.getExistingState(sessionID);
      if (state2?.countdownStartedAt) {
        const elapsed = Date.now() - state2.countdownStartedAt;
        if (elapsed < COUNTDOWN_GRACE_PERIOD_MS) {
          log(`[${HOOK_NAME}] Ignoring user message in grace period`, { sessionID, elapsed });
          return;
        }
      }
      if (state2) {
        state2.abortDetectedAt = undefined;
        state2.wasCancelled = false;
        state2.tokenLimitDetected = false;
      }
      sessionStateStore.cancelCountdown(sessionID);
      return;
    }
    if (role === "assistant") {
      const state2 = sessionStateStore.getExistingState(sessionID);
      if (state2) {
        state2.abortDetectedAt = undefined;
        state2.wasCancelled = false;
      }
      sessionStateStore.cancelCountdown(sessionID);
      return;
    }
    return;
  }
  if (eventType === "message.part.updated") {
    const targetSessionID = resolveMessageEventSessionID(properties);
    if (targetSessionID) {
      const state2 = sessionStateStore.getExistingState(targetSessionID);
      if (state2) {
        state2.abortDetectedAt = undefined;
      }
      sessionStateStore.cancelCountdown(targetSessionID);
    }
    return;
  }
  if (eventType === "message.part.delta") {
    const sessionID = resolveMessageEventSessionID(properties);
    if (sessionID) {
      const state2 = sessionStateStore.getExistingState(sessionID);
      if (state2) {
        state2.abortDetectedAt = undefined;
        state2.wasCancelled = false;
      }
      sessionStateStore.cancelCountdown(sessionID);
    }
    return;
  }
  if (eventType === "tool.execute.before" || eventType === "tool.execute.after") {
    const sessionID = resolveMessageEventSessionID(properties);
    if (sessionID) {
      const state2 = sessionStateStore.getExistingState(sessionID);
      if (state2) {
        state2.abortDetectedAt = undefined;
        state2.wasCancelled = false;
      }
      sessionStateStore.cancelCountdown(sessionID);
    }
    return;
  }
  if (eventType === "session.deleted") {
    const sessionID = resolveSessionEventID(properties);
    if (sessionID) {
      sessionStateStore.cleanup(sessionID);
      log(`[${HOOK_NAME}] Session deleted: cleaned up`, { sessionID });
    }
    return;
  }
}

// src/hooks/todo-continuation-enforcer/handler.ts
function asRecord(value) {
  return typeof value === "object" && value !== null ? value : undefined;
}
function getStringField2(record, key) {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
function extractSessionErrorInfo(error) {
  if (!error)
    return;
  if (typeof error === "string")
    return { message: error };
  if (error instanceof Error)
    return { name: error.name, message: error.message };
  const root = asRecord(error);
  if (!root)
    return { message: String(error) };
  const data = asRecord(root.data);
  const nestedError = asRecord(root.error);
  const dataError = asRecord(data?.error);
  const name = getStringField2(root, "name") ?? getStringField2(data, "name") ?? getStringField2(nestedError, "name") ?? getStringField2(dataError, "name");
  const messageParts = [
    getStringField2(root, "message"),
    getStringField2(data, "message"),
    getStringField2(nestedError, "message"),
    getStringField2(dataError, "message"),
    getStringField2(root, "code"),
    getStringField2(nestedError, "code"),
    getStringField2(dataError, "code")
  ].filter((message) => typeof message === "string");
  return { name, message: messageParts.join(" ") || undefined };
}
function createTodoContinuationHandler(args) {
  const {
    ctx,
    sessionStateStore,
    backgroundManager,
    skipAgents = DEFAULT_SKIP_AGENTS,
    isContinuationStopped
  } = args;
  return async ({ event }) => {
    const props = event.properties;
    if (event.type === "session.error") {
      const sessionID = resolveSessionEventID(props);
      if (!sessionID)
        return;
      const error = extractSessionErrorInfo(props?.error);
      let shouldCancelCountdown = false;
      if (error?.name === "MessageAbortedError" || error?.name === "AbortError") {
        const state2 = sessionStateStore.getState(sessionID);
        state2.wasCancelled = true;
        state2.abortDetectedAt = Date.now();
        state2.lastIncompleteCount = undefined;
        state2.lastInjectedAt = undefined;
        state2.awaitingPostInjectionProgressCheck = false;
        state2.stagnationCount = 0;
        state2.consecutiveFailures = 0;
        shouldCancelCountdown = true;
        log(`[${HOOK_NAME}] Abort detected via session.error`, { sessionID, errorName: error.name });
      } else if (isTokenLimitError(error)) {
        const state2 = sessionStateStore.getState(sessionID);
        state2.tokenLimitDetected = true;
        shouldCancelCountdown = true;
        log(`[${HOOK_NAME}] Token limit error detected via session.error`, { sessionID, errorName: error?.name, errorMessage: error?.message });
      }
      if (shouldCancelCountdown) {
        sessionStateStore.cancelCountdown(sessionID);
      }
      log(`[${HOOK_NAME}] session.error`, { sessionID });
      return;
    }
    if (event.type === "session.idle") {
      const sessionID = resolveSessionEventID(props);
      if (!sessionID)
        return;
      sessionStateStore.startPruneInterval();
      await handleSessionIdle({
        ctx,
        sessionID,
        sessionStateStore,
        backgroundManager,
        skipAgents,
        isContinuationStopped
      });
      return;
    }
    if (event.type === "session.compacted") {
      const sessionID = resolveSessionEventID(props);
      if (sessionID) {
        const state2 = sessionStateStore.getState(sessionID);
        const compactionEpoch = armCompactionGuard(state2, Date.now());
        log(`[${HOOK_NAME}] Session compacted: armed compaction guard`, { sessionID, compactionEpoch });
      }
      return;
    }
    if (event.type === "session.deleted") {
      const sessionID = resolveSessionEventID(props);
      if (sessionID) {
        clearContinuationMarker(ctx.directory, sessionID);
      }
    }
    handleNonIdleEvent({
      eventType: event.type,
      properties: props,
      sessionStateStore
    });
  };
}

// src/hooks/todo-continuation-enforcer/session-state.ts
var SESSION_STATE_TTL_MS = 10 * 60 * 1000;
var SESSION_STATE_PRUNE_INTERVAL_MS = 2 * 60 * 1000;
function getTodoSnapshot(todos) {
  const entries = todos.map((todo) => ({
    key: todo.id ?? `${todo.content}:${todo.priority}`,
    status: todo.status
  })).sort((left, right) => left.key.localeCompare(right.key)).map(({ key, status }) => `${key}=${status}`);
  return entries.join("|");
}
function createSessionStateStore() {
  const sessions = new Map;
  let pruneInterval;
  let pruneIntervalStarted = false;
  function startPruneInterval() {
    if (pruneIntervalStarted) {
      return;
    }
    pruneIntervalStarted = true;
    pruneInterval = setInterval(() => {
      const now = Date.now();
      for (const [sessionID, tracked] of sessions.entries()) {
        if (now - tracked.lastAccessedAt > SESSION_STATE_TTL_MS) {
          cancelCountdown(sessionID);
          sessions.delete(sessionID);
        }
      }
    }, SESSION_STATE_PRUNE_INTERVAL_MS);
    if (typeof pruneInterval === "object" && typeof pruneInterval.unref === "function") {
      pruneInterval.unref();
    }
  }
  function getTrackedSession(sessionID) {
    const existing = sessions.get(sessionID);
    if (existing) {
      existing.lastAccessedAt = Date.now();
      return existing;
    }
    const rawState = {
      stagnationCount: 0,
      consecutiveFailures: 0
    };
    const trackedSession = {
      state: rawState,
      lastAccessedAt: Date.now()
    };
    sessions.set(sessionID, trackedSession);
    return trackedSession;
  }
  function getState(sessionID) {
    return getTrackedSession(sessionID).state;
  }
  function getExistingState(sessionID) {
    const existing = sessions.get(sessionID);
    if (existing) {
      existing.lastAccessedAt = Date.now();
      return existing.state;
    }
    return;
  }
  function trackContinuationProgress(sessionID, incompleteCount, todos) {
    const trackedSession = getTrackedSession(sessionID);
    const state2 = trackedSession.state;
    const previousIncompleteCount = state2.lastIncompleteCount;
    const previousStagnationCount = state2.stagnationCount;
    const currentCompletedCount = todos?.filter((todo) => todo.status === "completed").length;
    const currentTodoSnapshot = todos ? getTodoSnapshot(todos) : undefined;
    const hasCompletedMoreTodos = currentCompletedCount !== undefined && trackedSession.lastCompletedCount !== undefined && currentCompletedCount > trackedSession.lastCompletedCount;
    const hasTodoSnapshotChanged = currentTodoSnapshot !== undefined && trackedSession.lastTodoSnapshot !== undefined && currentTodoSnapshot !== trackedSession.lastTodoSnapshot;
    const hadSuccessfulInjectionAwaitingProgressCheck = state2.awaitingPostInjectionProgressCheck === true;
    state2.lastIncompleteCount = incompleteCount;
    if (currentCompletedCount !== undefined) {
      trackedSession.lastCompletedCount = currentCompletedCount;
    }
    if (currentTodoSnapshot !== undefined) {
      trackedSession.lastTodoSnapshot = currentTodoSnapshot;
    }
    if (previousIncompleteCount === undefined) {
      state2.stagnationCount = 0;
      return {
        previousIncompleteCount,
        previousStagnationCount,
        stagnationCount: state2.stagnationCount,
        hasProgressed: false,
        progressSource: "none"
      };
    }
    const hasProgressed = incompleteCount < previousIncompleteCount || hasCompletedMoreTodos || hasTodoSnapshotChanged;
    if (hasProgressed) {
      state2.stagnationCount = 0;
      state2.awaitingPostInjectionProgressCheck = false;
      return {
        previousIncompleteCount,
        previousStagnationCount,
        stagnationCount: state2.stagnationCount,
        hasProgressed: true,
        progressSource: "todo"
      };
    }
    if (!hadSuccessfulInjectionAwaitingProgressCheck) {
      return {
        previousIncompleteCount,
        previousStagnationCount,
        stagnationCount: state2.stagnationCount,
        hasProgressed: false,
        progressSource: "none"
      };
    }
    state2.awaitingPostInjectionProgressCheck = false;
    state2.stagnationCount += 1;
    return {
      previousIncompleteCount,
      previousStagnationCount,
      stagnationCount: state2.stagnationCount,
      hasProgressed: false,
      progressSource: "none"
    };
  }
  function resetContinuationProgress(sessionID) {
    const trackedSession = sessions.get(sessionID);
    if (!trackedSession)
      return;
    trackedSession.lastAccessedAt = Date.now();
    const { state: state2 } = trackedSession;
    state2.lastIncompleteCount = undefined;
    state2.stagnationCount = 0;
    state2.awaitingPostInjectionProgressCheck = false;
    state2.allTodosCompletedAt = undefined;
    trackedSession.lastCompletedCount = undefined;
    trackedSession.lastTodoSnapshot = undefined;
  }
  function cancelCountdown(sessionID) {
    const tracked = sessions.get(sessionID);
    if (!tracked)
      return;
    const state2 = tracked.state;
    if (state2.countdownTimer) {
      clearTimeout(state2.countdownTimer);
      state2.countdownTimer = undefined;
    }
    if (state2.countdownInterval) {
      clearInterval(state2.countdownInterval);
      state2.countdownInterval = undefined;
    }
    state2.inFlight = false;
    state2.countdownStartedAt = undefined;
  }
  function cleanup(sessionID) {
    cancelCountdown(sessionID);
    sessions.delete(sessionID);
  }
  function cancelAllCountdowns() {
    for (const sessionID of sessions.keys()) {
      cancelCountdown(sessionID);
    }
  }
  function shutdown() {
    if (pruneInterval !== undefined) {
      clearInterval(pruneInterval);
    }
    cancelAllCountdowns();
    sessions.clear();
  }
  return {
    getState,
    getExistingState,
    startPruneInterval,
    trackContinuationProgress,
    resetContinuationProgress,
    cancelCountdown,
    cleanup,
    cancelAllCountdowns,
    shutdown
  };
}

// src/hooks/todo-continuation-enforcer/index.ts
function createTodoContinuationEnforcer(ctx, options = {}) {
  const {
    backgroundManager,
    skipAgents = DEFAULT_SKIP_AGENTS,
    isContinuationStopped
  } = options;
  const sessionStateStore = createSessionStateStore();
  const markRecovering = (sessionID) => {
    const state2 = sessionStateStore.getState(sessionID);
    state2.isRecovering = true;
    sessionStateStore.cancelCountdown(sessionID);
    log(`[${HOOK_NAME}] Session marked as recovering`, { sessionID });
  };
  const markRecoveryComplete = (sessionID) => {
    const state2 = sessionStateStore.getExistingState(sessionID);
    if (state2) {
      state2.isRecovering = false;
      log(`[${HOOK_NAME}] Session recovery complete`, { sessionID });
    }
  };
  const handler = createTodoContinuationHandler({
    ctx,
    sessionStateStore,
    backgroundManager,
    skipAgents,
    isContinuationStopped
  });
  const cancelAllCountdowns = () => {
    sessionStateStore.cancelAllCountdowns();
    log(`[${HOOK_NAME}] All countdowns cancelled`);
  };
  return {
    handler,
    markRecovering,
    markRecoveryComplete,
    cancelAllCountdowns,
    dispose: () => sessionStateStore.shutdown()
  };
}

// src/mcp/ast-grep.ts
import { existsSync as existsSync8 } from "fs";
import { dirname as dirname3, resolve } from "path";
import { fileURLToPath } from "url";

// src/mcp/cli-suffix.ts
function normalizeCliPath(path5) {
  return path5.replaceAll("\\", "/");
}
function hasCliSuffix(candidatePath, suffix) {
  return normalizeCliPath(candidatePath).endsWith(normalizeCliPath(suffix));
}

// src/mcp/runtime-executable.ts
init_bun_which_shim();
import { basename } from "path";
var NODE_EXECUTABLE_NAMES = new Set(["node", "node.exe"]);
function isUnsafeCommandName2(commandName) {
  if (commandName.length === 0)
    return true;
  if (commandName.includes("/") || commandName.includes("\\"))
    return true;
  if (commandName === "." || commandName === ".." || commandName.includes(".."))
    return true;
  if (/^[a-zA-Z]:/.test(commandName))
    return true;
  if (commandName.includes("\x00"))
    return true;
  return false;
}
function isNodeExecPath(execPath) {
  return NODE_EXECUTABLE_NAMES.has(basename(execPath).toLowerCase());
}
function resolveRuntimeExecutable(commandName, options = {}) {
  if (isUnsafeCommandName2(commandName)) {
    return { command: commandName, available: false };
  }
  const execPath = options.execPath ?? process.execPath;
  if (commandName === "node" && isNodeExecPath(execPath)) {
    return { command: execPath, available: true };
  }
  const resolved = (options.which ?? bunWhich)(commandName);
  if (resolved) {
    return { command: resolved, available: true };
  }
  return { command: commandName, available: false };
}

// src/mcp/ast-grep.ts
var PACKAGE_REL = "packages/ast-grep-mcp";
var DIST_CLI_REL = "dist/cli.js";
var SOURCE_CLI_REL = "src/cli.ts";
var WORKSPACE_ENV = "OMO_AST_GREP_WORKSPACE";
var DISABLED_TOOLS_ENV = "OMO_AST_GREP_DISABLED_TOOLS";
var MCP_TOOL_BY_OPENCODE_TOOL = {
  ast_grep_search: "search",
  ast_grep_replace: "replace"
};
function resolveJavaScriptRuntime(resolveExecutable) {
  const node = resolveExecutable("node");
  return node.available ? node : resolveExecutable("bun");
}
function addAncestorCommandCandidates(startDirectory, target, seenPaths, pathExists, resolveExecutable) {
  let currentDirectory = resolve(startDirectory);
  while (true) {
    const distCliPath = resolve(currentDirectory, PACKAGE_REL, DIST_CLI_REL);
    if (!seenPaths.has(distCliPath)) {
      const runtime5 = resolveJavaScriptRuntime(resolveExecutable);
      seenPaths.add(distCliPath);
      target.push({
        command: [runtime5.command, distCliPath, "mcp"],
        path: distCliPath,
        exists: runtime5.available && pathExists(distCliPath),
        runtimeAvailable: runtime5.available
      });
    }
    const sourceCliPath = resolve(currentDirectory, PACKAGE_REL, SOURCE_CLI_REL);
    if (!seenPaths.has(sourceCliPath)) {
      const runtime5 = resolveExecutable("bun");
      seenPaths.add(sourceCliPath);
      target.push({
        command: [runtime5.command, sourceCliPath, "mcp"],
        path: sourceCliPath,
        exists: runtime5.available && pathExists(sourceCliPath),
        runtimeAvailable: runtime5.available
      });
    }
    const parentDirectory = resolve(currentDirectory, "..");
    if (parentDirectory === currentDirectory)
      return;
    currentDirectory = parentDirectory;
  }
}
function getModuleDirectory(moduleUrl) {
  try {
    return dirname3(fileURLToPath(moduleUrl));
  } catch (error) {
    if (!(error instanceof Error))
      throw error;
    return null;
  }
}
function createFallbackCandidate(resolveExecutable) {
  const runtime5 = resolveJavaScriptRuntime(resolveExecutable);
  const path5 = resolve(PACKAGE_REL, DIST_CLI_REL);
  return { command: [runtime5.command, path5, "mcp"], path: path5, exists: runtime5.available, runtimeAvailable: runtime5.available };
}
function resolveAstGrepCommand(options = {}) {
  const pathExists = options.exists ?? existsSync8;
  const resolveExecutable = options.resolveExecutable ?? resolveRuntimeExecutable;
  const candidates = [];
  const seenPaths = new Set;
  const moduleDirectory = getModuleDirectory(options.moduleUrl ?? import.meta.url);
  if (moduleDirectory)
    addAncestorCommandCandidates(moduleDirectory, candidates, seenPaths, pathExists, resolveExecutable);
  const distCandidate = candidates.find((candidate) => hasCliSuffix(candidate.path, DIST_CLI_REL) && candidate.exists);
  if (distCandidate)
    return distCandidate;
  const sourceCandidate = candidates.find((candidate) => hasCliSuffix(candidate.path, SOURCE_CLI_REL) && candidate.exists);
  if (sourceCandidate)
    return sourceCandidate;
  const fallbackCandidate = candidates.find((candidate) => hasCliSuffix(candidate.path, DIST_CLI_REL)) ?? createFallbackCandidate(resolveExecutable);
  return { ...fallbackCandidate, exists: fallbackCandidate.runtimeAvailable };
}
function astGrepDisabledTools(disabledTools) {
  if (!disabledTools)
    return "";
  return disabledTools.map((toolName) => MCP_TOOL_BY_OPENCODE_TOOL[toolName]).filter((toolName) => typeof toolName === "string").join(",");
}
function createAstGrepMcpConfig(options = {}) {
  const workspaceDirectory = options.cwd ?? process.cwd();
  const resolvedCommand = resolveAstGrepCommand(options);
  return {
    type: "local",
    command: resolvedCommand.command,
    enabled: resolvedCommand.exists,
    environment: {
      [WORKSPACE_ENV]: workspaceDirectory,
      [DISABLED_TOOLS_ENV]: astGrepDisabledTools(options.disabledTools)
    }
  };
}

// src/mcp/lsp.ts
import { existsSync as existsSync9 } from "fs";
import { delimiter as delimiter2, dirname as dirname4, resolve as resolve2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var PACKAGE_REL2 = "packages/lsp-tools-mcp";
var DIST_CLI_REL2 = "dist/cli.js";
var SOURCE_CLI_REL2 = "src/cli.ts";
var PROJECT_LSP_CONFIGS = [".opencode/lsp.json", ".omo/lsp.json", ".omo/lsp-client.json"];
var LSP_BOOTSTRAP_SCRIPT = [
  "const { existsSync } = require('node:fs')",
  "const { join } = require('node:path')",
  "const { spawnSync } = require('node:child_process')",
  "const root = process.argv[1]",
  "const npm = process.argv[2] || 'npm'",
  "const bun = process.argv[3] || 'bun'",
  "const lspPackage = join(root, 'packages/lsp-tools-mcp')",
  "const dist = join(lspPackage, 'dist/cli.js')",
  "const source = join(lspPackage, 'src/cli.ts')",
  "const run = (command, args, stdio) => spawnSync(command, args, { cwd: root, env: process.env, stdio })",
  "const finish = (result) => { if (result.error) { console.error(result.error.message); process.exit(1) } process.exit(result.status ?? 1) }",
  "const runIfAvailable = (command, args) => { const result = run(command, args, 'inherit'); if (result.error) return false; finish(result); return true }",
  "if (existsSync(dist)) finish(run(process.execPath, [dist, 'mcp'], 'inherit'))",
  "if (existsSync(source)) runIfAvailable(bun, [source, 'mcp'])",
  "for (const [command, args] of [[npm, ['--prefix', lspPackage, 'install', '--no-package-lock', '--no-audit', '--no-fund']], [npm, ['--prefix', lspPackage, 'run', 'build']]]) { const result = run(command, args, ['ignore', 'ignore', 'inherit']); if (result.error || result.status !== 0) finish(result) }",
  "finish(run(process.execPath, [dist, 'mcp'], 'inherit'))"
].join(";");
function addAncestorCommandCandidates2(startDirectory, target, seenPaths, pathExists, resolveExecutable) {
  let currentDirectory = resolve2(startDirectory);
  while (true) {
    const distCliPath = resolve2(currentDirectory, PACKAGE_REL2, DIST_CLI_REL2);
    if (!seenPaths.has(distCliPath)) {
      const runtime5 = resolveJavaScriptRuntime2(resolveExecutable);
      seenPaths.add(distCliPath);
      target.push({
        command: [runtime5.command, distCliPath, "mcp"],
        root: currentDirectory,
        path: distCliPath,
        exists: runtime5.available && pathExists(distCliPath)
      });
    }
    const sourceCliPath = resolve2(currentDirectory, PACKAGE_REL2, SOURCE_CLI_REL2);
    if (!seenPaths.has(sourceCliPath)) {
      const runtime5 = resolveExecutable("bun");
      seenPaths.add(sourceCliPath);
      target.push({
        command: [runtime5.command, sourceCliPath, "mcp"],
        root: currentDirectory,
        path: sourceCliPath,
        exists: runtime5.available && pathExists(sourceCliPath)
      });
    }
    const parentDirectory = resolve2(currentDirectory, "..");
    if (parentDirectory === currentDirectory) {
      return;
    }
    currentDirectory = parentDirectory;
  }
}
function getModuleDirectory2(moduleUrl) {
  try {
    return dirname4(fileURLToPath2(moduleUrl));
  } catch (error) {
    if (!(error instanceof Error))
      throw error;
    return null;
  }
}
function findBootstrapRoot(candidates, pathExists) {
  return candidates.find((candidate) => pathExists(resolve2(candidate.root, "package.json")))?.root ?? process.cwd();
}
function resolveJavaScriptRuntime2(resolveExecutable) {
  const node = resolveExecutable("node");
  return node.available ? node : resolveExecutable("bun");
}
function createBootstrapCandidate(root, pathExists, resolveExecutable) {
  const runtime5 = resolveJavaScriptRuntime2(resolveExecutable);
  const bun = resolveExecutable("bun");
  const npm = resolveExecutable("npm");
  const packageManifestPath = resolve2(root, PACKAGE_REL2, "package.json");
  return {
    command: [runtime5.command, "-e", LSP_BOOTSTRAP_SCRIPT, root, npm.command, bun.command],
    root,
    path: resolve2(root, PACKAGE_REL2, DIST_CLI_REL2),
    exists: runtime5.available && npm.available && pathExists(packageManifestPath)
  };
}
function resolveLspCommand(options = {}) {
  const pathExists = options.exists ?? existsSync9;
  const resolveExecutable = options.resolveExecutable ?? resolveRuntimeExecutable;
  const candidates = [];
  const seenPaths = new Set;
  const moduleDirectory = getModuleDirectory2(options.moduleUrl ?? import.meta.url);
  if (moduleDirectory) {
    addAncestorCommandCandidates2(moduleDirectory, candidates, seenPaths, pathExists, resolveExecutable);
  }
  const distCandidate = candidates.find((candidate) => hasCliSuffix(candidate.path, DIST_CLI_REL2) && candidate.exists);
  if (distCandidate) {
    return distCandidate;
  }
  const sourceCandidate = candidates.find((candidate) => hasCliSuffix(candidate.path, SOURCE_CLI_REL2) && candidate.exists);
  if (sourceCandidate) {
    return sourceCandidate;
  }
  return createBootstrapCandidate(findBootstrapRoot(candidates, pathExists), pathExists, resolveExecutable);
}
function createLspMcpConfig(options = {}) {
  const resolvedCommand = resolveLspCommand(options);
  return {
    type: "local",
    command: resolvedCommand.command,
    enabled: resolvedCommand.exists,
    environment: {
      LSP_TOOLS_MCP_PROJECT_CONFIG: PROJECT_LSP_CONFIGS.join(delimiter2)
    }
  };
}

// src/mcp/grep-app.ts
var grep_app = {
  type: "remote",
  url: "https://mcp.grep.app",
  enabled: true,
  oauth: false
};

// src/mcp/websearch.ts
init_logger();
function createWebsearchConfig(config) {
  const provider = config?.provider || "exa";
  if (provider === "tavily") {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) {
      log("[websearch] Tavily API key not found, skipping websearch MCP");
      return;
    }
    return {
      type: "remote",
      url: "https://mcp.tavily.com/mcp/",
      enabled: true,
      headers: {
        Authorization: `Bearer ${tavilyKey}`
      },
      oauth: false
    };
  }
  return {
    type: "remote",
    url: "https://mcp.exa.ai/mcp?tools=web_search_exa",
    enabled: true,
    ...process.env.EXA_API_KEY ? { headers: { Authorization: `Bearer ${process.env.EXA_API_KEY}` } } : {},
    oauth: false
  };
}
var websearch = createWebsearchConfig();

// src/tool-only.ts
function asRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function applyToolOnlyConfig(config, directory) {
  const userMcp = asRecord2(config.mcp);
  const websearch2 = createWebsearchConfig();
  config.mcp = {
    lsp: createLspMcpConfig(),
    ast_grep: createAstGrepMcpConfig({ cwd: directory }),
    grep_app,
    ...websearch2 ? { websearch: websearch2 } : {},
    ...userMcp
  };
}
function restoreStoredToolMetadata(input, output) {
  const stored = recoverToolMetadata(input.sessionID, input);
  if (!stored)
    return;
  if (stored.title) {
    output.title = stored.title;
  }
  if (stored.metadata) {
    output.metadata = { ...output.metadata, ...stored.metadata };
  }
}
var server = async (ctx) => {
  const hashlineReadEnhancer = createHashlineReadEnhancerHook(ctx, { hashline_edit: { enabled: true } });
  const todoContinuationEnforcer = createTodoContinuationEnforcer(ctx);
  return {
    config: async (config) => {
      applyToolOnlyConfig(config, ctx.directory);
    },
    event: todoContinuationEnforcer.handler,
    "tool.execute.after": async (input, output) => {
      if (!output)
        return;
      restoreStoredToolMetadata(input, output);
      await hashlineReadEnhancer["tool.execute.after"]?.(input, output);
    },
    tool: {
      edit: createHashlineEditTool(ctx),
      apply_patch: createHashlineApplyPatchTool(ctx)
    },
    dispose: async () => {
      todoContinuationEnforcer.dispose();
    }
  };
};
var pluginModule = {
  id: "oh-my-openagent-tool-only",
  server
};
var tool_only_default = pluginModule;
export {
  tool_only_default as default
};
