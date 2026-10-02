import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import { localRuntimeIds, localRuntimePresets } from "../scripts/local-runtime-config.mjs";

const html = await readFile(new URL("../public/crow-godmod3.html", import.meta.url), "utf8");

function runtimeFunction(name) {
  const declaration = html.match(new RegExp(`    (?:async )?function ${name}\\(`));
  const start = declaration?.index ?? -1;
  const end = html.indexOf("\n    }", start) + "\n    }".length;
  assert.ok(start > 0 && end > start, `Missing ${name}`);
  return html.slice(start, end);
}

function createStatusHarness({ payload } = {}) {
  const profiles = Object.fromEntries(["crowfree", "lmstudio"].map((runtime) => [runtime, {
    baseUrl: localRuntimePresets[runtime].baseUrl,
    models: "",
    modeModelPools: {},
    reasoningEffort: "none",
    reasoningOffModels: "",
  }]));
  const state = {
    localRuntime: "crowfree",
    localEnabled: false,
    localOnly: true,
    localModels: "",
    localBaseUrl: profiles.crowfree.baseUrl,
    localModeModelPools: {},
  };
  const statusText = { textContent: "" };
  const log = { children: [], appendChild(child) { this.children.push(child); }, scrollHeight: 0 };
  const elements = {
    noApiWarning: { style: { display: "flex" } },
    localConnectionStatus: { textContent: "", style: {} },
    localRuntimeInput: { value: "crowfree" },
    localBaseUrlInput: { value: state.localBaseUrl },
    localApiKeyInput: { value: "" },
    localModelsInput: { value: "" },
    localReasoningEffortInput: { value: "none" },
    localEnabled: { checked: false },
    localRuntimeStatusBadge: { className: "", querySelector: () => statusText },
    localRuntimeDiagnosticsLog: log,
    modalityDropdown: { innerHTML: "" },
  };
  const requests = [];
  const context = vm.createContext({
    URL,
    state,
    LOCAL_RUNTIME_IDS: new Set(localRuntimeIds),
    LOCAL_RUNTIME_PRESETS: localRuntimePresets,
    _crowModality: "text",
    CROW_MODALITIES: [
      { id: "image-out", capability: "image", label: "IMAGE", dir: "OUT" },
      { id: "audio-out", capability: "tts", label: "AUDIO", dir: "OUT" },
    ],
    escapeHtml: String,
    document: {
      getElementById: (id) => elements[id] || null,
      createElement: () => ({ children: [], appendChild(child) { this.children.push(child); } }),
    },
    getLocalRuntimeProfile: (runtime) => profiles[runtime],
    setLocalRuntimeProfile(runtime, profile) { profiles[runtime] = profile; return profile; },
    parseLocalModelIds: (models) => String(models || "").split(",").map((id) => id.trim()).filter(Boolean),
    setLocalApiKeyForRuntime() {},
    saveState() {},
    refreshModeModelSelect() {},
    renderLocalRaceModelPicker() {},
    buildTierSelect() {},
    updateLocalRuntimeHelp() {},
    describeLocalConnectionFailure: (error, runtime) => `${runtime}: ${error.message}`,
    discoverLocalChatModels(runtime) {
      return new Promise((resolve, reject) => requests.push({ runtime, resolve, reject }));
    },
    fetch: async () => ({ ok: true, json: async () => payload }),
  });
  const functions = [
    "normalizeLocalBaseUrl", "normalizeLocalRuntime", "getLocalModels", "hasLocalProvider", "hasAnyChatProvider",
    "updateApiWarning", "applyLocalRuntimeProfileToState", "renderActiveLocalRuntimeProfile",
    "bumpLocalRuntimeProfileGeneration", "updateLocalRuntimeStatusBadge", "logRuntimeDiagnostic",
    "testLocalConnection", "getAdvertisedLocalMediaLabels", "describeLocalModelDiscovery",
    "findLocalModelWithCapability",
    "crowModalityTransport", "crowModalityRouteFor", "crowModalityAvailable", "renderModalityOptions",
  ];
  if (payload) functions.push(
    "getLocalModelDescriptorId", "getLocalModelCapabilityTokens", "isExplicitlyNonChatModelDescriptor",
    "extractLocalModelDescriptors", "localModelAllowsReasoningOff", "filterLocalChatModelDescriptors",
    "recordLocalModelCapabilities", "getLocalModelCapabilities", "findLocalModelWithCapability",
    "discoverLocalChatModels",
  );
  vm.runInContext(`
    let _localApiKeyGeneration = 0;
    let _localApiKeysByRuntime = {};
    let _localRuntimeProfileGenerations = {};
    let _localRuntimeErrorCounts = {};
    const _localModelCapsByRuntime = {};
    ${functions.map(runtimeFunction).join("\n")}
  `, context);
  return { context, elements, profiles, requests, state, statusText, log };
}

