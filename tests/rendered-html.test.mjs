import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import {
  localRuntimeIds,
  localRuntimePresets,
} from "../scripts/local-runtime-config.mjs";

const publicEntry = new URL("../public/crow-godmod3.html", import.meta.url);
const publicTheme = new URL("../public/crow-theme/", import.meta.url);
const sourceTheme = new URL("../brand-system/", import.meta.url);
const localModelsGuide = new URL("../docs/LOCAL_MODELS.md", import.meta.url);
const publicLocalModelsGuide = new URL(
  "../public/LOCAL_MODELS.md",
  import.meta.url,
);
const openRouterFreeChatModels = [
  "inclusionai/ling-3.0-flash:free",
  "poolside/laguna-s-2.1:free",
  "poolside/laguna-xs-2.1:free",
  "cohere/north-mini-code:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "openai/gpt-oss-20b:free",
];

async function render(path = "/?source=test") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const source = await readFile(publicEntry, "utf8");

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => {
          const requestedUrl = new URL(request.url);
          assert.equal(requestedUrl.pathname, "/crow-godmod3.html");
          assert.equal(requestedUrl.search, "?source=test");
          return new Response(source, {
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        },
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("serves the verified static clone directly at the root", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.ok(html.length > 500_000);
  assert.match(html, /<title>Crow-GodMod3<\/title>/i);
  assert.match(html, />Crow-GodMod3</);
  assert.match(html, /data-crow-product="crow-godmod3"/);
  assert.match(html, /crow-signal-app-rounded-256\.png/);
  assert.match(html, /crow-godmod3-1920x1080\.png/);
  assert.match(html, /fonts\/bitfeather\/crow-bitfeather\.css/);
  assert.match(html, /cursors\/v0\.5\/src\/32\/normal\.png/);
  assert.match(html, /cursors\/v0\.5\/src\/32\/link\.png/);
  assert.match(html, /cursors\/v0\.5\/src\/32\/text\.png/);
  assert.match(html, /cursors\/v0\.5\/src\/32\/move\.png/);
  assert.match(html, /cursors\/v0\.5\/src\/32\/unavailable\.png/);
  assert.match(html, /CROW SYSTEM \/\/ GLITCH ASCENDANT/);
  assert.match(html, /ULTRAPLINIAN/);
  assert.match(html, /PARSELTONGUE/);
  assert.match(html, /OpenRouter/);
  assert.match(html, /const APP_TELEMETRY_ENABLED = false;/);
  assert.doesNotMatch(html, /<iframe\b/i);
  assert.doesNotMatch(html, /crow-mascot-v3|CANONICAL MASCOT V3/i);
  assert.doesNotMatch(
    html,
    /crowThemeModal|openCrowThemePack|theme-pack-cta|crow-theme-btn|Explore the Crow Theme|\/crow-theme\/(?:index\.html|downloads\/|docs\/)/i,
  );
});

test("contains no orange, amber, yellow, or gold visual colour tokens", async () => {
  const html = await readFile(publicEntry, "utf8");
  const forbidden =
    /#(?:f59e0b|f97316|fbbf24|ff6600|ff7b00|ff9900|ffa500|ffaa00|ffb733|ffcc00|ffd700)\b|rgba\(\s*255\s*,\s*(?:100|102|123|153|165|170|204|215)\s*,|rgba\(\s*251\s*,\s*191\s*,\s*36|rgba\(\s*249\s*,\s*115\s*,\s*22|rgba\(\s*245\s*,\s*158\s*,\s*11/gi;
  assert.doesNotMatch(html, forbidden);
});

test("routes OpenRouter chat through the configured free-model allowlist", async () => {
  const html = await readFile(publicEntry, "utf8");
  const expectedModels = [...openRouterFreeChatModels].sort();

  const allowlistMatch = html.match(
    /const OPENROUTER_FREE_CHAT_MODELS = Object\.freeze\((\[[^\n]+\])\);/,
  );
  assert.ok(allowlistMatch, "Missing the runtime OpenRouter free-model allowlist");
  assert.deepEqual(JSON.parse(allowlistMatch[1]).sort(), expectedModels);
  assert.match(
    html,
    /const OPENROUTER_DEFAULT_MODEL = "nvidia\/nemotron-3-ultra-550b-a55b:free";/,
  );

  for (const selectId of ["modelSelect", "defaultModelInput"]) {
    const selectMatch = html.match(
      new RegExp(`<select[^>]*id="${selectId}"[^>]*>([\\s\\S]*?)<\\/select>`),
    );
    assert.ok(selectMatch, `Missing ${selectId}`);
    const values = [
      ...selectMatch[1].matchAll(/<option value="([^"]+)"/g),
    ].map((match) => match[1]);
    assert.deepEqual([...values].sort(), expectedModels);
    assert.ok(values.every((value) => value.endsWith(":free")));
  }

  const tierMatch = html.match(
    /const ULTRAPLINIAN_MODELS = \[([\s\S]*?)\n    \];/,
  );
  assert.ok(tierMatch, "Missing ULTRAPLINIAN model tiers");
  const tierModels = [...tierMatch[1].matchAll(/'([^']+)'/g)].map(
    (match) => match[1],
  );
  assert.deepEqual([...tierModels].sort(), expectedModels);
  assert.match(
    html,
    /const TIER_SIZES = \{ fast: 3, standard: 5, smart: 8, power: 11, ultra: 13 \};/,
  );

  const hardCodedChatModels = [
    ...html.matchAll(/model:\s*'([^']+)'/g),
  ]
    .map((match) => match[1])
    .filter((model) => model.includes("/"));
  assert.ok(hardCodedChatModels.length > 0);
  for (const model of hardCodedChatModels) {
    assert.ok(
      openRouterFreeChatModels.includes(model),
      `Non-allowlisted hard-coded chat model: ${model}`,
    );
  }

  for (const specialistModel of [
    "nvidia/nemotron-3.5-content-safety:free",
    "nvidia/llama-nemotron-embed-vl-1b-v2:free",
    "nvidia/llama-nemotron-rerank-vl-1b-v2:free",
    "nvidia/nemotron-3-embed-1b:free",
  ]) {
    assert.ok(!allowlistMatch[1].includes(specialistModel));
  }

  assert.match(
    html,
    /provider: 'openrouter',\s+model: normalizeOpenRouterModel\(openRouterModel\),\s+url: 'https:\/\/openrouter\.ai\/api\/v1\/chat\/completions'/,
  );
  assert.match(
    html,
    /normalizeOpenRouterRequestBody\(\{ \.\.\.body, model: target\.model \}\)/,
  );
  assert.doesNotMatch(
    html,
    /fetch\('https:\/\/openrouter\.ai\/api\/v1\/chat\/completions'|fetch\(fetchUrl/,
    "Mode-specific requests must use the provider-aware transport",
  );
});

