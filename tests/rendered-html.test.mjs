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
  assert.match(
    openSettingsSource,
    /applyLocalRuntimeProfileToState\(state\.localRuntime\);\s+renderActiveLocalRuntimeProfile\(\);/,
  );
});

test("discovers unlimited local chat inventory with one-model default and user-selected races", async () => {
  const html = await readFile(publicEntry, "utf8");
  assert.match(html, /const MAX_LOCAL_MODEL_STORAGE_CHARS = 1048576;/);
  assert.doesNotMatch(html, /MAX_LOCAL_MODEL_INVENTORY|MAX_LOCAL_AUTOMATIC_RACE_MODELS/);

  const helperStart = html.indexOf("const MAX_LOCAL_MODEL_STORAGE_CHARS");
  const helperEnd = html.indexOf(
    "\n\n    function inferPersistedModelProvider",
    helperStart,
  );
  assert.ok(
    helperStart > 0 && helperEnd > helperStart,
    "Missing the local chat-model discovery helper block",
  );

  let availableLocalModels = [];
  const context = vm.createContext({
    URL,
    LOCAL_RUNTIME_IDS: new Set(localRuntimeIds),
    state: {
      localRuntime: "ollama",
      localRaceModels: "",
      localModeModelPools: null,
    },
    getLocalModels() {
      return availableLocalModels;
    },
  });
  vm.runInContext(
    `${html.slice(helperStart, helperEnd)}
globalThis.parseLocalModelIdsForTest = parseLocalModelIds;
globalThis.getLocalAutomaticRaceModelsForTest = getLocalAutomaticRaceModels;
globalThis.isExplicitlyNonChatModelDescriptorForTest = isExplicitlyNonChatModelDescriptor;
globalThis.filterLocalChatModelDescriptorsForTest = filterLocalChatModelDescriptors;
globalThis.discoverLocalChatModelsForTest = discoverLocalChatModels;`,
    context,
  );

  const fullInventory = structuredClone(
    context.parseLocalModelIdsForTest(
      Array.from({ length: 12 }, (_, index) => `chat-model-${index}`).join(", "),
    ),
  );
  assert.equal(fullInventory.length, 12);
  assert.equal(
    fullInventory[11],
    "chat-model-11",
    "A model beyond the old eight-model cutoff must remain explicitly selectable",
  );
  assert.equal(
    context.parseLocalModelIdsForTest(
      Array.from({ length: 140 }, (_, index) => `inventory-model-${index}`).join(
        ",",
      ),
    ).length,
    140,
    "Crow-GodMod3 must not impose a model-count limit on the picker inventory",
  );

  availableLocalModels = fullInventory;
  assert.deepEqual(
    structuredClone(
      context.getLocalAutomaticRaceModelsForTest("ultraplinian"),
    ),
    fullInventory.slice(0, 1),
    "Automatic ULTRAPLINIAN starts with one safe default model",
  );
  assert.deepEqual(
    structuredClone(
      context.getLocalAutomaticRaceModelsForTest("parseltongue"),
    ),
    fullInventory.slice(0, 1),
    "Automatic PARSELTONGUE starts with one safe default model",
  );
  assert.deepEqual(
    structuredClone(context.getLocalAutomaticRaceModelsForTest("pliny")),
    fullInventory.slice(0, 1),
    "Automatic CLASSIC starts with one safe default model",
  );
  context.state.localModeModelPools = {
    ultraplinian: fullInventory.join(", "),
    parseltongue: [fullInventory[2], fullInventory[9]].join(", "),
    pliny: fullInventory.slice(4, 9).join(", "),
  };
  assert.deepEqual(
    structuredClone(
      context.getLocalAutomaticRaceModelsForTest("ultraplinian"),
    ),
    fullInventory,
    "ULTRAPLINIAN can deliberately select every discovered local model without a fixed ceiling",
  );
  assert.deepEqual(
    structuredClone(
      context.getLocalAutomaticRaceModelsForTest("parseltongue"),
    ),
    [fullInventory[2], fullInventory[9]],
    "PARSELTONGUE retains its own exact available-model subset",
  );
  assert.deepEqual(
    structuredClone(context.getLocalAutomaticRaceModelsForTest("pliny")),
    fullInventory.slice(4, 9),
    "CLASSIC retains a different independently sized local-model pool",
  );

  const nativeDescriptors = [
    ...Array.from({ length: 9 }, (_, index) => ({
      key: `text-embedding-test-${index}`,
      type: "embedding",
    })),
    { key: "liquid/lfm2.5-1.2b", type: "llm" },
    { key: "nvidia/nemotron-3-nano-4b", type: "llm" },
    { key: "mistralai/ministral-3-3b", type: "llm" },
    {
      key: "google/gemma-4-e2b",
      type: "llm",
      capabilities: {
        reasoning: { allowed_options: ["on"], default: "on" },
      },
    },
    {
      key: "ornith-1.0-9b",
      type: "llm",
      capabilities: {
        reasoning: { allowed_options: ["off", "on"], default: "on" },
      },
    },
  ];
  const expectedLmStudioChatModels = [
    "liquid/lfm2.5-1.2b",
    "nvidia/nemotron-3-nano-4b",
    "mistralai/ministral-3-3b",
    "google/gemma-4-e2b",
    "ornith-1.0-9b",
  ];

  assert.equal(
    context.isExplicitlyNonChatModelDescriptorForTest({
      key: "text-embedding-test",
      type: "embedding",
    }),
    true,
  );
  assert.equal(
    context.isExplicitlyNonChatModelDescriptorForTest({
      key: "google/gemma-4-e2b",
      type: "llm",
    }),
    false,
  );
  const filteredNative = structuredClone(
    context.filterLocalChatModelDescriptorsForTest(nativeDescriptors),
  );
  assert.deepEqual(filteredNative.models, expectedLmStudioChatModels);
  assert.deepEqual(filteredNative.reasoningOffModels, ["ornith-1.0-9b"]);
  assert.equal(filteredNative.skipped, 9);

  const lmStudioRequests = [];
  const lmStudioDiscovery = structuredClone(
    await context.discoverLocalChatModelsForTest(
      "lmstudio",
      "http://localhost:1234/v1",
      {},
      async (url) => {
        lmStudioRequests.push(String(url));
        return {
          ok: true,
          status: 200,
          async json() {
            return { models: nativeDescriptors };
          },
        };
      },
    ),
  );
  assert.ok(
    lmStudioRequests.some((url) => url.endsWith("/api/v1/models")),
    "LM Studio discovery must use its native typed inventory endpoint",
  );
  assert.deepEqual(lmStudioDiscovery.models, expectedLmStudioChatModels);
  assert.deepEqual(lmStudioDiscovery.reasoningOffModels, ["ornith-1.0-9b"]);
  assert.equal(lmStudioDiscovery.skipped, 9);
  assert.ok(lmStudioDiscovery.source);

  const fallbackDescriptors = [
    { id: "acme/unknown-local-model" },
    { id: "text-embedding-nomic-embed-text-v2" },
    { id: "acme/rerank-v2" },
    { id: "acme/another-unknown-model" },
  ];
  const fallbackRequests = [];
  const fallbackDiscovery = structuredClone(
    await context.discoverLocalChatModelsForTest(
      "vllm",
      "http://localhost:8000/v1",
      {},
      async (url) => {
        fallbackRequests.push(String(url));
        return {
          ok: true,
          status: 200,
          async json() {
            return { data: fallbackDescriptors };
          },
        };
      },
    ),
  );
  assert.ok(fallbackRequests.some((url) => url.endsWith("/v1/models")));
  assert.deepEqual(fallbackDiscovery.models, [
    "acme/unknown-local-model",
    "acme/another-unknown-model",
  ]);
  assert.equal(fallbackDiscovery.skipped, 2);
  for (const mode of ["ultraplinian", "parseltongue", "pliny"]) {
    assert.match(html, new RegExp(`id="localRaceModelPicker-${mode}"`));
    assert.match(
      html,
      new RegExp(`onclick="selectAllLocalRaceModels\\('${mode}'\\)"`),
    );
  }
  assert.match(
    html,
    /Each mode defaults to one local model\. Select any number, including every discovered model; there is no fixed count limit/,
  );
  assert.match(
    html,
    /renderLocalRaceModelPicker\(\);\s+buildTierSelect\(\);/,
    "manual Model IDs edits must refresh the unlimited picker and its live counts",
  );
  assert.match(
    html,
    /function usesLightweightLocalHelpers\(modeTarget = null\)[\s\S]*modeTarget\?\.provider === 'local'/,
  );
  assert.match(
    html,
    /if \(usesLightweightLocalHelpers\(modeTarget\)\) \{[\s\S]*Local response passed the instant refusal check/,
  );
  assert.match(
    html,
    /title: 'Crow-GodMod3-refusal-detector', modeTarget, signal: abortController\?\.signal/,
  );
  assert.match(
    html,
    /if \(usesLightweightLocalHelpers\(modeTarget\)\) \{\s+return null;/,
    "local helpers should not inject a conflicting generated prefill",
  );
  assert.match(
    html,
    /!PREFILL skipped \/\/ local direct generation/,
    "local ULTRAPLINIAN should preserve direct generation without a fallback prefill",
  );
  assert.match(
    html,
    /abortController\.abort\(new DOMException\('User stopped generation', 'AbortError'\)\)/,
    "Stop must identify a user cancellation instead of reporting a model failure",
  );
  assert.match(
    html,
    /controller\.signal\.reason\?\.message === 'User stopped generation'/,
    "ULTRAPLINIAN must propagate an explicit user cancellation",
  );
});

test("ignores stale local discovery success and failure after a newer request", async () => {
  const html = await readFile(publicEntry, "utf8");
  const functionStart = html.indexOf("async function testLocalConnection()");
  const functionEnd = html.indexOf(
    "\n\n    // ═══════════════════════════════════════════════════════════════════",
    functionStart,
  );
  assert.ok(
    functionStart > 0 && functionEnd > functionStart,
    "Missing local connection test helper",
  );
  const invalidationStart = html.indexOf(
    "function invalidateActiveLocalRuntimeDiscovery",
  );
  const invalidationEnd = html.indexOf(
    "\n\n    function setLocalApiKeyForRuntime",
    invalidationStart,
  );
  assert.ok(
    invalidationStart > 0 && invalidationEnd > invalidationStart,
    "Missing local discovery invalidation helper",
  );

  const elements = {
    localConnectionStatus: { textContent: "", style: {} },
    localRuntimeInput: { value: "ollama" },
    localBaseUrlInput: { value: localRuntimePresets.ollama.baseUrl },
    localApiKeyInput: { value: "same-token" },
    localModelsInput: { value: "" },
    localReasoningEffortInput: { value: "none" },
    localEnabled: { checked: false },
  };
  const discoveries = [];
  let profile = {
    baseUrl: localRuntimePresets.ollama.baseUrl,
    models: "",
    modeModelPools: {
      ultraplinian: [],
      parseltongue: [],
      pliny: [],
    },
    reasoningEffort: "none",
    reasoningOffModels: "",
  };
  const state = {
    localRuntime: "ollama",
    localModeModelPools: profile.modeModelPools,
    localEnabled: false,
  };
  const context = vm.createContext({
    LOCAL_RUNTIME_IDS: new Set(localRuntimeIds),
    LOCAL_RUNTIME_PRESETS: localRuntimePresets,
    state,
    document: {
      getElementById(id) {
        return elements[id] || null;
      },
    },
    normalizeLocalBaseUrl(value) {
      return value;
    },
    getLocalRuntimeProfile() {
      return profile;
    },
    setLocalRuntimeProfile(_runtime, nextProfile) {
      profile = structuredClone(nextProfile);
      return profile;
    },
    setLocalApiKeyForRuntime() {},
    discoverLocalChatModels() {
      return new Promise((resolve, reject) => {
        discoveries.push({ resolve, reject });
      });
    },
    applyLocalRuntimeProfileToState() {},
    renderActiveLocalRuntimeProfile() {},
    saveState() {},
    describeLocalConnectionFailure(error) {
      return error.message;
    },
  });
  vm.runInContext(
    `let _localApiKeyGeneration = 0;
let _localRuntimeProfileGenerations = {};
function bumpLocalRuntimeProfileGeneration(runtime) {
  const next = (_localRuntimeProfileGenerations[runtime] || 0) + 1;
  _localRuntimeProfileGenerations[runtime] = next;
  return next;
}
${html.slice(invalidationStart, invalidationEnd)}
${html.slice(functionStart, functionEnd)}
globalThis.testLocalConnectionForTest = testLocalConnection;
globalThis.invalidateActiveLocalRuntimeDiscoveryForTest = invalidateActiveLocalRuntimeDiscovery;
globalThis.getLocalApiKeyGenerationForTest = () => _localApiKeyGeneration;`,
    context,
  );

  const first = context.testLocalConnectionForTest();
  const second = context.testLocalConnectionForTest();
  assert.equal(discoveries.length, 2);
  discoveries[1].resolve({
    models: ["new-model"],
    reasoningOffModels: [],
    skipped: 0,
    source: "openai-compatible",
  });
  await second;
  const currentSuccessStatus = elements.localConnectionStatus.textContent;
  discoveries[0].resolve({
    models: ["old-model"],
    reasoningOffModels: [],
    skipped: 0,
    source: "openai-compatible",
  });
  await first;
  assert.equal(profile.models, "new-model");
  assert.equal(elements.localConnectionStatus.textContent, currentSuccessStatus);
  assert.equal(context.getLocalApiKeyGenerationForTest(), 2);

  const staleFailure = context.testLocalConnectionForTest();
  const latestSuccess = context.testLocalConnectionForTest();
  discoveries[3].resolve({
    models: ["latest-model"],
    reasoningOffModels: [],
    skipped: 0,
    source: "openai-compatible",
  });
  await latestSuccess;
  const latestSuccessStatus = elements.localConnectionStatus.textContent;
  discoveries[2].reject(new Error("stale failure"));
  await staleFailure;
  assert.equal(profile.models, "latest-model");
  assert.equal(elements.localConnectionStatus.textContent, latestSuccessStatus);
  assert.equal(context.getLocalApiKeyGenerationForTest(), 4);

  const staleAfterTyping = context.testLocalConnectionForTest();
  elements.localModelsInput.value = "manually-typed-model";
  const keyGenerationBeforeTyping =
    context.getLocalApiKeyGenerationForTest();
  context.invalidateActiveLocalRuntimeDiscoveryForTest(true);
  assert.equal(
    context.getLocalApiKeyGenerationForTest(),
    keyGenerationBeforeTyping + 1,
    "Typing a credential must invalidate a pending startup decrypt",
  );
  const editedStatus = elements.localConnectionStatus.textContent;
  discoveries[4].resolve({
    models: ["stale-discovered-model"],
    reasoningOffModels: [],
    skipped: 0,
    source: "openai-compatible",
  });
  await staleAfterTyping;
  assert.equal(elements.localModelsInput.value, "manually-typed-model");
  assert.equal(profile.models, "latest-model");
  assert.equal(editedStatus, "Settings changed — test again.");
  assert.equal(elements.localConnectionStatus.textContent, editedStatus);

  for (const handler of [
    /id="localEnabled"[^>]*onchange="invalidateActiveLocalRuntimeDiscovery\(\)"/,
    /id="localBaseUrlInput"[^>]*oninput="invalidateActiveLocalRuntimeDiscovery\(\)"/,
    /id="localModelsInput"[^>]*oninput="invalidateActiveLocalRuntimeDiscovery\(\)"/,
    /id="localApiKeyInput"[^>]*oninput="invalidateActiveLocalRuntimeDiscovery\(true\)"/,
    /id="localReasoningEffortInput"[^>]*onchange="invalidateActiveLocalRuntimeDiscovery\(\)"/,
  ]) {
    assert.match(html, handler);
  }

  const saveStart = html.indexOf("function saveSettings()");
  const saveEnd = html.indexOf("\n\n    function generateApiKey", saveStart);
  const saveSource = html.slice(saveStart, saveEnd);
  assert.match(
    saveSource,
    /const newLocalKey =[\s\S]*?_localApiKeyGeneration\+\+;\s+state\.localApiKey = newLocalKey;/,
    "An explicit Save must invalidate pending credential decryption even when the saved key is blank",
  );
  assert.doesNotMatch(
    saveSource,
    /if \(newLocalKey !== state\.localApiKey\) _localApiKeyGeneration\+\+;/,
  );
});

test("keeps unlimited inventories and mode pools separate across local runtime switches", async () => {
  const html = await readFile(publicEntry, "utf8");
  const helperStart = html.indexOf("function parseLocalModelIds");
  const helperEnd = html.indexOf(
    "\n\n    function renderLocalRaceModelPicker",
    helperStart,
  );
  assert.ok(
    helperStart > 0 && helperEnd > helperStart,
    "Missing per-runtime profile helpers",
  );

  const ollamaModels = Array.from(
    { length: 140 },
    (_, index) => `ollama-model-${index}`,
  );
  const lmStudioModels = ["shared-model", "lm-a", "lm-b", "lm-c"];
  const state = {
    localRuntime: "ollama",
    localBaseUrl: localRuntimePresets.ollama.baseUrl,
    localModels: ollamaModels.join(", "),
    localRaceModels: ollamaModels.join(", "),
    localModeModelPools: {
      ultraplinian: ollamaModels.join(", "),
      parseltongue: [ollamaModels[2], ollamaModels[139]].join(", "),
      pliny: ollamaModels.slice(10, 15).join(", "),
    },
    localReasoningEffort: "none",
    localReasoningOffModels: "",
    localRuntimeProfiles: {
      ollama: {
        baseUrl: localRuntimePresets.ollama.baseUrl,
        models: ollamaModels.join(", "),
        modeModelPools: {
          ultraplinian: ollamaModels.join(", "),
          parseltongue: [ollamaModels[2], ollamaModels[139]].join(", "),
          pliny: ollamaModels.slice(10, 15).join(", "),
        },
        reasoningEffort: "none",
      },
      lmstudio: {
        baseUrl: localRuntimePresets.lmstudio.baseUrl,
        models: lmStudioModels.join(", "),
        modeModelPools: {
          ultraplinian: "shared-model, lm-a, lm-b",
          parseltongue: "lm-c",
          pliny: "lm-b, shared-model",
        },
        reasoningEffort: "auto",
        reasoningOffModels: "shared-model, lm-b",
      },
    },
    localRuntimeProfileVersion: 1,
    localApiKey: "ollama-secret",
  };
  const localKeys = {
    ollama: "ollama-secret",
    lmstudio: "lmstudio-secret",
  };
  const context = vm.createContext({
    state,
    LOCAL_RUNTIME_PRESETS: localRuntimePresets,
    LOCAL_RUNTIME_IDS: new Set(localRuntimeIds),
    MAX_LOCAL_MODEL_STORAGE_CHARS: 1_048_576,
    MODE_MODEL_IDS: new Set(["ultraplinian", "parseltongue", "pliny"]),
    _localApiKeysByRuntime: localKeys,
    normalizeLocalRuntime(runtime) {
      return localRuntimeIds.includes(runtime) ? runtime : "custom";
    },
    getLocalModels() {
      return String(state.localModels || "")
        .split(",")
        .map((model) => model.trim())
        .filter(Boolean);
    },
  });
  vm.runInContext(
    `${html.slice(helperStart, helperEnd)}
globalThis.getLocalAutomaticRaceModelsForTest = getLocalAutomaticRaceModels;
globalThis.applyLocalRuntimeProfileToStateForTest = applyLocalRuntimeProfileToState;
globalThis.getLocalRuntimeProfileForTest = getLocalRuntimeProfile;`,
    context,
  );

  context.applyLocalRuntimeProfileToStateForTest("ollama");
  assert.equal(context.getLocalAutomaticRaceModelsForTest("ultraplinian").length, 140);
  assert.deepEqual(
    structuredClone(context.getLocalAutomaticRaceModelsForTest("parseltongue")),
    [ollamaModels[2], ollamaModels[139]],
  );
  assert.deepEqual(
    structuredClone(context.getLocalAutomaticRaceModelsForTest("pliny")),
    ollamaModels.slice(10, 15),
  );
  const preservedOllamaProfile = structuredClone(
    context.getLocalRuntimeProfileForTest("ollama"),
  );

  context.applyLocalRuntimeProfileToStateForTest("lmstudio");
  assert.equal(state.localRuntime, "lmstudio");
  assert.equal(state.localModels, lmStudioModels.join(", "));
  assert.equal(state.localApiKey, "lmstudio-secret");
  assert.deepEqual(
    structuredClone(context.getLocalAutomaticRaceModelsForTest("ultraplinian")),
    ["shared-model", "lm-a", "lm-b"],
  );
  assert.deepEqual(
    structuredClone(context.getLocalAutomaticRaceModelsForTest("parseltongue")),
    ["lm-c"],
  );
  assert.deepEqual(
    structuredClone(context.getLocalAutomaticRaceModelsForTest("pliny")),
    ["lm-b", "shared-model"],
  );

  context.applyLocalRuntimeProfileToStateForTest("docker");
  assert.equal(state.localModels, "");
  assert.deepEqual(
    structuredClone(context.getLocalAutomaticRaceModelsForTest("ultraplinian")),
    [],
    "An unconfigured runtime must not inherit another runtime's inventory",
  );

  context.applyLocalRuntimeProfileToStateForTest("ollama");
  assert.deepEqual(
    structuredClone(context.getLocalRuntimeProfileForTest("ollama")),
    preservedOllamaProfile,
    "Switching away and back must restore the exact unlimited inventory and pools",
  );
  assert.equal(state.localApiKey, "ollama-secret");
});

test("migrates legacy singleton local settings into only the active runtime profile", async () => {
  const html = await readFile(publicEntry, "utf8");
  const helperStart = html.indexOf("function parseLocalModelIds");
  const helperEnd = html.indexOf(
    "\n\n    function renderLocalRaceModelPicker",
    helperStart,
  );
  assert.ok(helperStart > 0 && helperEnd > helperStart);

  const state = {
    localRuntime: "lmstudio",
    localRaceModels: "legacy-a, legacy-b",
  };
  const context = vm.createContext({
    state,
    LOCAL_RUNTIME_PRESETS: localRuntimePresets,
    LOCAL_RUNTIME_IDS: new Set(localRuntimeIds),
    MAX_LOCAL_MODEL_STORAGE_CHARS: 1_048_576,
    MODE_MODEL_IDS: new Set(["ultraplinian", "parseltongue", "pliny"]),
    _localApiKeysByRuntime: {},
    normalizeLocalRuntime(runtime) {
      return localRuntimeIds.includes(runtime) ? runtime : "custom";
    },
    getLocalModels: () => [],
  });
  vm.runInContext(
    `${html.slice(helperStart, helperEnd)}
globalThis.normalizeLocalRuntimeProfilesForTest = normalizeLocalRuntimeProfiles;`,
    context,
  );

  const migrated = structuredClone(
    context.normalizeLocalRuntimeProfilesForTest(null, "lmstudio", {
      baseUrl: "http://localhost:1234/v1",
      models: "legacy-a, legacy-b, legacy-c",
      raceModels: "legacy-a, legacy-b",
      modeModelPools: {
        ultraplinian: "legacy-a, legacy-b",
        parseltongue: "legacy-c",
        pliny: "legacy-b",
      },
      reasoningEffort: "auto",
      reasoningOffModels: "legacy-a, missing-model",
    }),
  );

  assert.equal(migrated.lmstudio.models, "legacy-a, legacy-b, legacy-c");
  assert.deepEqual(migrated.lmstudio.modeModelPools, {
    ultraplinian: "legacy-a, legacy-b",
    parseltongue: "legacy-c",
    pliny: "legacy-b",
  });
  assert.equal(migrated.lmstudio.reasoningEffort, "auto");
  assert.equal(migrated.lmstudio.reasoningOffModels, "legacy-a");
  for (const runtime of localRuntimeIds.filter((id) => id !== "lmstudio")) {
    assert.equal(
      migrated[runtime].models,
      "",
      `Legacy LM Studio inventory leaked into ${runtime}`,
    );
    assert.deepEqual(migrated[runtime].modeModelPools, {
      ultraplinian: "",
      parseltongue: "",
      pliny: "",
    });
  }
});

test("keeps local tier counts truthful for unlimited automatic pools and pinned models", async () => {
  const html = await readFile(publicEntry, "utf8");
  const helperStart = html.indexOf("function _tierCount(tier)");
  const helperEnd = html.indexOf("\n\n    function buildTierSelect", helperStart);
  assert.ok(helperStart > 0 && helperEnd > helperStart, "Missing tier-count helper");

  const state = {
    apiKey: "",
    veniceApiKey: "",
    localOnly: true,
  };
  let selection = { provider: "auto", model: "" };
  let localModels = ["local-a", "local-b", "local-c"];
  let selectionAvailable = true;
  const context = vm.createContext({
    state,
    TIER_SIZES: { fast: 3, standard: 5 },
    VENICE_TIER_SIZES: { fast: 6, standard: 15 },
    hasLocalProvider: () => localModels.length > 0,
    getLocalAutomaticRaceModels: (mode) => {
      assert.equal(mode, "ultraplinian");
      return localModels;
    },
    getModeModelSelection: () => selection,
    isModeModelSelectionAvailable: () => selectionAvailable,
  });
  vm.runInContext(
    `${html.slice(helperStart, helperEnd)}
globalThis.tierCountForTest = _tierCount;`,
    context,
  );

  assert.equal(context.tierCountForTest("fast"), 3);
  state.localOnly = false;
  state.apiKey = "configured";
  assert.equal(
    context.tierCountForTest("fast"),
    6,
    "automatic count includes every selected local model plus the cloud tier",
  );
  selection = { provider: "local", model: "local-b" };
  assert.equal(
    context.tierCountForTest("standard"),
    1,
    "pinning one model must report the one model that actually runs",
  );
  selectionAvailable = false;
  assert.equal(
    context.tierCountForTest("standard"),
    0,
    "an unavailable pinned model must not be reported as an automatic race",
  );

  assert.match(html, /OpenRouter Models by Tier/);
  assert.match(
    html,
    /ULTRAPLINIAN’s selected local pool is added when Automatic is used/,
  );
  assert.match(
    html,
    /setCurrentModeModelSelection[\s\S]*?buildTierSelect\(\);/,
    "changing the header model must rebuild the displayed tier counts",
  );
  assert.match(
    html,
    /\{GODMODE:ENABLED\} \/\/ assembling provider-qualified race/,
  );
  assert.doesNotMatch(
    html,
    /\{GODMODE:ENABLED\} \/\/ \$\{modelsToQuery\.length\} models loaded/,
    "the first thinking line must not report a cloud-only count as the live race",
  );
});

test("returns visible LM Studio final text without exposing hidden reasoning", async () => {
  const html = await readFile(publicEntry, "utf8");
  const helperStart = html.indexOf("function getChatCompletionFinalText");
  const helperEnd = html.indexOf(
    "\n\n    // Query a single model (for ultraplinian)",
    helperStart,
  );
  assert.ok(
    helperStart > 0 && helperEnd > helperStart,
    "Missing final-text and model-error helpers",
  );
  const context = vm.createContext({
    state: {
      localOnly: true,
      localRuntime: "lmstudio",
      localReasoningEffort: "none",
    },
  });
  vm.runInContext(
    `${html.slice(helperStart, helperEnd)}
globalThis.getFinalTextForTest = getChatCompletionFinalText;
globalThis.getEmptyErrorForTest = getEmptyChatCompletionError;
globalThis.classifyErrorForTest = classifyModelError;
globalThis.diagnoseForTest = diagnoseAllModelsFailed;`,
    context,
  );

  const privateReasoning = "PRIVATE CHAIN MUST NEVER APPEAR";
  const reasoningOnly = {
    choices: [
      {
        message: { content: "", reasoning_content: privateReasoning },
        finish_reason: "length",
      },
    ],
    usage: { completion_tokens_details: { reasoning_tokens: 512 } },
  };
  assert.equal(context.getFinalTextForTest(reasoningOnly), "");
  const reasoningError = context.getEmptyErrorForTest(reasoningOnly);
  assert.match(reasoningError, /reasoning_output_limit/);
  assert.doesNotMatch(reasoningError, new RegExp(privateReasoning));
  assert.equal(context.classifyErrorForTest(reasoningError), "output_limit");
  const diagnosis = context.diagnoseForTest([
    { success: false, provider: "local", error: reasoningError },
  ]);
  assert.match(diagnosis, /Max Tokens/i);
  assert.match(diagnosis, /reasoning/i);
  assert.doesNotMatch(diagnosis, /API key|account/i);

  const normal = {
    choices: [
      {
        message: {
          content: [{ type: "output_text", text: "VISIBLE FINAL" }],
          reasoning_content: privateReasoning,
        },
        finish_reason: "stop",
      },
    ],
  };
  assert.equal(context.getFinalTextForTest(normal), "VISIBLE FINAL");

  const fetchStart = html.indexOf("async function fetchChatCompletion");
  const fetchEnd = html.indexOf("\n\n    async function testLocalConnection", fetchStart);
  assert.ok(fetchStart > 0 && fetchEnd > fetchStart, "Missing chat transport");
  const transportState = {
    localRuntime: "lmstudio",
  };
  const transportProfiles = {
    lmstudio: {
      reasoningEffort: "none",
      reasoningOffModels: "ornith-1.0-9b",
    },
    vllm: { reasoningEffort: "none", reasoningOffModels: "" },
  };
  let capturedRequest;
  const transportContext = vm.createContext({
    state: transportState,
    window: { location: { origin: "https://example.test" } },
    normalizeOpenRouterRequestBody: (body) => body,
    parseLocalModelIds: (raw) =>
      String(raw || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    getLocalRuntimeProfile: (runtime) => transportProfiles[runtime],
    getLocalTransportSnapshot: () => null,
    resolveChatTarget: (model) => ({
      provider: "local",
      runtime: transportState.localRuntime,
      model,
      url: "http://127.0.0.1:1234/v1/chat/completions",
      apiKey: "",
    }),
    fetch: async (url, options) => {
      capturedRequest = { url, options };
      return { ok: true };
    },
  });
  vm.runInContext(
    `${html.slice(fetchStart, fetchEnd)}
globalThis.fetchChatForTest = fetchChatCompletion;`,
    transportContext,
  );

  await transportContext.fetchChatForTest(
    { model: "ornith-1.0-9b", messages: [] },
    { provider: "local" },
  );
  assert.equal(
    JSON.parse(capturedRequest.options.body).reasoning_effort,
    "none",
    "the explicit LM Studio final-answer setting disables hidden reasoning",
  );
  transportProfiles.lmstudio.reasoningEffort = "auto";
  await transportContext.fetchChatForTest(
    { model: "ornith-1.0-9b", messages: [] },
    { provider: "local" },
  );
  assert.equal(
    Object.hasOwn(JSON.parse(capturedRequest.options.body), "reasoning_effort"),
    false,
    "model-default reasoning must remain available as an explicit user choice",
  );
  transportState.localRuntime = "vllm";
  await transportContext.fetchChatForTest(
    { model: "any-vllm-model", messages: [] },
    { provider: "local" },
  );
  assert.equal(
    Object.hasOwn(JSON.parse(capturedRequest.options.body), "reasoning_effort"),
    false,
    "LM Studio reasoning controls must not leak into other local runtimes",
  );
  transportState.localRuntime = "lmstudio";
  transportProfiles.lmstudio.reasoningEffort = "none";
  transportProfiles.lmstudio.reasoningOffModels = "";
  await transportContext.fetchChatForTest(
    { model: "ornith-1.0-9b", messages: [] },
    { provider: "local" },
  );
  assert.equal(
    Object.hasOwn(JSON.parse(capturedRequest.options.body), "reasoning_effort"),
    false,
    "models without an explicit reasoning-off capability must keep their supported default",
  );

  assert.match(html, /id="localReasoningEffortInput"/);
  assert.match(html, /Final answers only \(recommended\)/);
  assert.match(
    html,
    /const content = getChatCompletionFinalText\(data\);\s+if \(!content\.trim\(\)\) \{\s+const emptyError = getEmptyChatCompletionError\(data\);\s+addThinkingLog\(`\$\{displayLabel\}/,
    "CLASSIC must reject reasoning-only responses instead of scoring empty text",
  );
  assert.match(
    html,
    /const content = getChatCompletionFinalText\(data\);[\s\S]*?updateThinkingModel\(variant\.raceKey, 'fail', null, 'empty'\);/,
    "PARSELTONGUE must classify empty final text consistently",
  );
  assert.match(html, /let fastSawReasoning = false;/);
  assert.match(
    html,
    /throw new Error\(getEmptyChatCompletionError\(\{\s+choices:/,
    "FAST streaming must not return an empty success after reasoning-only chunks",
  );
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
    /ultraplinian: 'Automatic · tier models \+ this mode’s local pool'/,
  );
  assert.match(
    html,
    /parseltongue: 'Automatic · each technique × this mode’s local pool'/,
  );
  assert.match(
    html,
    /pliny: 'Automatic · each prompt × this mode’s local pool'/,
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
  const transportHelperStart = html.indexOf("const _localTransportSnapshots");
  const transportHelperEnd = html.indexOf(
    "\n\n    function bumpLocalRuntimeProfileGeneration",
    transportHelperStart,
  );
  assert.ok(
    transportHelperStart > 0 && transportHelperEnd > transportHelperStart,
  );

  const modeSelectionState = {
    apiKey: "openrouter-present",
    veniceApiKey: "",
    localOnly: false,
    localEnabled: true,
    localRuntime: "lmstudio",
    localBaseUrl: localRuntimePresets.lmstudio.baseUrl,
    localModels: "same/model, lm-beta",
    model: "same/model",
    modeModelSelections: {
      ultraplinian: { provider: "local", model: "lm-beta" },
      parseltongue: { provider: "local", model: "same/model" },
      pliny: { provider: "openrouter", model: "same/model" },
    },
  };
  const context = vm.createContext({
    state: modeSelectionState,
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
    MODE_MODEL_SELECTION_SCHEMA_VERSION: 2,
    LOCAL_RUNTIME_IDS: new Set(localRuntimeIds),
    _localApiKeysByRuntime: {},
    getLocalRuntimeProfile() {
      return {
        baseUrl: modeSelectionState.localBaseUrl,
        models: modeSelectionState.localModels,
        modeModelPools: {},
        reasoningEffort: "none",
        reasoningOffModels: "",
      };
    },
    getLocalModels() {
      return ["same/model", "lm-beta"];
    },
    hasLocalProvider() {
      return modeSelectionState.localEnabled && modeSelectionState.localModels.length > 0;
    },
    getLocalAutomaticRaceModels(mode) {
      if (mode === "parseltongue") return ["same/model", "lm-beta"];
      return ["lm-beta"];
    },
    getCurrentMode() {
      return "parseltongue";
    },
    normalizeOpenRouterModel(model) {
      return model === "same/model" ? model : "same/model";
    },
    resolveChatTarget(model, provider, runtime) {
      const resolvedProvider =
        provider === "auto"
          ? modeSelectionState.apiKey
            ? "openrouter"
            : modeSelectionState.localEnabled
              ? "local"
              : modeSelectionState.veniceApiKey
                ? "venice"
                : "auto"
          : provider;
      return {
        provider: resolvedProvider,
        model,
        runtime:
          resolvedProvider === "local"
            ? runtime || modeSelectionState.localRuntime
            : undefined,
      };
    },
    encodeURIComponent,
    decodeURIComponent,
    JSON,
  });
  vm.runInContext(
    `${html.slice(transportHelperStart, transportHelperEnd)}
${html.slice(helperStart, helperEnd)}
globalThis.getModeModelRequestForTest = getModeModelRequest;
globalThis.getModeExecutionSelectionForTest = getModeExecutionSelection;
globalThis.getModeAuxiliaryTargetForTest = getModeAuxiliaryTarget;
globalThis.resolveModeModelRequestForTest = resolveModeModelRequest;
globalThis.getModeRaceTargetsForTest = getModeRaceTargets;
globalThis.defaultModeModelSelectionsForTest = defaultModeModelSelections;
globalThis.migrateLegacyModeModelSelectionsForTest = migrateLegacyModeModelSelections;
globalThis.encodeModeModelSelectionForTest = encodeModeModelSelection;
globalThis.decodeModeModelSelectionForTest = decodeModeModelSelection;`,
    context,
  );

  assert.deepEqual(
    structuredClone(
      context.getModeModelRequestForTest("parseltongue", "same/model"),
    ),
    { provider: "local", model: "same/model", runtime: "lmstudio" },
    "A local target must stay local even when an OpenRouter key and identical model ID exist",
  );
  assert.deepEqual(
    structuredClone(context.getModeModelRequestForTest("pliny", "same/model")),
    { provider: "openrouter", model: "same/model", runtime: undefined },
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
    localModels: ["same/model", "lm-beta"],
    runtime: "lmstudio",
  });
  assert.equal(Object.isFrozen(automaticSnapshot.localModels), true);
  assert.deepEqual(
    structuredClone(
      context.getModeAuxiliaryTargetForTest(automaticSnapshot),
    ),
    { provider: "local", model: "same/model", runtime: "lmstudio" },
    "Automatic helper calls must stay on the frozen selected pool instead of the first discovered model",
  );
  assert.deepEqual(
    structuredClone(
      context.getModeRaceTargetsForTest(
        "parseltongue",
        "same/model",
        automaticSnapshot,
      ),
    ),
    [
      { provider: "openrouter", model: "same/model" },
      { provider: "local", model: "same/model", runtime: "lmstudio" },
      { provider: "local", model: "lm-beta", runtime: "lmstudio" },
    ],
    "Automatic mode targets must preserve same-ID models from different providers and include the entire selected local pool",
  );

  modeSelectionState.localEnabled = false;
  assert.deepEqual(
    structuredClone(
      context.getModeRaceTargetsForTest(
        "parseltongue",
        "same/model",
        automaticSnapshot,
      ),
    ),
    [
      { provider: "openrouter", model: "same/model" },
      { provider: "local", model: "same/model", runtime: "lmstudio" },
      { provider: "local", model: "lm-beta", runtime: "lmstudio" },
    ],
    "An in-flight Automatic race must retain its frozen local pool after the live runtime is disabled",
  );
  const cloudOnlySnapshot =
    context.getModeExecutionSelectionForTest("parseltongue");
  assert.deepEqual(structuredClone(cloudOnlySnapshot), {
    provider: "auto",
    model: "",
    localModels: [],
    runtime: "lmstudio",
  });
  assert.equal(
    context.getModeAuxiliaryTargetForTest(cloudOnlySnapshot),
    null,
    "Disabled local state must not redirect Automatic helper calls to a stale local model",
  );
  assert.deepEqual(
    structuredClone(
      context.getModeRaceTargetsForTest(
        "parseltongue",
        "same/model",
        cloudOnlySnapshot,
      ),
    ),
    [{ provider: "openrouter", model: "same/model" }],
    "Automatic must keep working through cloud when disabled local inventory remains persisted",
  );
  modeSelectionState.localEnabled = true;

  modeSelectionState.apiKey = "";
  context.getLocalAutomaticRaceModels = () => ["lm-beta"];
  const exactSubsetSnapshot =
    context.getModeExecutionSelectionForTest("parseltongue");
  context.getLocalAutomaticRaceModels = () => ["same/model", "lm-beta"];
  assert.deepEqual(
    structuredClone(
      context.getModeRaceTargetsForTest(
        "parseltongue",
        "same/model",
        exactSubsetSnapshot,
      ),
    ),
    [{ provider: "local", model: "lm-beta", runtime: "lmstudio" }],
    "An in-flight Automatic run must retain its exact selected local subset even if the live pool changes",
  );
  assert.deepEqual(
    structuredClone(
      context.defaultModeModelSelectionsForTest(
        "same/model",
        ["same/model", "lm-beta"],
        true,
      ),
    ),
    {
      ultraplinian: { provider: "auto", model: "" },
      parseltongue: { provider: "auto", model: "" },
      pliny: { provider: "auto", model: "" },
    },
    "A fresh local-only setup must default every mode to its one-model Automatic pool",
  );
  assert.deepEqual(
    structuredClone(
      context.migrateLegacyModeModelSelectionsForTest(
        {
          ultraplinian: { provider: "auto", model: "" },
          parseltongue: { provider: "openrouter", model: "same/model" },
          pliny: { provider: "auto", model: "" },
        },
        "same/model",
        ["lm-beta"],
        true,
        0,
        false,
      ),
    ).parseltongue,
    { provider: "auto", model: "" },
    "The old auto-generated PARSELTONGUE pin must migrate to the new Automatic pool semantics",
  );
  assert.deepEqual(
    structuredClone(
      context.migrateLegacyModeModelSelectionsForTest(
        {
          parseltongue: { provider: "local", model: "lm-beta" },
        },
        "same/model",
        ["lm-beta"],
        true,
        0,
        false,
      ),
    ).parseltongue,
    { provider: "local", model: "lm-beta" },
    "A genuinely different legacy pin must survive the one-time migration",
  );
  modeSelectionState.apiKey = "openrouter-present";
  context.getLocalAutomaticRaceModels = (mode) =>
    mode === "parseltongue" ? ["same/model", "lm-beta"] : ["lm-beta"];

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
  assert.deepEqual(
    structuredClone(context.getModeAuxiliaryTargetForTest(explicitSnapshot)),
    { provider: "local", model: "lm-beta", runtime: "lmstudio" },
  );
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
    { provider: "local", model: "lm-beta", runtime: "lmstudio" },
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
  assert.match(classicSource, /getModeRaceTargets\('pliny'/);
  assert.match(
    classicSource,
    /raceCombos\.flatMap[\s\S]*raceAttempts\.map\(attempt => tryCombo/,
    "CLASSIC must expand its prompt strategies across its per-mode model pool",
  );
  assert.match(classicSource, /fetchChatCompletion\(bodyParams/);
  assert.match(
    classicSource,
    /bodyParams\.max_tokens = modeRequest\.provider === 'local'\s+\? \(state\.modelMaxTokens \?\? 4096\)/,
    "CLASSIC must honour the configured local output-token budget",
  );
  assert.doesNotMatch(classicSource, /openrouter\.ai|Bearer \$\{state\.apiKey\}/);

  const parselStart = html.indexOf("async function executeParseltongue");
  const parselEnd = html.indexOf(
    "\n\n    // ═══════════════════════════════════════════════════════════════════\n    // End Parseltongue",
    parselStart,
  );
  const parselSource = html.slice(parselStart, parselEnd);
  assert.match(parselSource, /getModeRaceTargets\('parseltongue'/);
  assert.match(
    parselSource,
    /modeTargets\.flatMap[\s\S]*for \(let i = 0; i < raceVariants\.length/,
    "PARSELTONGUE must expand its techniques across its per-mode model pool",
  );
  assert.match(parselSource, /fetchChatCompletion\(\{/);
  assert.doesNotMatch(parselSource, /openrouter\.ai|Bearer \$\{state\.apiKey\}/);

  const fastStart = html.indexOf("const fastStreamPromise");
  const fastEnd = html.indexOf("\n\n          if (isFastSolo)", fastStart);
  const fastSource = html.slice(fastStart, fastEnd);
  assert.match(fastSource, /const fastModeRequest = fastModeTargets\[0\]/);
  assert.match(fastSource, /fetchChatCompletion\(\{/);
  assert.match(
    fastSource,
    /max_tokens: fastModeRequest\.provider === 'local'\s+\? \(state\.modelMaxTokens \?\? 4096\)/,
    "FAST must honour the configured local output-token budget",
  );
  assert.doesNotMatch(fastSource, /openrouter\.ai|Bearer \$\{state\.apiKey\}/);
  assert.match(
    sendSource,
    /const useFastStreaming = fastModeTargets\.length === 1/,
    "FAST may use its one-target stream only when Automatic has not selected multiple models",
  );
  assert.match(
    sendSource,
    /const fullComboStopped = abortController\?\.signal\?\.aborted === true/,
    "The FULL COMBO path must surface a user Stop instead of an all-failed answer",
  );
  assert.match(
    sendSource,
    /raceScore >= fastScore \+ \(state\.liquidMinDelta \|\| 8\)/,
    "A CLASSIC race result must beat FAST by the configured minimum improvement",
  );

  assert.match(
    sendSource,
    /if \(attachedImage && hasAuxiliaryModelProvider\(executionTarget\)\)/,
    "Vision must run for any available exact target, including Venice-only configurations",
  );
  assert.match(
    sendSource,
    /const executionTarget = getModeAuxiliaryTarget\(executionSelection\)/,
    "Automatic helper calls must use the frozen per-mode local pool",
  );
  assert.doesNotMatch(
    sendSource,
    /attachedImage && \(state\.apiKey \|\| hasLocalProvider\(\)\)/,
  );
  assert.match(
    html,
    /if \(modeTarget\?\.provider && modeTarget\?\.model\) \{[\s\S]*?const exactJudge = await callJudge\(modeTarget\.model, 30000\);[\s\S]*?if \(state\.localOnly\)/,
    "ULTRAPLINIAN judging must use the exact selected helper target before any legacy first-local fallback",
  );
  assert.match(
    html,
    /for \(const coachModel of \(modeTarget \? \[modeTarget\.model\] : PLINY_COACH_MODELS\)\)/,
    "ULTRAPLINIAN coaching must stay on the exact selected helper target",
  );
});

test("executes every selected PARSELTONGUE model without changing its technique count", async () => {
  const html = await readFile(publicEntry, "utf8");
  const start = html.indexOf("async function executeParseltongue");
  const end = html.indexOf(
    "\n\n    // ═══════════════════════════════════════════════════════════════════\n    // End Parseltongue",
    start,
  );
  assert.ok(start > 0 && end > start);

  const calls = [];
  const context = vm.createContext({
    state: {
      parseltongueTier: "light",
      modelFreqPenalty: 0,
      modelPresPenalty: 0,
      modelMaxTokens: 512,
    },
    console: { log() {}, error() {} },
    DOMException,
    AbortController,
    abortController: new AbortController(),
    setTimeout,
    getModeRaceTargets: () => [
      { provider: "local", model: "org-a/shared-model" },
      { provider: "local", model: "org-b/shared-model" },
    ],
    modelTargetKey: (target) => `${target.provider}:${target.model}`,
    detectParseltrigueTriggers: () => [],
    generateParseltongueVariants: () => [
      { text: "plain", technique: "raw", label: "Raw", index: 0 },
      { text: "leet", technique: "leetspeak", label: "L33T", index: 1 },
    ],
    getParseltongueSamplingParams: () => ({
      temperature: 0.7,
      top_p: 1,
    }),
    initThinkingSteps() {},
    addThinkingLog() {},
    thinkingState: { models: {} },
    updateThinkingUI() {},
    updateThinkingModel() {},
    updateMorphTechnique() {},
    setThinkingLeader() {},
    setThinkingWinner() {},
    finishThinking() {},
    fetchChatCompletion: async (body, options) => {
      calls.push({ model: body.model, provider: options.provider });
      return {
        ok: true,
        async json() {
          return {
            choices: [
              {
                message: {
                  content: `visible answer from ${body.model}`,
                },
              },
            ],
          };
        },
      };
    },
    getChatCompletionFinalText: (data) =>
      data.choices[0].message.content,
    getEmptyChatCompletionError: () => "empty",
    scoreResponse: (content) => ({
      score: content.includes("org-b") ? 80 : 70,
      isRefusal: false,
    }),
  });
  vm.runInContext(
    `${html.slice(start, end)}
globalThis.executeParseltongueForTest = executeParseltongue;`,
    context,
  );

  const result = structuredClone(
    await context.executeParseltongueForTest(
      [{ role: "user", content: "test" }],
      "fallback",
      "test",
      { provider: "auto", model: "" },
    ),
  );
  assert.equal(calls.length, 4, "2 techniques × 2 selected models must run");
  assert.deepEqual(
    calls.map(({ model }) => model).sort(),
    [
      "org-a/shared-model",
      "org-a/shared-model",
      "org-b/shared-model",
      "org-b/shared-model",
    ],
  );
  assert.equal(
    Object.keys(context.thinkingState.models).length,
    4,
    "Same-basename model IDs must retain separate PARSELTONGUE status rows",
  );
  assert.equal(result.magic.techniques_total, 2);
  assert.equal(result.magic.models_total, 2);
  assert.equal(result.magic.variants_total, 4);
  assert.equal(result.magic.model, "org-b/shared-model");
  assert.equal(result.magic.provider, "local");
});

test("executes every selected CLASSIC model while preserving the prompt selection", async () => {
  const html = await readFile(publicEntry, "utf8");
  const start = html.indexOf("async function executePlinyMode");
  const end = html.indexOf(
    "\n\n    // ═══════════════════════════════════════════════════════════════════\n    // PARSELTONGUE",
    start,
  );
  assert.ok(start > 0 && end > start);

  const calls = [];
  const combo = {
    id: "one-prompt",
    model: "native-cloud-model",
    codename: "ONE PROMPT",
    color: "#fff",
    system: "system",
    user: "{QUERY}",
    fast: false,
  };
  let enabledCombos = [combo];
  let raceTargets = [
    { provider: "local", model: "org-a/shared-model" },
    { provider: "local", model: "org-b/shared-model" },
  ];
  const context = vm.createContext({
    state: {
      libertasSelectedCombo: "one-prompt",
      strategyLogs: [],
      modelMaxTokens: 512,
      liquidMinDelta: 8,
    },
    console: { log() {}, error() {} },
    DOMException,
    AbortController,
    AbortSignal,
    abortController: new AbortController(),
    _lastHarmResult: null,
    _lastTelemetryCtx: {},
    getEnabledCombos: () => enabledCombos,
    getModeRaceTargets: () => raceTargets,
    modelTargetKey: (target) => `${target.provider}:${target.model}`,
    initThinkingSteps() {},
    addThinkingLog() {},
    thinkingState: { models: {} },
    updateThinkingUI() {},
    updateThinkingModel() {},
    setThinkingWinner() {},
    finishThinking() {},
    applyHallOfFameCombo: (selected, query) => ({
      system: selected.system,
      user: query,
    }),
    escapeHtml: (value) => value,
    highlightPromptInjection: (value) => value,
    fetchChatCompletion: async (body, options) => {
      calls.push({
        model: body.model,
        provider: options.modeTarget?.provider || options.provider,
        maxTokens: body.max_tokens,
      });
      return {
        ok: true,
        async json() {
          return {
            choices: [
              {
                message: {
                  content: `visible answer from ${body.model}`,
                },
              },
            ],
          };
        },
      };
    },
    getChatCompletionFinalText: (data) =>
      data.choices[0].message.content,
    getEmptyChatCompletionError: () => "empty",
    scoreResponse: (content) => ({
      score: content.includes("org-b") ? 90 : 70,
      isRefusal: false,
    }),
    ENCODING_ESCALATION: [{ label: "PLAIN", fn: (value) => value }],
    saveState() {},
    trackEvent() {},
  });
  vm.runInContext(
    `${html.slice(start, end)}
globalThis.executePlinyModeForTest = executePlinyMode;`,
    context,
  );

  const result = structuredClone(
    await context.executePlinyModeForTest(
      [{ role: "user", content: "test" }],
      "fallback",
      "test",
      { modeSelection: { provider: "auto", model: "" } },
    ),
  );
  assert.deepEqual(calls, [
    { model: "org-a/shared-model", provider: "local", maxTokens: 512 },
    { model: "org-b/shared-model", provider: "local", maxTokens: 512 },
  ]);
  assert.equal(
    Object.keys(context.thinkingState.models).length,
    2,
    "Same-basename model IDs must retain separate CLASSIC status/stat keys",
  );
  assert.equal(result.magic.combos_attempted, 1);
  assert.equal(result.magic.models_attempted, 2);
  assert.equal(result.magic.model_prompt_attempts, 2);
  assert.equal(result.magic.model, "org-b/shared-model");
  assert.equal(result.magic.provider, "local");

  calls.length = 0;
  context.state.libertasSelectedCombo = "all";
  enabledCombos = Array.from({ length: 5 }, (_, index) => ({
    ...combo,
    id: `prompt-${index + 1}`,
    codename: `PROMPT ${index + 1}`,
    fast: index === 4,
  }));
  raceTargets = [{ provider: "local", model: "org-a/shared-model" }];
  const regeneratedResult = structuredClone(
    await context.executePlinyModeForTest(
      [{ role: "user", content: "regenerate" }],
      "fallback",
      "regenerate",
      { modeSelection: { provider: "auto", model: "" } },
    ),
  );
  assert.equal(
    calls.length,
    5,
    "Direct/regeneration execution must include all five enabled CLASSIC strategies",
  );
  assert.equal(regeneratedResult.magic.combos_attempted, 5);

  calls.length = 0;
  await context.executePlinyModeForTest(
    [{ role: "user", content: "send" }],
    "fallback",
    "send",
    {
      modeSelection: { provider: "auto", model: "" },
      fastHandledExternally: true,
    },
  );
  assert.equal(
    calls.length,
    4,
    "The send-time streaming path must exclude only the externally handled FAST strategy",
  );

  context.abortController = new AbortController();
  context.fetchChatCompletion = async (_body, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener(
        "abort",
        () => reject(options.signal.reason),
        { once: true },
      );
    });
  const stoppedRun = context.executePlinyModeForTest(
    [{ role: "user", content: "stop" }],
    "fallback",
    "stop",
    { modeSelection: { provider: "auto", model: "" } },
  );
  setTimeout(() => context.abortController.abort(), 0);
  await assert.rejects(
    stoppedRun,
    (error) => error?.name === "AbortError",
    "A global Stop must reject CLASSIC instead of publishing a winner or all-failed error",
  );
});

test("routes local requests through only the frozen runtime profile", async () => {
  const html = await readFile(publicEntry, "utf8");
  const resolverStart = html.indexOf("function resolveChatTarget");
  const resolverEnd = html.indexOf(
    "\n\n    async function fetchChatCompletion",
    resolverStart,
  );
  assert.ok(resolverStart > 0 && resolverEnd > resolverStart);
  const transportHelperStart = html.indexOf("const _localTransportSnapshots");
  const transportHelperEnd = html.indexOf(
    "\n\n    function bumpLocalRuntimeProfileGeneration",
    transportHelperStart,
  );
  assert.ok(
    transportHelperStart > 0 && transportHelperEnd > transportHelperStart,
  );

  const profiles = {
    ollama: {
      baseUrl: "http://localhost:11434/v1",
      models: "shared-model, ollama-only",
    },
    lmstudio: {
      baseUrl: "http://localhost:1234/v1",
      models: "shared-model, lmstudio-only",
    },
  };
  const runtimeState = {
    apiKey: "",
    veniceApiKey: "",
    localOnly: true,
    localEnabled: true,
    localRuntime: "ollama",
    localBaseUrl: profiles.ollama.baseUrl,
  };
  const context = vm.createContext({
    state: runtimeState,
    MODE_MODEL_PROVIDERS: new Set([
      "auto",
      "openrouter",
      "venice",
      "local",
    ]),
    LOCAL_RUNTIME_IDS: new Set(localRuntimeIds),
    OPENROUTER_LEGACY_MODEL_MIGRATIONS: {},
    OPENROUTER_FREE_CHAT_MODEL_SET: new Set(),
    VENICE_MODELS: [],
    _localApiKeysByRuntime: {
      ollama: "ollama-key",
      lmstudio: "lmstudio-key",
    },
    parseLocalModelIds: (raw) =>
      String(raw || "")
        .split(",")
        .map((model) => model.trim())
        .filter(Boolean),
    getLocalRuntimeProfile(runtime) {
      return profiles[runtime];
    },
    normalizeLocalRuntime(runtime) {
      return localRuntimeIds.includes(runtime) ? runtime : "custom";
    },
    normalizeLocalBaseUrl(raw) {
      return String(raw).replace(/\/+$/, "");
    },
    hasLocalProvider: () => true,
    normalizeOpenRouterModel: (model) => model,
  });
  vm.runInContext(
    `${html.slice(transportHelperStart, transportHelperEnd)}
${html.slice(resolverStart, resolverEnd)}
globalThis.attachLocalTransportSnapshotForTest = attachLocalTransportSnapshot;
globalThis.resolveChatTargetForTest = resolveChatTarget;`,
    context,
  );

  const executionContext = {};
  context.attachLocalTransportSnapshotForTest(executionContext, "ollama");
  const frozenOllamaTarget = structuredClone(
    context.resolveChatTargetForTest(
      "shared-model",
      "local",
      "ollama",
      executionContext,
    ),
  );
  assert.deepEqual(frozenOllamaTarget, {
    provider: "local",
    runtime: "ollama",
    model: "shared-model",
    url: "http://localhost:11434/v1/chat/completions",
    apiKey: "ollama-key",
  });
  assert.throws(
    () =>
      context.resolveChatTargetForTest(
        "lmstudio-only",
        "local",
        "ollama",
      ),
    /no longer available/,
    "An inactive runtime's inventory must not satisfy the active runtime",
  );

  runtimeState.localRuntime = "lmstudio";
  runtimeState.localBaseUrl = profiles.lmstudio.baseUrl;
  assert.deepEqual(
    structuredClone(
      context.resolveChatTargetForTest("shared-model", "local"),
    ),
    {
      provider: "local",
      runtime: "lmstudio",
      model: "shared-model",
      url: "http://localhost:1234/v1/chat/completions",
      apiKey: "lmstudio-key",
    },
  );
  assert.deepEqual(
    structuredClone(
      context.resolveChatTargetForTest(
        "shared-model",
        "local",
        "ollama",
        executionContext,
      ),
    ),
    frozenOllamaTarget,
    "A frozen Ollama run must not jump to LM Studio after the UI switches runtime",
  );
  profiles.ollama.baseUrl = "http://localhost:9999/v1";
  profiles.ollama.models = "replacement-only";
  context._localApiKeysByRuntime.ollama = "replacement-key";
  assert.deepEqual(
    structuredClone(
      context.resolveChatTargetForTest(
        "shared-model",
        "local",
        "ollama",
        executionContext,
      ),
    ),
    frozenOllamaTarget,
    "A running answer must retain its original endpoint, credential, and inventory after the saved profile is edited",
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
  const transportHelperStart = html.indexOf("const _localTransportSnapshots");
  const transportHelperEnd = html.indexOf(
    "\n\n    function bumpLocalRuntimeProfileGeneration",
    transportHelperStart,
  );
  assert.ok(
    transportHelperStart > 0 && transportHelperEnd > transportHelperStart,
  );

  const runtimeState = {
    apiKey: "openrouter-present",
    veniceApiKey: "venice-present",
    localOnly: false,
    localEnabled: true,
    localRuntime: "lmstudio",
    localBaseUrl: "http://localhost:1234/v1",
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
    LOCAL_RUNTIME_IDS: new Set(localRuntimeIds),
    _localApiKeysByRuntime: {},
    parseLocalModelIds(raw) {
      return String(raw || "")
        .split(",")
        .map((model) => model.trim())
        .filter(Boolean);
    },
    getLocalRuntimeProfile() {
      return {
        baseUrl: runtimeState.localBaseUrl,
        models: runtimeState.localModels.join(", "),
      };
    },
    getLocalModels() {
      return runtimeState.localModels;
    },
    hasLocalProvider() {
      return runtimeState.localEnabled && runtimeState.localModels.length > 0;
    },
    normalizeLocalBaseUrl() {
      return "http://localhost:1234/v1";
    },
    normalizeLocalRuntime(runtime) {
      return localRuntimeIds.includes(runtime) ? runtime : "custom";
    },
    normalizeOpenRouterModel(model) {
      return freeModels.has(model) ? model : "same/model";
    },
  });
  vm.runInContext(
    `${html.slice(transportHelperStart, transportHelperEnd)}
${html.slice(resolverStart, resolverEnd)}
${html.slice(auxiliaryStart, auxiliaryEnd)}
globalThis.resolveChatTargetForTest = resolveChatTarget;
globalThis.createModeTargetForTest = createModeTarget;
globalThis.hasAuxiliaryModelProviderForTest = hasAuxiliaryModelProvider;`,
    context,
  );

  assert.deepEqual(
    structuredClone(
      context.resolveChatTargetForTest("same/model", "local"),
    ),
    {
      provider: "local",
      runtime: "lmstudio",
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
  const frozenLocalAuxiliaryTarget =
    context.createModeTargetForTest("local", "same/model", "lmstudio");
  runtimeState.localEnabled = false;
  runtimeState.localModels = [];
  assert.equal(
    context.hasAuxiliaryModelProviderForTest(frozenLocalAuxiliaryTarget),
    true,
    "A helper already attached to a frozen local run must remain available after live settings change",
  );
  assert.throws(
    () => context.resolveChatTargetForTest("same/model", "local"),
    /selected local model provider is unavailable/,
    "A disabled explicit local pin must fail exactly instead of falling back to cloud",
  );
  runtimeState.localEnabled = true;
  runtimeState.localModels = ["same/model", "lm-beta"];

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

test("keeps ULTRAPLINIAN winner and Thinking-grid identity provider-qualified", async () => {
  const html = await readFile(publicEntry, "utf8");
  const ultraStart = html.indexOf("async function ultraplinian");
  const ultraEnd = html.indexOf("async function consortium", ultraStart);
  assert.ok(ultraStart > 0 && ultraEnd > ultraStart);
  const ultraSource = html.slice(ultraStart, ultraEnd);
  const thinkingKeyStart = html.indexOf(
    "function getUltraplinianThinkingModelKey",
  );
  const thinkingKeyEnd = html.indexOf(
    "\n\n    function hasLocalUltraplinianRaceEntry",
    thinkingKeyStart,
  );
  assert.ok(
    thinkingKeyStart > 0 && thinkingKeyEnd > thinkingKeyStart,
    "Missing provider-qualified Thinking-grid key helper",
  );
  const getThinkingKey = vm.runInNewContext(
    `(${html.slice(thinkingKeyStart, thinkingKeyEnd)})`,
  );
  const localThinkingKey = getThinkingKey({
    provider: "local",
    model: "same/model",
  });
  const openRouterThinkingKey = getThinkingKey({
    provider: "openrouter",
    model: "same/model",
  });
  assert.notEqual(
    localThinkingKey,
    openRouterThinkingKey,
    "The Thinking grid must retain two workers when provider IDs collide",
  );
  assert.match(localThinkingKey, /same\/model.*local/);
  assert.match(openRouterThinkingKey, /same\/model.*openrouter/);
  assert.match(
    ultraSource,
    /setThinkingModels\(raceEntries\.map\(getUltraplinianThinkingModelKey\)\)/,
  );
  assert.match(
    ultraSource,
    /const thinkingModelKey = getUltraplinianThinkingModelKey\(entry\)/,
  );
  assert.doesNotMatch(
    ultraSource,
    /updateThinkingModel\(model,/,
    "Worker status updates must not overwrite a same-ID worker from another provider",
  );
  assert.doesNotMatch(
    ultraSource,
    /setThinkingWinner\((?:earlyWinner|winner)\.model\)/,
    "Winner highlighting must use the same provider-qualified grid key",
  );
  assert.match(
    ultraSource,
    /setThinkingLeader\(thinkingModelKey, score, result\.content\)/,
    "Live-leader highlighting must use the same provider-qualified grid key",
  );

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

test("waits for slow local ULTRAPLINIAN completions before judging", async () => {
  const html = await readFile(publicEntry, "utf8");
  const timeoutStart = html.indexOf(
    "function hasLocalUltraplinianRaceEntry",
  );
  const timeoutEnd = html.indexOf(
    "\n\n    // Main ULTRAPLINIAN execution",
    timeoutStart,
  );
  assert.ok(timeoutStart > 0 && timeoutEnd > timeoutStart);

  const timeoutConstants = html.match(
    /const ULTRAPLINIAN_CLOUD_RACE_TIMEOUT_MS = ([^;]+);\s+const ULTRAPLINIAN_LOCAL_RACE_TIMEOUT_MS = ([^;]+);/,
  );
  assert.ok(timeoutConstants, "Missing ULTRAPLINIAN timeout constants");

  const timeoutContext = vm.createContext({
    AbortController,
    clearTimeout,
    queueMicrotask,
    setTimeout,
  });
  vm.runInContext(
    `const ULTRAPLINIAN_CLOUD_RACE_TIMEOUT_MS = ${timeoutConstants[1]};
const ULTRAPLINIAN_LOCAL_RACE_TIMEOUT_MS = ${timeoutConstants[2]};
${html.slice(timeoutStart, timeoutEnd)}
globalThis.getUltraplinianRaceTimeoutMsForTest = getUltraplinianRaceTimeoutMs;
globalThis.hasLocalUltraplinianRaceEntryForTest = hasLocalUltraplinianRaceEntry;
globalThis.waitForUltraplinianRaceForTest = waitForUltraplinianRace;`,
    timeoutContext,
  );
  const getTimeout =
    timeoutContext.getUltraplinianRaceTimeoutMsForTest;
  const waitForRace =
    timeoutContext.waitForUltraplinianRaceForTest;
  const hasLocalRaceEntry =
    timeoutContext.hasLocalUltraplinianRaceEntryForTest;

  assert.equal(
    getTimeout([{ provider: "local", model: "liquid/lfm2.5-1.2b" }]),
    null,
    "A pinned local model must not be aborted by an arbitrary wall-clock cutoff",
  );
  assert.equal(
    getTimeout([
      { provider: "local", model: "local-model" },
      { provider: "local", model: "second-local-model" },
    ]),
    null,
  );
  assert.equal(
    getTimeout([{ provider: "openrouter", model: "cloud-model" }]),
    45_000,
  );
  assert.equal(
    getTimeout([
      { provider: "local", model: "local-model" },
      { provider: "openrouter", model: "cloud-model" },
    ]),
    null,
    "A selected local model must not be discarded by the cloud timeout in a mixed race",
  );
  assert.equal(
    hasLocalRaceEntry([
      { provider: "openrouter", model: "cloud-model" },
      { provider: "local", model: "slow-local-model" },
    ]),
    true,
  );
  assert.match(
    html,
    /const MIN_RESULTS_FOR_GRACE = HAS_LOCAL_RACE_ENTRY\s+\? Infinity/,
    "cloud successes must not start a grace cutoff while a selected local model is running",
  );

  const timeoutEvents = [];
  const timedOutResults = [];
  const timeoutController = new AbortController();
  const deferredWorker = new Promise((resolve) => {
    timeoutController.signal.addEventListener("abort", () => {
      timeoutEvents.push("abort");
      queueMicrotask(() => {
        timedOutResults.push({
          provider: "local",
          model: "liquid/lfm2.5-1.2b",
          success: false,
          error: "aborted",
        });
        timeoutEvents.push("worker-published");
        resolve(timedOutResults[0]);
      });
    });
  });

  await waitForRace([deferredWorker], timeoutController, {
    modelCount: 1,
    minResultsForGrace: 2,
    gracePeriodMs: 50,
    hardTimeoutMs: 5,
    onLog(message) {
      if (message.includes("Hard timeout")) timeoutEvents.push("timeout");
    },
  });
  timeoutEvents.push(`judge-saw-${timedOutResults.length}`);

  assert.deepEqual(timeoutEvents, [
    "timeout",
    "abort",
    "worker-published",
    "judge-saw-1",
  ]);
  assert.equal(
    timedOutResults.length,
    1,
    "Judging must not observe an empty race before abort handlers settle",
  );

  const noTimeoutController = new AbortController();
  const slowLocalWorker = new Promise((resolve) => {
    setTimeout(() => resolve({
      provider: "local",
      model: "slow-local-model",
      success: true,
      response: "finished",
    }), 20);
  });
  const noTimeoutEvents = [];
  await waitForRace([slowLocalWorker], noTimeoutController, {
    modelCount: 1,
    minResultsForGrace: 2,
    gracePeriodMs: 5,
    hardTimeoutMs: null,
    onLog(message) {
      noTimeoutEvents.push(message);
    },
  });
  assert.equal(noTimeoutController.signal.aborted, false);
  assert.deepEqual(noTimeoutEvents, []);

  const multiLocalController = new AbortController();
  let slowLocalCompleted = false;
  const multiLocalWorkers = [
    Promise.resolve({ provider: "local", model: "fast-a", success: true }),
    Promise.resolve({ provider: "local", model: "fast-b", success: true }),
    new Promise((resolve) => {
      setTimeout(() => {
        slowLocalCompleted = true;
        resolve({ provider: "local", model: "slow-c", success: true });
      }, 25);
    }),
  ];
  await waitForRace(multiLocalWorkers, multiLocalController, {
    modelCount: multiLocalWorkers.length,
    minResultsForGrace: Infinity,
    gracePeriodMs: 5,
    hardTimeoutMs: null,
  });
  assert.equal(slowLocalCompleted, true);
  assert.equal(
    multiLocalController.signal.aborted,
    false,
    "unlimited local selections must wait for serialized/slow local workers",
  );

  const completedResults = [];
  const completionController = new AbortController();
  const completedWorker = Promise.resolve().then(() => {
    const result = {
      provider: "local",
      model: "liquid/lfm2.5-1.2b",
      success: true,
      content: "```python\nprint('render me')\n```",
    };
    completedResults.push(result);
    return result;
  });

  await waitForRace([completedWorker], completionController, {
    modelCount: 1,
    minResultsForGrace: 2,
    gracePeriodMs: 50,
    hardTimeoutMs: 100,
  });
  assert.equal(completedResults.length, 1);
  assert.equal(completionController.signal.aborted, false);

  const ultraStart = html.indexOf("async function ultraplinian");
  const ultraEnd = html.indexOf("async function consortium", ultraStart);
  const ultraSource = html.slice(ultraStart, ultraEnd);
  assert.match(
    ultraSource,
    /const HARD_TIMEOUT_MS = getUltraplinianRaceTimeoutMs\(raceEntries\);/,
  );
  assert.match(
    ultraSource,
    /await waitForUltraplinianRace\(promises, controller,/,
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
    "localRaceModels",
    "localModeModelPools",
    "localReasoningEffort",
    "modeModelSelections",
    "modeModelSelectionVersion",
  ]) {
    assert.match(exportSource, new RegExp(`${key}: state\\.${key}`));
  }
  assert.match(
    exportSource,
    /localRuntimeProfiles: normalizeLocalRuntimeProfiles\(\s+state\.localRuntimeProfiles,\s+state\.localRuntime,/,
  );
  assert.match(
    exportSource,
    /localRuntimeProfileVersion: LOCAL_RUNTIME_PROFILE_SCHEMA_VERSION/,
  );
  assert.match(exportSource, /_version: 6/);
  assert.doesNotMatch(exportSource, /localApiKey/);
  assert.doesNotMatch(exportSource, /_localApiKeysByRuntime/);

  const importStart = html.indexOf("const allowed = ['conversations'");
  const importEnd = html.indexOf("];", importStart) + 2;
  const importAllowlist = html.slice(importStart, importEnd);
  assert.match(importAllowlist, /'localRuntime'/);
  assert.match(importAllowlist, /'localBaseUrl'/);
  assert.match(importAllowlist, /'localRaceModels'/);
  assert.match(importAllowlist, /'localModeModelPools'/);
  assert.match(importAllowlist, /'localRuntimeProfiles'/);
  assert.match(importAllowlist, /'localRuntimeProfileVersion'/);
  assert.match(importAllowlist, /'localReasoningEffort'/);
  assert.match(importAllowlist, /'modeModelSelections'/);
  assert.match(importAllowlist, /'modeModelSelectionVersion'/);
  assert.doesNotMatch(importAllowlist, /'localApiKey'/);
  assert.doesNotMatch(importAllowlist, /'_localApiKeysByRuntime'/);
  assert.match(
    html,
    /candidate\.localRuntime = imported\.localRuntime === undefined\s+\? inferLocalRuntimeFromBaseUrl\(candidate\.localBaseUrl\)/,
  );
  assert.match(
    html,
    /candidate\.localModels = typeof candidate\.localModels === 'string'\s+\? candidate\.localModels\.slice\(0, MAX_LOCAL_MODEL_STORAGE_CHARS\)/,
  );

  const profileStart = html.indexOf("function parseLocalModelIds");
  const profileEnd = html.indexOf(
    "\n\n    function renderLocalRaceModelPicker",
    profileStart,
  );
  assert.ok(profileStart > 0 && profileEnd > profileStart);
  const capturedBackups = [];
  class TestBlob {
    constructor(parts) {
      this.parts = parts;
    }
  }
  const backupState = {
    conversations: [],
    localEnabled: true,
    localOnly: true,
    localRuntime: "ollama",
    localBaseUrl: localRuntimePresets.ollama.baseUrl,
    localModels: "ollama-a, ollama-b",
    localRaceModels: "ollama-a, ollama-b",
    localModeModelPools: {
      ultraplinian: "ollama-a, ollama-b",
      parseltongue: "ollama-b",
      pliny: "ollama-a",
    },
    localReasoningEffort: "none",
    localReasoningOffModels: "",
    localApiKey: "active-runtime-secret",
    localRuntimeProfiles: {
      ollama: {
        baseUrl: localRuntimePresets.ollama.baseUrl,
        models: "ollama-a, ollama-b",
        modeModelPools: {
          ultraplinian: "ollama-a, ollama-b",
          parseltongue: "ollama-b",
          pliny: "ollama-a",
        },
        apiKey: "nested-ollama-secret",
      },
      lmstudio: {
        baseUrl: localRuntimePresets.lmstudio.baseUrl,
        models: "lm-a, lm-b",
        modeModelPools: {
          ultraplinian: "lm-a, lm-b",
          parseltongue: "lm-b",
          pliny: "lm-a",
        },
        localApiKey: "nested-lm-secret",
      },
    },
    localRuntimeProfileVersion: 1,
  };
  const backupContext = vm.createContext({
    state: backupState,
    LOCAL_RUNTIME_PRESETS: localRuntimePresets,
    LOCAL_RUNTIME_IDS: new Set(localRuntimeIds),
    MAX_LOCAL_MODEL_STORAGE_CHARS: 1_048_576,
    MODE_MODEL_IDS: new Set(["ultraplinian", "parseltongue", "pliny"]),
    _localApiKeysByRuntime: {
      ollama: "credential-map-secret",
      lmstudio: "second-map-secret",
    },
    normalizeLocalRuntime(runtime) {
      return localRuntimeIds.includes(runtime) ? runtime : "custom";
    },
    getLocalModels() {
      return String(backupState.localModels || "")
        .split(",")
        .map((model) => model.trim())
        .filter(Boolean);
    },
    Blob: TestBlob,
    URL: {
      createObjectURL(blob) {
        capturedBackups.push(JSON.parse(blob.parts.join("")));
        return "blob:test-backup";
      },
      revokeObjectURL() {},
    },
    document: {
      createElement: () => ({ click() {} }),
      body: {
        appendChild() {},
        removeChild() {},
      },
    },
  });
  vm.runInContext(
    `${html.slice(profileStart, profileEnd)}
${exportSource}
globalThis.exportFullBackupForTest = exportFullBackup;`,
    backupContext,
  );
  backupContext.exportFullBackupForTest();
  assert.equal(capturedBackups.length, 1);
  const backup = capturedBackups[0];
  assert.equal(backup._version, 6);
  assert.equal(backup.localRuntimeProfileVersion, 1);
  assert.equal(backup.localRuntimeProfiles.ollama.models, "ollama-a, ollama-b");
  assert.equal(backup.localRuntimeProfiles.lmstudio.models, "lm-a, lm-b");
  const serializedBackup = JSON.stringify(backup);
  for (const secret of [
    "active-runtime-secret",
    "nested-ollama-secret",
    "nested-lm-secret",
    "credential-map-secret",
    "second-map-secret",
  ]) {
    assert.doesNotMatch(serializedBackup, new RegExp(secret));
  }
  assert.doesNotMatch(serializedBackup, /localApiKey|apiKey/i);
});

test("legacy backup import resets newer local selection fields instead of retaining live state", async () => {
  const html = await readFile(publicEntry, "utf8");
  const migrationStart = html.indexOf("const imported = _pendingImportData;");
  const migrationEnd = html.indexOf(
    "// Sanitize conversations: validate structure",
    migrationStart,
  );
  assert.ok(
    migrationStart > 0 && migrationEnd > migrationStart,
    "Missing backup migration block",
  );

  const context = vm.createContext({
    MAX_LOCAL_MODEL_STORAGE_CHARS: 1_048_576,
    _pendingImportData: {
      _version: 2,
      model: "legacy-imported-model",
      localModels: "legacy-local-model",
    },
    state: {
      model: "current-model",
      localEnabled: true,
      localOnly: false,
      localRuntime: "lmstudio",
      localBaseUrl: "http://localhost:1234/v1",
      localModels: "current-local-model",
      localRaceModels: "current-local-model",
      localModeModelPools: {
        ultraplinian: "current-local-model",
        parseltongue: "current-local-model",
        pliny: "current-local-model",
      },
      localRuntimeProfiles: {
        lmstudio: {
          baseUrl: "http://localhost:1234/v1",
          models: "current-local-model",
        },
      },
      localRuntimeProfileVersion: 1,
      localReasoningEffort: "auto",
      localReasoningOffModels: "current-local-model",
      modeModelSelections: {
        ultraplinian: { provider: "local", model: "current-local-model" },
      },
    },
    inferLocalRuntimeFromBaseUrl: () => "lmstudio",
    normalizeLocalRuntime: (runtime) => runtime || "lmstudio",
    parseLocalModelIds: (raw) =>
      String(raw || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    normalizeLocalRaceModelSelection: (raw, models) =>
      String(raw || "")
        .split(",")
        .map((value) => value.trim())
        .filter((value) => models.includes(value))
        .join(", "),
    normalizeLocalModeModelPools: (pools, models, legacyUltraplinian) => {
      const source =
        pools && typeof pools === "object" && !Array.isArray(pools) ? pools : {};
      const normalize = (raw) =>
        String(raw || "")
          .split(",")
          .map((value) => value.trim())
          .filter((value) => models.includes(value))
          .join(", ");
      return {
        ultraplinian: normalize(
          typeof source.ultraplinian === "string"
            ? source.ultraplinian
            : legacyUltraplinian,
        ),
        parseltongue: normalize(source.parseltongue),
        pliny: normalize(source.pliny),
      };
    },
    normalizeLocalRuntimeProfiles: (profiles, activeRuntime, legacyProfile) => {
      const source =
        profiles && typeof profiles === "object" && !Array.isArray(profiles)
          ? profiles
          : {};
      const normalized = Object.fromEntries(
        localRuntimeIds.map((runtime) => [
          runtime,
          {
            baseUrl: localRuntimePresets[runtime].baseUrl || "",
            models: "",
            modeModelPools: {
              ultraplinian: "",
              parseltongue: "",
              pliny: "",
            },
            reasoningEffort: "none",
            reasoningOffModels: "",
          },
        ]),
      );
      const activeSource = source[activeRuntime] || legacyProfile;
      if (activeSource) {
        const models = String(activeSource.models || "")
          .split(",")
          .map((model) => model.trim())
          .filter(Boolean);
        const available = new Set(models);
        const normalizePool = (raw) =>
          String(raw || "")
            .split(",")
            .map((model) => model.trim())
            .filter((model) => available.has(model))
            .join(", ");
        normalized[activeRuntime] = {
          baseUrl: activeSource.baseUrl,
          models: activeSource.models,
          modeModelPools: {
            ultraplinian: normalizePool(
              activeSource.modeModelPools?.ultraplinian ||
                activeSource.raceModels,
            ),
            parseltongue: normalizePool(
              activeSource.modeModelPools?.parseltongue,
            ),
            pliny: normalizePool(activeSource.modeModelPools?.pliny),
          },
          reasoningEffort:
            activeSource.reasoningEffort === "auto" ? "auto" : "none",
          reasoningOffModels: "",
        };
      }
      return normalized;
    },
    migrateLegacyModeModelSelections: () => ({
      ultraplinian: { provider: "auto", model: "" },
      parseltongue: { provider: "auto", model: "" },
      pliny: { provider: "auto", model: "" },
    }),
    LOCAL_RUNTIME_PROFILE_SCHEMA_VERSION: 1,
    MODE_MODEL_SELECTION_SCHEMA_VERSION: 2,
  });
  vm.runInContext(
    `${html.slice(migrationStart, migrationEnd)}
globalThis.migratedCandidateForTest = candidate;`,
    context,
  );
  const candidate = structuredClone(context.migratedCandidateForTest);
  assert.equal(candidate.localRaceModels, "");
  assert.deepEqual(candidate.localModeModelPools, {
    ultraplinian: "",
    parseltongue: "",
    pliny: "",
  });
  assert.equal(candidate.localReasoningEffort, "none");
  assert.equal(candidate.localReasoningOffModels, "");
  assert.equal(candidate.localRuntimeProfiles.lmstudio.models, "legacy-local-model");
  assert.equal(candidate.localRuntimeProfileVersion, 1);
  for (const runtime of localRuntimeIds.filter((id) => id !== "lmstudio")) {
    assert.equal(candidate.localRuntimeProfiles[runtime].models, "");
  }
  assert.deepEqual(candidate.modeModelSelections.ultraplinian, {
    provider: "auto",
    model: "",
  });
  assert.equal(candidate.modeModelSelectionVersion, 2);
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
  assert.equal(
    packaged.length,
    source.length,
    "Packaged HTML byte length differs from the maintained public source",
  );
  assert.equal(
    Buffer.compare(packaged, source),
    0,
    "Packaged HTML bytes differ from the maintained public source",
  );
});


test("shows a local-runtime status badge in the header", async () => {
  const html = await readFile(publicEntry, "utf8");

  assert.match(
    html,
    /id="localRuntimeStatusBadge"/,
    "Header must include a local runtime status badge",
  );
  assert.match(
    html,
    /function updateLocalRuntimeStatusBadge()/,
    "Must expose a badge update helper",
  );
  const uiStart = html.indexOf("function getCurrentMode");
  const uiEnd = html.indexOf("\n\n    // Legacy function for compatibility", uiStart);
  assert.ok(uiStart > 0 && uiEnd > uiStart, "Missing updateModeSwitcherUI");
  assert.match(
    html.slice(uiStart, uiEnd),
    /updateLocalRuntimeStatusBadge\(\);/,
    "updateModeSwitcherUI must refresh the local runtime badge",
  );

  const badgeStart = html.indexOf("function updateLocalRuntimeStatusBadge");
  const badgeEnd = html.indexOf(
    "\n\n    function updateModeSwitcherUI",
    badgeStart,
  );
  assert.ok(badgeStart > 0 && badgeEnd > badgeStart);

  const badgeContext = vm.createContext({
    state: {
      localEnabled: true,
      localRuntime: "lmstudio",
      localModels: "model-a, model-b",
      localModeModelPools: {},
      localRuntimeProfiles: {
        lmstudio: {
          baseUrl: "http://localhost:1234/v1",
          models: "model-a, model-b",
          modeModelPools: {},
          reasoningEffort: "none",
          reasoningOffModels: "",
        },
      },
      localRuntimeProfileVersion: 1,
      localApiKey: "",
    },
    document: {
      getElementById(id) {
        if (id !== "localRuntimeStatusBadge") return null;
        if (!this._badgeEl) {
          this._badgeEl = {
            className: "",
            querySelector(selector) {
              if (selector !== ".status-text") return null;
              if (!this._statusText) this._statusText = { textContent: "" };
              return this._statusText;
              },
          };
        }
        return this._badgeEl;
      },
    },
    LOCAL_RUNTIME_IDS: new Set(localRuntimeIds),
    LOCAL_RUNTIME_PRESETS: localRuntimePresets,
    getLocalRuntimeProfile(runtime) {
      return (
        this.state.localRuntimeProfiles[runtime] || {
          baseUrl: "",
          models: "",
          modeModelPools: {},
          reasoningEffort: "none",
          reasoningOffModels: "",
        }
      );
    },
    parseLocalModelIds(raw) {
      return String(raw || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    },
  });
  badgeContext.getLocalRuntimeProfile = badgeContext.getLocalRuntimeProfile.bind(badgeContext);
  vm.runInContext(
    `${html.slice(badgeStart, badgeEnd)}

globalThis.updateLocalRuntimeStatusBadgeForTest = updateLocalRuntimeStatusBadge;`,
    badgeContext,
  );
  badgeContext.updateLocalRuntimeStatusBadgeForTest();
  const badge = badgeContext.document.getElementById("localRuntimeStatusBadge");
  assert.equal(badge.className, "local-runtime-status connected");
  assert.equal(
    badge.querySelector(".status-text").textContent,
    "LM Studio · 2 models",
  );

  badgeContext.state.localEnabled = false;
  badgeContext.updateLocalRuntimeStatusBadgeForTest();
  assert.equal(badge.className, "local-runtime-status disconnected");
  assert.equal(
    badge.querySelector(".status-text").textContent,
    "LM Studio · offline",
  );
});


test("shows a local runtime diagnostics panel", async () => {
  const html = await readFile(publicEntry, "utf8");

  assert.match(
    html,
    /id="localRuntimeDiagnosticsToggle"/,
    "Header must include a local runtime diagnostics toggle",
  );
  assert.match(
    html,
    /id="localRuntimeDiagnostics"/,
    "Must include a local runtime diagnostics panel",
  );
  assert.match(
    html,
    /function logRuntimeDiagnostic\(/,
    "Must expose a logRuntimeDiagnostic helper",
  );
  assert.match(
    html,
    /function toggleRuntimeDiagnostics\(/,
    "Must expose a toggleRuntimeDiagnostics helper",
  );
  assert.match(
    html,
    /function copyRuntimeDiagnostics\(/,
    "Must expose a copyRuntimeDiagnostics helper",
  );
  assert.match(
    html,
    /class="local-runtime-diagnostics-copy"[^>]*>Copy log</,
    "Panel header must include a Copy log button",
  );
  assert.match(
    html,
    /logRuntimeDiagnostic\('Discovering models on '/,
    "Must log the start of local model discovery",
  );
  assert.match(
    html,
    /logRuntimeDiagnostic\('ULTRAPLINIAN: ' \+ diagnosis, 'error'\)/,
    "Must log ULTRAPLINIAN failure diagnosis",
  );

  const logStart = html.indexOf("function logRuntimeDiagnostic");
  const logEnd = html.indexOf("\n\n    function toggleRuntimeDiagnostics", logStart);
  assert.ok(logStart > 0 && logEnd > logStart, "Missing logRuntimeDiagnostic");

  const logEntries = [];
  const logContext = vm.createContext({
    document: {
      getElementById(id) {
        if (id !== "localRuntimeDiagnosticsLog") return null;
        return {
          appendChild(child) {
            logEntries.push(child);
          },
          scrollTop: 0,
          scrollHeight: 0,
        };
      },
      createElement() {
        return { className: "", textContent: "", appendChild() {} };
      },
    },
    Date: {
      prototype: { toLocaleTimeString() { return "12:00:00"; } },
    },
  });

  // Patch Date constructor so new Date().toLocaleTimeString() works in the VM
  logContext.Date = class {
    toLocaleTimeString() { return "12:00:00"; }
  };

  vm.runInContext(
    `${html.slice(logStart, logEnd)}

globalThis.logRuntimeDiagnosticForTest = logRuntimeDiagnostic;`,
    logContext,
  );
  logContext.logRuntimeDiagnosticForTest("LM Studio: 2 models saved", "success");
  assert.equal(logEntries.length, 1);
  assert.equal(logEntries[0].className, "local-runtime-diagnostics-entry");
});

test("copyRuntimeDiagnostics exports the log to clipboard", async () => {
  const html = await readFile(publicEntry, "utf8");

  const copyStart = html.indexOf("function copyRuntimeDiagnostics");
  const copyEnd = html.indexOf("\n\n    function updateModeSwitcherUI", copyStart);
  assert.ok(copyStart > 0 && copyEnd > copyStart, "Missing copyRuntimeDiagnostics");

  const copied = [];
  const logEntries = [];
  const copyContext = vm.createContext({
    document: {
      getElementById(id) {
        if (id !== "localRuntimeDiagnosticsLog") return null;
        return {
          querySelectorAll(selector) {
            if (selector !== ".local-runtime-diagnostics-entry") return [];
            return [
              {
                querySelector(sel) {
                  if (sel === ".local-runtime-diagnostics-time") return { textContent: "12:00:00" };
                  if (sel === ".local-runtime-diagnostics-msg") return { textContent: "test entry" };
                  return null;
                },
              },
            ];
          },
        };
      },
    },
    navigator: {
      clipboard: {
        writeText(text) {
          copied.push(text);
          return Promise.resolve();
        },
      },
    },
    logRuntimeDiagnostic(message, type) {
      logEntries.push({ message, type });
    },
  });

  vm.runInContext(
    `${html.slice(copyStart, copyEnd)}

globalThis.copyRuntimeDiagnosticForTest = copyRuntimeDiagnostics;`,
    copyContext,
  );
  await copyContext.copyRuntimeDiagnosticForTest();
  assert.equal(copied.length, 1);
  assert.equal(copied[0], "12:00:00 test entry");
  assert.equal(logEntries.length, 1);
  assert.equal(logEntries[0].message, "Diagnostics log copied to clipboard");
  assert.equal(logEntries[0].type, "success");
});

test("updateModeSwitcherUI keeps hidden mode checkboxes in sync", async () => {
  const html = await readFile(publicEntry, "utf8");

  const uiStart = html.indexOf("function getCurrentMode");
  const uiEnd = html.indexOf("\n\n    // Legacy function for compatibility", uiStart);
  assert.ok(uiStart > 0 && uiEnd > uiStart, "Missing updateModeSwitcherUI");

  const checks = {};
  const uiContext = vm.createContext({
    state: { ultraplinian: false, plinyMode: true, localRuntime: "ollama", localEnabled: false },
    document: {
      getElementById(id) {
        if (id === "ultraplinian" || id === "plinyMode") {
          return {
            get checked() { return checks[id]; },
            set checked(v) { checks[id] = v; },
          };
        }
        if (id === "modeSwitcherBtn") {
          return {
            className: "",
            innerHTML: "",
            querySelector() { return null; },
          };
        }
        if (id === "modelSelect") {
          return {
            style: {},
            replaceChildren() {},
            appendChild() {},
            setAttribute() {},
            options: [],
            value: "auto",
            dataset: {},
          };
        }
        if (id === "libertasModelSelect") return null;
        return null;
      },
      querySelectorAll() { return []; },
    },
    MODE_MODEL_IDS: new Set(["ultraplinian", "parseltongue", "pliny"]),
    LOCAL_RUNTIME_IDS: new Set(localRuntimeIds),
    LOCAL_RUNTIME_PRESETS: localRuntimePresets,
    getLocalRuntimeProfile() {
      return { baseUrl: "", models: "", modeModelPools: {}, reasoningEffort: "none", reasoningOffModels: "" };
    },
    parseLocalModelIds() { return []; },
    refreshModeModelSelect() {},
    updateLocalRuntimeStatusBadge() {},
    getCurrentMode: undefined,
  });

  vm.runInContext(
    `${html.slice(uiStart, uiEnd)}

globalThis.updateModeSwitcherUIForTest = updateModeSwitcherUI;`,
    uiContext,
  );
  uiContext.updateModeSwitcherUIForTest();
  assert.equal(checks.ultraplinian, false, "ultraplinian checkbox should match state");
  assert.equal(checks.plinyMode, true, "plinyMode checkbox should match state");
});

test("clearRuntimeDiagnostics empties the diagnostics log", async () => {
  const html = await readFile(publicEntry, "utf8");

  assert.match(
    html,
    /function clearRuntimeDiagnostics\(/,
    "Must expose a clearRuntimeDiagnostics helper",
  );

  const clearStart = html.indexOf("function clearRuntimeDiagnostics");
  const clearEnd = html.indexOf("\n\n    function updateModeSwitcherUI", clearStart);
  assert.ok(clearStart > 0 && clearEnd > clearStart, "Missing clearRuntimeDiagnostics");

  const cleared = [];
  const logEntries = [];
  const clearContext = vm.createContext({
    document: {
      getElementById(id) {
        if (id !== "localRuntimeDiagnosticsLog") return null;
        return {
          replaceChildren() {
            cleared.push("cleared");
          },
        };
      },
    },
    logRuntimeDiagnostic(message, type) {
      logEntries.push({ message, type });
    },
  });

  vm.runInContext(
    `${html.slice(clearStart, clearEnd)}\n\nglobalThis.clearRuntimeDiagnosticForTest = clearRuntimeDiagnostics;`,
    clearContext,
  );
  clearContext.clearRuntimeDiagnosticForTest();
  assert.equal(cleared.length, 1);
  assert.equal(logEntries.length, 1);
  assert.equal(logEntries[0].message, "Diagnostics log cleared");
  assert.equal(logEntries[0].type, "info");
});