const modelDiscovery = (models) => ({ models, source: "openai-compatible", skipped: 0, reasoningOffModels: [] });

test("successful discovery removes the no-provider warning immediately", async () => {
  const { context, elements, requests } = createStatusHarness();
  context.updateApiWarning();
  assert.equal(elements.noApiWarning.style.display, "flex");
  const pending = context.testLocalConnection();
  requests[0].resolve(modelDiscovery(["ollama:fixture-chat"]));
  await pending;
  assert.equal(elements.noApiWarning.style.display, "none");
  assert.equal(elements.localModelsInput.value, "ollama:fixture-chat");
  assert.match(elements.localConnectionStatus.textContent, /1 candidate model ID saved/);

  context.applyLocalRuntimeProfileToState("lmstudio");
  context.renderActiveLocalRuntimeProfile();
  assert.equal(elements.noApiWarning.style.display, "flex", "An empty runtime restores the warning when selected");
  context.applyLocalRuntimeProfileToState("crowfree");
  context.renderActiveLocalRuntimeProfile();
  assert.equal(elements.noApiWarning.style.display, "none", "A saved usable runtime clears it when selected");
});

test("late discovery failure belongs to its requested runtime and success clears its count", async () => {
  const { context, elements, requests, profiles, state, statusText, log } = createStatusHarness();
  state.localEnabled = true;
  profiles.lmstudio.models = "manual-model";
  const pending = context.testLocalConnection();
  context.applyLocalRuntimeProfileToState("lmstudio");
  context.renderActiveLocalRuntimeProfile();
  elements.localConnectionStatus.textContent = "LM Studio profile selected";
  requests[0].reject(new Error("CORS rejected"));
  await pending;
  assert.equal(elements.localConnectionStatus.textContent, "LM Studio profile selected");
  assert.equal(statusText.textContent, "LM Studio · 1 model configured");
  context.logRuntimeDiagnostic("Clipboard unavailable", "error");
  assert.equal(statusText.textContent, "LM Studio · 1 model configured", "Generic errors are not attributed to the active runtime");

  context.applyLocalRuntimeProfileToState("crowfree");
  context.renderActiveLocalRuntimeProfile();
  assert.equal(statusText.textContent, "Crow Free AI Gateway · 1 logged error");
  const retry = context.testLocalConnection();
  requests[1].resolve(modelDiscovery(["ollama:fixture-chat"]));
  await retry;
  assert.equal(statusText.textContent, "Crow Free AI Gateway · 1 model configured");
  assert.ok(log.children.some((entry) => entry.children[1].textContent.includes("CORS rejected")), "Clearing a recovered runtime's count preserves diagnostic history");
});

test("manually configured models do not imply a verified live connection", () => {
  const { context, profiles, state, statusText } = createStatusHarness();
  state.localEnabled = true;
  profiles.crowfree.models = "manual-model";
  context.applyLocalRuntimeProfileToState("crowfree");
  context.renderActiveLocalRuntimeProfile();
  assert.equal(statusText.textContent, "Crow Free AI Gateway · 1 model configured");
  state.localBaseUrl = "https://not-loopback.example/v1";
  context.updateLocalRuntimeStatusBadge();
  assert.equal(statusText.textContent, "Crow Free AI Gateway · not configured");
});