test("migrates saved paid-model selections to valid free chat models", async () => {
  const html = await readFile(publicEntry, "utf8");

  assert.match(
    html,
    /"openai\/gpt-oss-20b":"openai\/gpt-oss-20b:free"/,
  );
  assert.match(
    html,
    /state\.model = normalizePersistedChatModel\(state\.model\);/,
  );
  assert.match(
    html,
    /conv\.model = normalizePersistedChatModel\(conv\.model \|\| state\.model\);/,
  );
});

test("ships first-class loopback presets for every supported local runtime", async () => {
  assert.deepEqual(localRuntimeIds, [
    "ollama",
    "lmstudio",
    "docker",
    "vllm",
    "llamacpp",
    "custom",
  ]);
  assert.equal(
    localRuntimePresets.lmstudio.baseUrl,
    "http://localhost:1234/v1",
  );
  assert.equal(
    localRuntimePresets.docker.baseUrl,
    "http://localhost:12434/engines/v1",
  );
  assert.equal(localRuntimePresets.vllm.baseUrl, "http://localhost:8000/v1");
  assert.equal(
    localRuntimePresets.llamacpp.baseUrl,
    "http://localhost:8080/v1",
  );

  const html = await readFile(publicEntry, "utf8");
  const selectMatch = html.match(
    /<select id="localRuntimeInput"[^>]*>([\s\S]*?)<\/select>/,
  );
  assert.ok(selectMatch, "Missing local runtime selector");
  const values = [...selectMatch[1].matchAll(/<option value="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(values, localRuntimeIds);
  assert.match(html, /Docker Model Runner uses the nested <code>\/engines\/v1/);
  assert.match(html, /approve Local Network Access if prompted/);
  assert.match(html, /function applyLocalRuntimePreset\(runtime\)/);
  assert.match(
    html,
    /state\.localRuntime = normalizeLocalRuntime\(state\.localRuntime, state\.localBaseUrl\);/,
  );

  const openSettingsStart = html.indexOf("function openSettings()");
  const openSettingsEnd = html.indexOf(
    "\n\n    function switchSettingsTab",
    openSettingsStart,
  );
  const openSettingsSource = html.slice(openSettingsStart, openSettingsEnd);
  assert.doesNotMatch(
    openSettingsSource,
    /applyLocalRuntimePreset\(/,
    "Opening settings must not overwrite a saved custom URL",
  );
  assert.match(openSettingsSource, /updateLocalRuntimeHelp\(state\.localRuntime\)/);
});

test("keeps an explicit provider-qualified model choice for every mode", async () => {
  const html = await readFile(publicEntry, "utf8");

  assert.match(
    html,
    /modeModelSelections: null,\s+\/\/ Explicit provider \+ model, saved independently for each mode/,
  );
  assert.match(
    html,
    /id="modelSelect" onchange="setCurrentModeModelSelection\(this\.value\)"/,
  );
  assert.match(
    html,
    /selector\.style\.display = 'block';[\s\S]*refreshModeModelSelect\(\);/,
  );
  assert.match(
    html,
    /ultraplinian: 'Automatic · race all available models'/,
  );
  assert.match(
    html,
    /parseltongue: 'Automatic · best configured provider'/,
  );
  assert.match(
    html,
    /pliny: 'Automatic · paired model for each prompt'/,
  );
  assert.match(
    html,
    /pliny: 'Crow-GodMod3 CLASSIC',[\s\S]*select\.setAttribute\('aria-label', `Model for \$\{modeLabels\[mode\] \|\| mode\}`\)/,
  );
  const chatHeaderRules = [
    ...html.matchAll(/\.chat-header\s*\{([^}]*)\}/g),
  ].map((match) => match[1]);
  assert.ok(
    chatHeaderRules.some(
      (rule) => /position:\s*sticky;/.test(rule) && /top:\s*0;/.test(rule),
    ),
    "The mobile chat header must remain sticky",
  );
  assert.ok(
    chatHeaderRules.some(
      (rule) =>
        /backdrop-filter:\s*blur\(16px\);/.test(rule) &&
        /z-index:\s*50;/.test(rule) &&
        /overflow:\s*visible;/.test(rule),
    ),
    "The mode menu must stack above the conversation panel so every mode remains clickable",
  );

  const helperStart = html.indexOf("function inferPersistedModelProvider");
  const helperEnd = html.indexOf(
    "\n\n    function appendModeModelOptions",
    helperStart,
  );
  assert.ok(helperStart > 0 && helperEnd > helperStart);

  const context = vm.createContext({
    state: {
      apiKey: "openrouter-present",
      veniceApiKey: "",
      localOnly: false,
      localEnabled: true,
      localModels: "same/model, lm-beta",
      model: "same/model",
      modeModelSelections: {
        ultraplinian: { provider: "local", model: "lm-beta" },
        parseltongue: { provider: "local", model: "same/model" },
        pliny: { provider: "openrouter", model: "same/model" },
      },
    },
    OPENROUTER_DEFAULT_MODEL: "same/model",
    OPENROUTER_LEGACY_MODEL_MIGRATIONS: {},
    OPENROUTER_FREE_CHAT_MODEL_SET: new Set(["same/model"]),
    VENICE_MODELS: [],
    MODE_MODEL_PROVIDERS: new Set([
      "auto",
      "openrouter",
      "venice",
      "local",
    ]),
    MODE_MODEL_IDS: new Set(["ultraplinian", "parseltongue", "pliny"]),
    getLocalModels() {
      return ["same/model", "lm-beta"];
    },
    hasLocalProvider() {
      return true;
    },
    getCurrentMode() {
      return "parseltongue";
    },
    normalizeOpenRouterModel(model) {
      return model === "same/model" ? model : "same/model";
    },
    resolveChatTarget(model, provider) {
      return {
        provider: provider === "auto" ? "openrouter" : provider,
        model,
      };
    },
    encodeURIComponent,
    decodeURIComponent,
    JSON,
  });
  vm.runInContext(
    `${html.slice(helperStart, helperEnd)}
globalThis.getModeModelRequestForTest = getModeModelRequest;
globalThis.getModeExecutionSelectionForTest = getModeExecutionSelection;
globalThis.getPinnedModeTargetForTest = getPinnedModeTarget;
globalThis.resolveModeModelRequestForTest = resolveModeModelRequest;
globalThis.encodeModeModelSelectionForTest = encodeModeModelSelection;
globalThis.decodeModeModelSelectionForTest = decodeModeModelSelection;`,
    context,
  );

  assert.deepEqual(
    structuredClone(
      context.getModeModelRequestForTest("parseltongue", "same/model"),
    ),
    { provider: "local", model: "same/model" },
    "A local target must stay local even when an OpenRouter key and identical model ID exist",
  );
  assert.deepEqual(
    structuredClone(context.getModeModelRequestForTest("pliny", "same/model")),
    { provider: "openrouter", model: "same/model" },
  );
  assert.deepEqual(
    structuredClone(
      context.decodeModeModelSelectionForTest(
        context.encodeModeModelSelectionForTest({
          provider: "local",
          model: "model:with/slashes|and spaces",
        }),
      ),
    ),
    { provider: "local", model: "model:with/slashes|and spaces" },
  );

  context.state.modeModelSelections.parseltongue = {
    provider: "auto",
    model: "",
  };
  const automaticSnapshot =
    context.getModeExecutionSelectionForTest("parseltongue");
  assert.equal(Object.isFrozen(automaticSnapshot), true);
  assert.deepEqual(structuredClone(automaticSnapshot), {
    provider: "auto",
    model: "",
  });
  assert.equal(context.getPinnedModeTargetForTest(automaticSnapshot), null);

  context.state.modeModelSelections.parseltongue = {
    provider: "local",
    model: "lm-beta",
  };
  assert.deepEqual(
    structuredClone(
      context.resolveModeModelRequestForTest(
        "parseltongue",
        "same/model",
        automaticSnapshot,
      ),
    ),
    { provider: "openrouter", model: "same/model" },
    "An Automatic snapshot must stay Automatic without becoming the later live picker value",
  );

  const explicitSnapshot =
    context.getModeExecutionSelectionForTest("parseltongue");
  context.state.modeModelSelections.parseltongue = {
    provider: "openrouter",
    model: "same/model",
  };
  assert.deepEqual(
    structuredClone(
      context.resolveModeModelRequestForTest(
        "parseltongue",
        "same/model",
        explicitSnapshot,
      ),
    ),
    { provider: "local", model: "lm-beta" },
    "An explicit snapshot must retain its exact provider and model for the whole run",
  );
});

test("routes PARSELTONGUE, CLASSIC, FAST, and regeneration without changing mode", async () => {
  const html = await readFile(publicEntry, "utf8");

  const functionSource = (name, nextName) => {
    const start = html.indexOf(`function ${name}`);
    const end = html.indexOf(`function ${nextName}`, start + name.length);
    assert.ok(start > 0 && end > start, `Missing ${name}`);
    return html.slice(start, end);
  };

  const sendSource = functionSource("sendMessage", "stopGeneration");
  const regenerateSource = functionSource(
    "regenerateFromMessage",
    "retryMessage",
  );
  assert.doesNotMatch(sendSource, /selectMode\('ultraplinian'\)/);
  assert.doesNotMatch(regenerateSource, /selectMode\('ultraplinian'\)/);
  assert.match(regenerateSource, /executePlinyMode\(/);
  assert.match(regenerateSource, /executeParseltongue\(/);

  const classicStart = html.indexOf("async function executePlinyMode");
  const classicEnd = html.indexOf(
    "\n\n    // ═══════════════════════════════════════════════════════════════════\n    // PARSELTONGUE",
    classicStart,
  );
  const classicSource = html.slice(classicStart, classicEnd);
  assert.match(classicSource, /resolveModeModelRequest\('pliny'/);
  assert.match(classicSource, /fetchChatCompletion\(bodyParams/);
  assert.doesNotMatch(classicSource, /openrouter\.ai|Bearer \$\{state\.apiKey\}/);

  const parselStart = html.indexOf("async function executeParseltongue");
  const parselEnd = html.indexOf(
    "\n\n    // ═══════════════════════════════════════════════════════════════════\n    // End Parseltongue",
    parselStart,
  );
  const parselSource = html.slice(parselStart, parselEnd);
  assert.match(parselSource, /resolveModeModelRequest\('parseltongue'/);
  assert.match(parselSource, /fetchChatCompletion\(\{/);
  assert.doesNotMatch(parselSource, /openrouter\.ai|Bearer \$\{state\.apiKey\}/);

  const fastStart = html.indexOf("const fastStreamPromise");
  const fastEnd = html.indexOf("\n\n          if (isFastSolo)", fastStart);
  const fastSource = html.slice(fastStart, fastEnd);
  assert.match(fastSource, /resolveModeModelRequest\('pliny'/);
  assert.match(fastSource, /fetchChatCompletion\(\{/);
  assert.doesNotMatch(fastSource, /openrouter\.ai|Bearer \$\{state\.apiKey\}/);

  assert.match(
    sendSource,
    /if \(attachedImage && hasAuxiliaryModelProvider\(executionTarget\)\)/,
    "Vision must run for any available exact target, including Venice-only configurations",
  );
  assert.doesNotMatch(
    sendSource,
    /attachedImage && \(state\.apiKey \|\| hasLocalProvider\(\)\)/,
  );
});

test("never falls back from an unavailable explicit provider-qualified target", async () => {
  const html = await readFile(publicEntry, "utf8");
  const resolverStart = html.indexOf("function resolveChatTarget");
  const resolverEnd = html.indexOf(
    "\n\n    async function fetchChatCompletion",
    resolverStart,
  );
  const auxiliaryStart = html.indexOf("function hasAuxiliaryModelProvider");
  const auxiliaryEnd = html.indexOf(
    "\n\n    function inferProviderForModel",
    auxiliaryStart,
  );
  assert.ok(resolverStart > 0 && resolverEnd > resolverStart);
  assert.ok(auxiliaryStart > 0 && auxiliaryEnd > auxiliaryStart);

  const runtimeState = {
    apiKey: "openrouter-present",
    veniceApiKey: "venice-present",
    localOnly: false,
    localEnabled: true,
    localApiKey: "",
    localModels: ["same/model", "lm-beta"],
  };
  const freeModels = new Set(["same/model"]);
  const veniceModels = ["same/model"];
  const context = vm.createContext({
    state: runtimeState,
    MODE_MODEL_PROVIDERS: new Set([
      "auto",
      "openrouter",
      "venice",
      "local",
    ]),
    OPENROUTER_LEGACY_MODEL_MIGRATIONS: {},
    OPENROUTER_FREE_CHAT_MODEL_SET: freeModels,
    VENICE_MODELS: veniceModels,
    getLocalModels() {
      return runtimeState.localModels;
    },
    hasLocalProvider() {
      return runtimeState.localEnabled && runtimeState.localModels.length > 0;
    },
    normalizeLocalBaseUrl() {
      return "http://localhost:1234/v1";
    },
    normalizeOpenRouterModel(model) {
      return freeModels.has(model) ? model : "same/model";
    },
  });
  vm.runInContext(
    `${html.slice(resolverStart, resolverEnd)}
${html.slice(auxiliaryStart, auxiliaryEnd)}
globalThis.resolveChatTargetForTest = resolveChatTarget;
globalThis.hasAuxiliaryModelProviderForTest = hasAuxiliaryModelProvider;`,
    context,
  );

  assert.deepEqual(
    structuredClone(
      context.resolveChatTargetForTest("same/model", "local"),
    ),
    {
      provider: "local",
      model: "same/model",
      url: "http://localhost:1234/v1/chat/completions",
      apiKey: "",
    },
  );
  assert.deepEqual(
    structuredClone(
      context.resolveChatTargetForTest("same/model", "openrouter"),
    ),
    {
      provider: "openrouter",
      model: "same/model",
      url: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "openrouter-present",
    },
  );
  assert.deepEqual(
    structuredClone(
      context.resolveChatTargetForTest("same/model", "venice"),
    ),
    {
      provider: "venice",
      model: "same/model",
      url: "https://api.venice.ai/api/v1/chat/completions",
      apiKey: "venice-present",
    },
    "Identical model IDs must retain the explicitly selected provider",
  );

  runtimeState.apiKey = "";
  assert.throws(
    () => context.resolveChatTargetForTest("same/model", "openrouter"),
    /selected OpenRouter model provider is unavailable/,
    "An explicit OpenRouter target must not fall back to a configured local model",
  );
  runtimeState.apiKey = "openrouter-present";

  assert.throws(
    () => context.resolveChatTargetForTest("missing-local-model", "local"),
    /selected local model "missing-local-model" is no longer available/,
    "An explicit missing local model must not fall back to its first discovered model or OpenRouter",
  );

  runtimeState.veniceApiKey = "";
  assert.throws(
    () => context.resolveChatTargetForTest("same/model", "venice"),
    /selected Venice model provider is unavailable/,
    "An explicit Venice target must not fall back to OpenRouter or local",
  );
  runtimeState.veniceApiKey = "venice-present";

  assert.equal(
    context.hasAuxiliaryModelProviderForTest({
      provider: "local",
      model: "same/model",
    }),
    true,
  );
  assert.equal(
    context.hasAuxiliaryModelProviderForTest({
      provider: "local",
      model: "missing-local-model",
    }),
    false,
    "Auxiliary availability must validate the exact selected target",
  );
  runtimeState.apiKey = "";
  assert.equal(
    context.hasAuxiliaryModelProviderForTest({
      provider: "openrouter",
      model: "same/model",
    }),
    false,
    "Another configured provider must not make an unavailable exact auxiliary target appear available",
  );
  runtimeState.apiKey = "openrouter-present";
  assert.equal(context.hasAuxiliaryModelProviderForTest(null), true);
});

test("keeps ULTRAPLINIAN winner identity provider-qualified", async () => {
  const html = await readFile(publicEntry, "utf8");
  const ultraStart = html.indexOf("async function ultraplinian");
  const ultraEnd = html.indexOf("async function consortium", ultraStart);
  assert.ok(ultraStart > 0 && ultraEnd > ultraStart);
  const ultraSource = html.slice(ultraStart, ultraEnd);

  const abortedResults = [
    ...ultraSource.matchAll(
      /\{([^{}\n]*error:\s*'aborted-early-stop'[^{}\n]*)\}/g,
    ),
  ];
  assert.ok(abortedResults.length >= 2, "Expected both ULTRAPLINIAN abort paths");
  for (const [, fields] of abortedResults) {
    assert.match(
      fields,
      /provider:\s*entryProvider/,
      "Every aborted race result must retain its provider",
    );
  }

  const winnerChecks = [
    ...ultraSource.matchAll(/isWinner:\s*([^\n,}]+)/g),
  ].map((match) => match[1]);
  assert.ok(winnerChecks.length >= 3, "Expected early, final, and fallback winner checks");
  for (const expression of winnerChecks) {
    assert.match(
      expression,
      /sameModelTarget\(|\.provider\s*===|provider\s*===/,
      `Winner comparison is not provider-qualified: ${expression}`,
    );
  }
  assert.doesNotMatch(ultraSource, /isWinner:\s*r\.model ===/);

  const leaderLookup = ultraSource.match(
    /const leaderResult = allResults\.find\(([^;]+)\);/,
  );
  assert.ok(leaderLookup, "Missing live-leader fallback lookup");
  assert.match(
    leaderLookup[1],
    /sameModelTarget\(|\.provider\s*===|provider\s*===/,
    "The live-leader fallback lookup must include provider identity",
  );
  assert.match(ultraSource, /currentLeader(?:Target|Provider)/);
  assert.ok(
    [...ultraSource.matchAll(/winnerProvider:/g)].length >= 3,
    "Every ULTRAPLINIAN success path must publish the winner provider",
  );
});

test("normalizes each local runtime endpoint without broadening loopback access", async () => {
  const html = await readFile(publicEntry, "utf8");
  const functionStart = html.indexOf("function normalizeLocalBaseUrl");
  const functionEnd = html.indexOf(
    "\n\n    function hasLocalProvider",
    functionStart,
  );
  assert.ok(functionStart > 0 && functionEnd > functionStart);
  const functionSource = html.slice(functionStart, functionEnd);
  const normalizeLocalBaseUrl = vm.runInNewContext(`(${functionSource})`, {
    URL,
  });

  assert.equal(
    normalizeLocalBaseUrl("http://localhost:12434", "docker"),
    "http://localhost:12434/engines/v1",
  );
  assert.equal(
    normalizeLocalBaseUrl(
      "http://localhost:12434/engines/v1/models",
      "docker",
    ),
    "http://localhost:12434/engines/v1",
  );
  assert.equal(
    normalizeLocalBaseUrl(
      "http://127.0.0.1:8080/v1/chat/completions",
      "llamacpp",
    ),
    "http://127.0.0.1:8080/v1",
  );
  assert.throws(
    () => normalizeLocalBaseUrl("http://192.168.1.10:8000/v1", "vllm"),
    /must use localhost or 127\.0\.0\.1/,
  );

  const inferenceStart = html.indexOf("function inferLocalRuntimeFromBaseUrl");
  const inferenceEnd = html.indexOf(
    "\n\n    function updateLocalRuntimeHelp",
    inferenceStart,
  );
  const runtimeContext = vm.createContext({
    URL,
    LOCAL_RUNTIME_PRESETS: localRuntimePresets,
    LOCAL_RUNTIME_IDS: new Set(localRuntimeIds),
  });
  vm.runInContext(
    `${functionSource}
${html.slice(inferenceStart, inferenceEnd)}
globalThis.normalizeLocalRuntimeForTest = normalizeLocalRuntime;`,
    runtimeContext,
  );
  const normalizeLocalRuntime =
    runtimeContext.normalizeLocalRuntimeForTest;
  assert.equal(
    normalizeLocalRuntime("", "http://localhost:1234/v1"),
    "lmstudio",
  );
  assert.equal(
    normalizeLocalRuntime("", "http://localhost:9876/v1"),
    "custom",
  );
  assert.equal(
    normalizeLocalRuntime("custom", "http://localhost:12434/engines/v1"),
    "custom",
    "An explicit Custom selection must not be re-inferred as Docker",
  );
  assert.equal(
    normalizeLocalRuntime("vllm", "http://localhost:9000/v1"),
    "vllm",
    "A preset must retain its identity when its port is customized",
  );
});

test("backs up local runtime settings without exporting its API key", async () => {
  const html = await readFile(publicEntry, "utf8");
  const exportStart = html.indexOf("function exportFullBackup()");
  const exportEnd = html.indexOf(
    "\n\n    let _pendingImportData",
    exportStart,
  );
  const exportSource = html.slice(exportStart, exportEnd);
  for (const key of [
    "localEnabled",
    "localOnly",
    "localRuntime",
    "localBaseUrl",
    "localModels",
    "modeModelSelections",
  ]) {
    assert.match(exportSource, new RegExp(`${key}: state\\.${key}`));
  }
  assert.match(exportSource, /_version: 4/);
  assert.doesNotMatch(exportSource, /localApiKey/);

  const importStart = html.indexOf("const allowed = ['conversations'");
  const importEnd = html.indexOf("];", importStart) + 2;
  const importAllowlist = html.slice(importStart, importEnd);
  assert.match(importAllowlist, /'localRuntime'/);
  assert.match(importAllowlist, /'localBaseUrl'/);
  assert.match(importAllowlist, /'modeModelSelections'/);
  assert.doesNotMatch(importAllowlist, /'localApiKey'/);
  assert.match(
    html,
    /candidate\.localRuntime = imported\.localRuntime === undefined\s+\? inferLocalRuntimeFromBaseUrl\(candidate\.localBaseUrl\)/,
  );
  assert.match(
    html,
    /candidate\.localModels = typeof candidate\.localModels === 'string'\s+\? candidate\.localModels\.slice\(0, 1000\)/,
  );
});

test("publishes the maintained local runtime guide byte-for-byte", async () => {
  const [source, published] = await Promise.all([
    readFile(localModelsGuide),
    readFile(publicLocalModelsGuide),
  ]);
  assert.deepEqual(published, source);
});

test("uses the canonical Crow black, ultraviolet, blue, and cyan palette", async () => {
  const html = await readFile(publicEntry, "utf8");

  assert.match(html, /--bg: var\(--crow-bg-canvas, #03040a\);/);
  assert.match(html, /--primary: var\(--crow-product-primary, #734cff\);/);
  assert.match(html, /--secondary: var\(--crow-product-signal, #45e7ff\);/);
  assert.match(html, /--cyan: var\(--crow-cyan, #45e7ff\);/);
  assert.doesNotMatch(
    html,
    /#(?:e84bff|ec4899|ff0055)\b|rgba\(\s*(?:232\s*,\s*75\s*,\s*255|236\s*,\s*72\s*,\s*153|255\s*,\s*0\s*,\s*(?:85|100|128))\s*,/i,
  );

  const magenta = html.match(/#(?:d649ff|d946ef)\b/gi) ?? [];
  assert.ok(magenta.length > 0 && magenta.length <= 3);
});

test("ships only the Crow-GodMod3 runtime web assets", async () => {
  const requiredRuntimeFiles = [
    "tokens/crow-theme.css",
    "fonts/bitfeather/crow-bitfeather.css",
    "fonts/bitfeather/woff2/CrowBitfeatherDisplay-Regular.woff2",
    "fonts/bitfeather/woff2/CrowBitfeatherDisplay-Bold.woff2",
    "fonts/bitfeather/woff2/CrowBitfeatherMono-Regular.woff2",
    "fonts/bitfeather/woff2/CrowBitfeatherMono-Bold.woff2",
    "cursors/v0.5/src/32/normal.png",
    "cursors/v0.5/src/32/link.png",
    "cursors/v0.5/src/32/text.png",
    "cursors/v0.5/src/32/move.png",
    "cursors/v0.5/src/32/unavailable.png",
    "assets/backgrounds/void-grid-neutral.png",
    "assets/icons/app/crow-signal-app-rounded-256.png",
    "assets/icons/app/crow-signal-app-rounded-512.png",
    "assets/icons/avatars/crow-signal-avatar-512.png",
    "assets/icons/favicon.ico",
    "assets/icons/png/crow-signal-32.png",
    "assets/icons/png/crow-signal-180.png",
    "assets/icons/png/crow-signal-192.png",
    "assets/icons/png/crow-signal-512.png",
    "assets/product-variants/crow-godmod3-hero.png",
    "assets/product-variants/exports/crow-godmod3-1200x630.png",
    "assets/product-variants/exports/crow-godmod3-1920x1080.png",
  ];

  for (const relativePath of requiredRuntimeFiles) {
    const [sourceInfo, publicInfo] = await Promise.all([
      stat(new URL(relativePath, sourceTheme)),
      stat(new URL(relativePath, publicTheme)),
    ]);
    assert.ok(sourceInfo.isFile(), `Missing source theme file: ${relativePath}`);
    assert.equal(
      publicInfo.size,
      sourceInfo.size,
      `Generated theme file differs: ${relativePath}`,
    );
  }

  for (const unpublishedPackPath of [
    "index.html",
    "downloads/Crow-Signal-Windows-v0.1.0.zip",
    "downloads/Crow-Talon-Windows-v0.1.0.zip",
    "docs/BRAND-GUIDE.md",
    "assets/mascots/masters/glitch-ascendant.png",
  ]) {
    await assert.rejects(stat(new URL(unpublishedPackPath, publicTheme)), {
      code: "ENOENT",
    });
  }
});

test("publishes Crow-GodMod3 application metadata and installable icons", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/manifest.webmanifest", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(manifest.name, "Crow-GodMod3");
  assert.equal(manifest.theme_color, "#03040a");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));

  const html = await readFile(publicEntry, "utf8");
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /crow-godmod3-1200x630\.png/);

  for (const retiredAsset of [
    "../public/crowclaw-head.webp",
    "../public/crowclaw-mark.webp",
    "../public/jetbrains-mono.css",
  ]) {
    await assert.rejects(stat(new URL(retiredAsset, import.meta.url)), {
      code: "ENOENT",
    });
  }
});

test("packages the public source byte-for-byte", async () => {
  const [source, packaged] = await Promise.all([
    readFile(publicEntry),
    readFile(new URL("../dist/client/crow-godmod3.html", import.meta.url)),
  ]);
  assert.deepEqual(packaged, source);
});
