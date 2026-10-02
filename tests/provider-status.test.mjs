import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import { localRuntimeIds, localRuntimePresets } from "../scripts/local-runtime-config.mjs";

const html = await readFile(new URL("../public/crow-godmod3.html", import.meta.url), "utf8");

function runtimeFunction(name) {
  const start = html.indexOf(`    ${name === "testLocalConnection" ? "async " : ""}function ${name}(`);
  const end = html.indexOf("\n    }", start) + "\n    }".length;
  assert.ok(start > 0 && end > start, `Missing ${name}`);
  return html.slice(start, end);
}

function createStatusHarness() {
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
  };
  const requests = [];
  const context = vm.createContext({
    URL,
    state,
    LOCAL_RUNTIME_IDS: new Set(localRuntimeIds),
    LOCAL_RUNTIME_PRESETS: localRuntimePresets,
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
  });
  const functions = [
    "normalizeLocalBaseUrl", "getLocalModels", "hasLocalProvider", "hasAnyChatProvider",
    "updateApiWarning", "applyLocalRuntimeProfileToState", "renderActiveLocalRuntimeProfile",
    "bumpLocalRuntimeProfileGeneration", "updateLocalRuntimeStatusBadge", "logRuntimeDiagnostic",
    "testLocalConnection",
  ];
  vm.runInContext(`
    let _localApiKeyGeneration = 0;
    let _localApiKeysByRuntime = {};
    let _localRuntimeProfileGenerations = {};
    let _localRuntimeErrorCounts = {};
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