test("discovers a speech-only gateway without presenting its route as a chat model", async () => {
  const { context, profiles, state, elements, statusText } = createStatusHarness({
    payload: { data: [{ id: "edge-tts:neural-voices", capabilities: ["tts", "voice_catalog"] }] },
  });
  profiles.crowfree.models = "stale-chat-model";
  context.applyLocalRuntimeProfileToState("crowfree");
  context.renderActiveLocalRuntimeProfile();
  await context.testLocalConnection();
  assert.match(elements.localConnectionStatus.textContent, /no chat model IDs/i);
  assert.match(elements.localConnectionStatus.textContent, /speech output advertised/i);
  assert.doesNotMatch(elements.localConnectionStatus.textContent, /failed/i);
  assert.equal(state.localEnabled, true);
  assert.equal(profiles.crowfree.models, "", "Discovery removes stale chat IDs absent from the live inventory");
  assert.equal(elements.localModelsInput.value, "");
  assert.equal(context.hasAnyChatProvider(), false);
  assert.equal(elements.noApiWarning.style.display, "flex");
  assert.equal(context.findLocalModelWithCapability("crowfree", "tts"), "edge-tts:neural-voices");
  assert.match(statusText.textContent, /speech output advertised/);
  assert.doesNotMatch(statusText.textContent, /model.*configured|logged error/);
  context.renderModalityOptions();
  assert.match(elements.modalityDropdown.innerHTML, /no route advertised by Crow Free AI Gateway/);
  assert.doesNotMatch(elements.modalityDropdown.innerHTML, /start the gateway/);
});

test("empty or malformed discovery cannot invent available models or media routes", async () => {
  for (const data of [[], [null, {}, { id: " " }]]) {
    const { context, elements, state } = createStatusHarness({ payload: { data } });
    await context.testLocalConnection();
    assert.match(elements.localConnectionStatus.textContent, /Connection failed:.*no model IDs/);
    assert.equal(state.localEnabled, false);
    assert.equal(context.hasAnyChatProvider(), false);
    assert.equal(context.findLocalModelWithCapability("crowfree", "tts"), "");
  }
});

test("catalog-only discovery remains distinct from an advertised speech route", async () => {
  const { context, elements, statusText } = createStatusHarness({
    payload: { data: [{ id: "voices-only", capabilities: ["voice_catalog"] }] },
  });
  await context.testLocalConnection();
  assert.match(elements.localConnectionStatus.textContent, /no chat model IDs/i);
  assert.doesNotMatch(elements.localConnectionStatus.textContent, /failed|speech output advertised/i);
  assert.match(elements.localConnectionStatus.textContent, /no supported media routes advertised/i);
  assert.equal(context.findLocalModelWithCapability("crowfree", "tts"), "");
  assert.equal(context.hasAnyChatProvider(), false);
  assert.doesNotMatch(statusText.textContent, /model.*configured|speech output advertised|logged error/);
});

test("mixed discovery retains media capabilities while saving only chat IDs", async () => {
  const { context, profiles, elements } = createStatusHarness({
    payload: { data: [
      { id: "ollama:chat", capabilities: ["chat"] },
      { id: "edge-tts:neural-voices", capabilities: ["tts", "voice_catalog"] },
    ] },
  });
  await context.testLocalConnection();
  assert.equal(profiles.crowfree.models, "ollama:chat");
  assert.equal(context.hasAnyChatProvider(), true);
  assert.equal(context.findLocalModelWithCapability("crowfree", "tts"), "edge-tts:neural-voices");
  assert.match(elements.localConnectionStatus.textContent, /1 candidate model ID saved; 1 non-chat ID skipped/);
});
