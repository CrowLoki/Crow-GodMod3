import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  localRuntimeIds,
  localRuntimePresets,
} from "./local-runtime-config.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const upstreamPath = resolve(projectRoot, "vendor", "godmod3", "index.html");
const outputPath = resolve(projectRoot, "public", "crow-godmod3.html");
const localModelsGuideSourcePath = resolve(
  projectRoot,
  "docs",
  "LOCAL_MODELS.md",
);
const localModelsGuideOutputPath = resolve(
  projectRoot,
  "public",
  "LOCAL_MODELS.md",
);
const brandSystemPath = resolve(projectRoot, "brand-system");
const runtimeThemePath = resolve(projectRoot, "public", "crow-theme");
const webManifestSourcePath = resolve(
  projectRoot,
  "theme-integration",
  "manifest.webmanifest",
);
const webManifestOutputPath = resolve(
  projectRoot,
  "public",
  "manifest.webmanifest",
);

const runtimeThemeFiles = [
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

const openRouterFreeChatModelGroups = [
  {
    label: "InclusionAI",
    models: [
      {
        id: "inclusionai/ling-3.0-flash:free",
        label: "Ling-3.0-flash (free)",
      },
    ],
  },
  {
    label: "Poolside",
    models: [
      {
        id: "poolside/laguna-s-2.1:free",
        label: "Laguna S 2.1 (free)",
      },
      {
        id: "poolside/laguna-xs-2.1:free",
        label: "Laguna XS 2.1 (free)",
      },
    ],
  },
  {
    label: "Cohere",
    models: [
      {
        id: "cohere/north-mini-code:free",
        label: "North Mini Code (free)",
      },
    ],
  },
  {
    label: "NVIDIA",
    models: [
      {
        id: "nvidia/nemotron-3-ultra-550b-a55b:free",
        label: "Nemotron 3 Ultra (free)",
      },
      {
        id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        label: "Nemotron 3 Nano Omni (free)",
      },
      {
        id: "nvidia/nemotron-3-super-120b-a12b:free",
        label: "Nemotron 3 Super (free)",
      },
      {
        id: "nvidia/nemotron-3-nano-30b-a3b:free",
        label: "Nemotron 3 Nano 30B A3B (free)",
      },
      {
        id: "nvidia/nemotron-nano-12b-v2-vl:free",
        label: "Nemotron Nano 12B 2 VL (free)",
      },
      {
        id: "nvidia/nemotron-nano-9b-v2:free",
        label: "Nemotron Nano 9B V2 (free)",
      },
    ],
  },
  {
    label: "Google",
    models: [
      {
        id: "google/gemma-4-26b-a4b-it:free",
        label: "Gemma 4 26B A4B (free)",
      },
      {
        id: "google/gemma-4-31b-it:free",
        label: "Gemma 4 31B (free)",
      },
    ],
  },
  {
    label: "OpenAI",
    models: [
      {
        id: "openai/gpt-oss-20b:free",
        label: "gpt-oss-20b (free)",
      },
    ],
  },
];

const openRouterFreeChatModelIds = openRouterFreeChatModelGroups.flatMap(
  ({ models }) => models.map(({ id }) => id),
);
const openRouterDefaultModel = "nvidia/nemotron-3-ultra-550b-a55b:free";
const openRouterLegacyModelMigrations = {
  "openai/gpt-oss-20b": "openai/gpt-oss-20b:free",
  "nvidia/nemotron-3-super-120b-a12b":
    "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-nano-30b-a3b":
    "nvidia/nemotron-3-nano-30b-a3b:free",
};
const openRouterModelsWithoutPenaltyParameters = [
  "poolside/laguna-s-2.1:free",
  "poolside/laguna-xs-2.1:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "nvidia/nemotron-nano-9b-v2:free",
];
const openRouterModelsWithoutTopP = [
  "poolside/laguna-s-2.1:free",
  "poolside/laguna-xs-2.1:free",
];

function renderOpenRouterFreeModelOptions(indent) {
  return openRouterFreeChatModelGroups
    .flatMap(({ label, models }) => [
      `${indent}<optgroup label="${label}">`,
      ...models.map(
        (model) =>
          `${indent}  <option value="${model.id}">${model.label}</option>`,
      ),
      `${indent}</optgroup>`,
    ])
    .join("\n");
}

async function syncCrowRuntimeAssets() {
  if (!runtimeThemePath.startsWith(resolve(projectRoot, "public"))) {
    throw new Error(`Refusing to replace unsafe theme output: ${runtimeThemePath}`);
  }

  await rm(runtimeThemePath, { recursive: true, force: true });
  await mkdir(runtimeThemePath, { recursive: true });

  for (const relativePath of runtimeThemeFiles) {
    const sourcePath = resolve(brandSystemPath, relativePath);
    const targetPath = resolve(runtimeThemePath, relativePath);
    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
  }

  await copyFile(webManifestSourcePath, webManifestOutputPath);
  await copyFile(localModelsGuideSourcePath, localModelsGuideOutputPath);
}

await syncCrowRuntimeAssets();

let html = (await readFile(upstreamPath, "utf8")).replace(/\r\n/g, "\n");

function replaceRequired(from, to, minimum = 1) {
  const count = html.split(from).length - 1;
  if (count < minimum) {
    throw new Error(
      `Expected at least ${minimum} occurrence(s) of ${JSON.stringify(from)}, found ${count}.`,
    );
  }
  html = html.split(from).join(to);
  return count;
}

function replaceRegex(pattern, replacement, minimum = 0) {
  let count = 0;
  html = html.replace(pattern, (...args) => {
    count += 1;
    return typeof replacement === "function"
      ? replacement(...args)
      : replacement.replace(/\$(\d+)/g, (_, index) => args[Number(index)] ?? "");
  });
  if (count < minimum) {
    throw new Error(
      `Expected at least ${minimum} match(es) for ${pattern}, found ${count}.`,
    );
  }
  return count;
}

const runtimeOpenRouterModelConfig = `    // OpenRouter models allowed by Crow's free-only workspace guardrail.
    const OPENROUTER_FREE_CHAT_MODELS = Object.freeze(${JSON.stringify(openRouterFreeChatModelIds)});
    const OPENROUTER_FREE_CHAT_MODEL_SET = new Set(OPENROUTER_FREE_CHAT_MODELS);
    const OPENROUTER_DEFAULT_MODEL = ${JSON.stringify(openRouterDefaultModel)};
    const OPENROUTER_LEGACY_MODEL_MIGRATIONS = Object.freeze(${JSON.stringify(openRouterLegacyModelMigrations)});
    const OPENROUTER_MODELS_WITHOUT_PENALTY_PARAMETERS = new Set(${JSON.stringify(openRouterModelsWithoutPenaltyParameters)});
    const OPENROUTER_MODELS_WITHOUT_TOP_P = new Set(${JSON.stringify(openRouterModelsWithoutTopP)});

    function normalizeOpenRouterModel(model) {
      const requested = String(model || '');
      const migrated = OPENROUTER_LEGACY_MODEL_MIGRATIONS[requested] || requested;
      return OPENROUTER_FREE_CHAT_MODEL_SET.has(migrated)
        ? migrated
        : OPENROUTER_DEFAULT_MODEL;
    }

    function normalizeOpenRouterRequestBody(body) {
      const normalized = { ...body, model: normalizeOpenRouterModel(body?.model) };
      if (OPENROUTER_MODELS_WITHOUT_PENALTY_PARAMETERS.has(normalized.model)) {
        delete normalized.frequency_penalty;
        delete normalized.presence_penalty;
      }
      if (OPENROUTER_MODELS_WITHOUT_TOP_P.has(normalized.model)) {
        delete normalized.top_p;
      }
      return normalized;
    }

    function normalizePersistedChatModel(model) {
      const requested = String(model || '');
      if (getLocalModels().includes(requested)) return requested;
      if (typeof VENICE_MODELS !== 'undefined' && VENICE_MODELS.includes(requested)) {
        return requested;
      }
      return normalizeOpenRouterModel(requested);
    }`;

const runtimeLocalProviderConfig = `    // First-class loopback runtime presets. URLs remain editable after selection.
    const LOCAL_RUNTIME_PRESETS = Object.freeze(${JSON.stringify(localRuntimePresets)});
    const LOCAL_RUNTIME_IDS = new Set(${JSON.stringify(localRuntimeIds)});

    function inferLocalRuntimeFromBaseUrl(baseUrl) {
      let normalized;
      try {
        normalized = normalizeLocalBaseUrl(baseUrl, 'custom');
      } catch (_) {
        return 'custom';
      }
      for (const [runtimeId, preset] of Object.entries(LOCAL_RUNTIME_PRESETS)) {
        if (runtimeId === 'custom' || !preset.baseUrl) continue;
        try {
          if (normalizeLocalBaseUrl(preset.baseUrl, runtimeId) === normalized) {
            return runtimeId;
          }
        } catch (_) {}
      }
      return 'custom';
    }

    function normalizeLocalRuntime(runtime, baseUrl) {
      const requested = String(runtime || '').trim().toLowerCase();
      if (LOCAL_RUNTIME_IDS.has(requested)) return requested;
      return inferLocalRuntimeFromBaseUrl(baseUrl);
    }

    function updateLocalRuntimeHelp(runtime) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : 'custom';
      const preset = LOCAL_RUNTIME_PRESETS[runtimeId];
      const help = document.getElementById('localRuntimeHelp');
      const keyInput = document.getElementById('localApiKeyInput');
      const origin = window.location.origin;
      if (help) help.textContent = preset.help.replaceAll('{origin}', origin);
      if (keyInput) keyInput.placeholder = preset.apiKeyPlaceholder;
      const originHint = document.getElementById('localOriginHint');
      if (originHint) originHint.textContent = origin;
    }

    function applyLocalRuntimePreset(runtime) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : 'custom';
      const preset = LOCAL_RUNTIME_PRESETS[runtimeId];
      const baseUrlInput = document.getElementById('localBaseUrlInput');
      const modelsInput = document.getElementById('localModelsInput');
      const status = document.getElementById('localConnectionStatus');
      if (preset.baseUrl && baseUrlInput && baseUrlInput.value !== preset.baseUrl) {
        baseUrlInput.value = preset.baseUrl;
        if (modelsInput) modelsInput.value = '';
      }
      if (status) {
        status.textContent = runtimeId === 'custom'
          ? 'Custom URL selected — enter its base URL, then test.'
          : \`\${preset.label} preset loaded — test to discover model IDs.\`;
        status.style.color = 'var(--text-dim)';
      }
      updateLocalRuntimeHelp(runtimeId);
    }

    function describeLocalConnectionFailure(error, runtime, baseUrl) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : 'custom';
      const label = LOCAL_RUNTIME_PRESETS[runtimeId].label;
      const message = String(error?.message || error || 'Unknown error');
      if (/HTTP 401|HTTP 403/i.test(message)) {
        return \`\${label} rejected the credential. Check the optional API key.\`;
      }
      if (/HTTP 404/i.test(message)) {
        return \`No OpenAI-compatible /models endpoint was found at \${baseUrl}.\`;
      }
      if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
        return \`The browser could not reach \${label}. Start the server, allow \${window.location.origin} in its CORS settings, and approve Local Network Access if prompted.\`;
      }
      return message;
    }`;

const runtimeModeModelConfig = `    // Each mode keeps its own explicit provider + model choice.
    // "auto" preserves the mode's native behavior: ULTRAPLINIAN races every
    // available model, CLASSIC uses its paired prompt models, and
    // PARSELTONGUE uses the best configured provider.
    const MODE_MODEL_PROVIDERS = new Set(['auto', 'openrouter', 'venice', 'local']);
    const MODE_MODEL_IDS = new Set(['ultraplinian', 'parseltongue', 'pliny']);

    function parseLocalModelIds(raw) {
      return [...new Set(String(raw || '')
        .split(',')
        .map(model => model.trim())
        .filter(Boolean))].slice(0, 8);
    }

    function inferPersistedModelProvider(
      model,
      localModels = getLocalModels(),
      localOnly = state.localOnly,
    ) {
      const requested = String(model || '');
      if (localOnly && localModels.includes(requested)) return 'local';
      if (OPENROUTER_FREE_CHAT_MODEL_SET.has(OPENROUTER_LEGACY_MODEL_MIGRATIONS[requested] || requested)) {
        return 'openrouter';
      }
      if (typeof VENICE_MODELS !== 'undefined' && VENICE_MODELS.includes(requested)) return 'venice';
      if (localModels.includes(requested)) return 'local';
      return 'openrouter';
    }

    function defaultModeModelSelections(
      fallbackModel = state.model,
      localModels = getLocalModels(),
      localOnly = state.localOnly,
    ) {
      const legacyModel = String(fallbackModel || OPENROUTER_DEFAULT_MODEL).slice(0, 200);
      const legacyProvider = inferPersistedModelProvider(legacyModel, localModels, localOnly);
      return {
        ultraplinian: { provider: 'auto', model: '' },
        parseltongue: {
          provider: legacyProvider,
          model: legacyProvider === 'openrouter'
            ? normalizeOpenRouterModel(legacyModel)
            : legacyModel,
        },
        pliny: { provider: 'auto', model: '' },
      };
    }

    function normalizeModeModelSelection(selection, fallback, localModels = getLocalModels()) {
      if (!selection || typeof selection !== 'object' || Array.isArray(selection)) {
        return { ...fallback };
      }
      const provider = MODE_MODEL_PROVIDERS.has(selection.provider)
        ? selection.provider
        : fallback.provider;
      if (provider === 'auto') return { provider: 'auto', model: '' };

      let model = typeof selection.model === 'string'
        ? selection.model.trim().slice(0, 200)
        : '';
      if (!model || /[\\u0000-\\u001f\\u007f]/.test(model)) return { ...fallback };

      if (provider === 'openrouter') {
        model = OPENROUTER_LEGACY_MODEL_MIGRATIONS[model] || model;
      }
      return { provider, model };
    }

    function normalizeModeModelSelections(
      selections = state.modeModelSelections,
      fallbackModel = state.model,
      localModels = getLocalModels(),
      localOnly = state.localOnly,
    ) {
      const defaults = defaultModeModelSelections(fallbackModel, localModels, localOnly);
      const source = selections && typeof selections === 'object' && !Array.isArray(selections)
        ? selections
        : {};
      return {
        ultraplinian: normalizeModeModelSelection(source.ultraplinian, defaults.ultraplinian, localModels),
        parseltongue: normalizeModeModelSelection(source.parseltongue, defaults.parseltongue, localModels),
        pliny: normalizeModeModelSelection(source.pliny, defaults.pliny, localModels),
      };
    }

    function getModeModelSelection(mode = getCurrentMode()) {
      const safeMode = MODE_MODEL_IDS.has(mode) ? mode : 'parseltongue';
      state.modeModelSelections = normalizeModeModelSelections(state.modeModelSelections);
      return state.modeModelSelections[safeMode];
    }

    function isModeModelSelectionAvailable(selection) {
      if (!selection || selection.provider === 'auto') return true;
      if (selection.provider === 'local') {
        return hasLocalProvider() && getLocalModels().includes(selection.model);
      }
      if (selection.provider === 'openrouter') {
        return !state.localOnly
          && !!state.apiKey
          && OPENROUTER_FREE_CHAT_MODEL_SET.has(selection.model);
      }
      if (selection.provider === 'venice') {
        return !state.localOnly
          && !!state.veniceApiKey
          && typeof VENICE_MODELS !== 'undefined'
          && VENICE_MODELS.includes(selection.model);
      }
      return false;
    }

    function getModeModelRequest(mode, fallbackModel = state.model) {
      const selection = getModeModelSelection(mode);
      if (selection.provider !== 'auto') {
        return { provider: selection.provider, model: selection.model };
      }
      return {
        provider: 'auto',
        model: String(fallbackModel || state.model || OPENROUTER_DEFAULT_MODEL),
      };
    }

    function getModeExecutionSelection(mode = getCurrentMode()) {
      const selection = getModeModelSelection(mode);
      return Object.freeze({ provider: selection.provider, model: selection.model });
    }

    function getPinnedModeTarget(selection) {
      return selection?.provider && selection.provider !== 'auto'
        ? Object.freeze({ provider: selection.provider, model: selection.model })
        : null;
    }

    function modelTargetKey(target) {
      return encodeURIComponent(JSON.stringify([target?.provider || '', target?.model || '']));
    }

    function sameModelTarget(left, right) {
      return !!left
        && !!right
        && left.provider === right.provider
        && left.model === right.model;
    }

    function resolveModeModelRequest(mode, fallbackModel = state.model, executionSelection) {
      const request = executionSelection === undefined
        ? getModeModelRequest(mode, fallbackModel)
        : executionSelection.provider === 'auto'
          ? {
              provider: 'auto',
              model: String(fallbackModel || state.model || OPENROUTER_DEFAULT_MODEL),
            }
          : {
              provider: executionSelection.provider,
              model: executionSelection.model,
            };
      const target = resolveChatTarget(request.model, request.provider);
      return { provider: target.provider, model: target.model };
    }

    function encodeModeModelSelection(selection) {
      if (!selection || selection.provider === 'auto') return 'auto';
      return encodeURIComponent(JSON.stringify([selection.provider, selection.model]));
    }

    function decodeModeModelSelection(value) {
      if (!value || value === 'auto') return { provider: 'auto', model: '' };
      try {
        const parsed = JSON.parse(decodeURIComponent(value));
        if (!Array.isArray(parsed) || parsed.length !== 2) throw new Error('Invalid model selection');
        return { provider: parsed[0], model: parsed[1] };
      } catch (_) {
        return { provider: 'auto', model: '' };
      }
    }

    function appendModeModelOptions(select, label, provider, models) {
      if (!models.length) return;
      const group = document.createElement('optgroup');
      group.label = label;
      for (const model of models) {
        const option = document.createElement('option');
        option.value = encodeModeModelSelection({ provider, model });
        option.textContent = \`\${label} · \${model}\`;
        group.appendChild(option);
      }
      select.appendChild(group);
    }

    function refreshModeModelSelect() {
      const select = document.getElementById('modelSelect');
      if (!select) return;
      const mode = getCurrentMode();
      const autoLabels = {
        ultraplinian: 'Automatic · race all available models',
        parseltongue: 'Automatic · best configured provider',
        pliny: 'Automatic · paired model for each prompt',
      };
      const modeLabels = {
        ultraplinian: 'ULTRAPLINIAN',
        parseltongue: 'PARSELTONGUE',
        pliny: 'Crow-GodMod3 CLASSIC',
      };
      select.replaceChildren();
      const autoOption = document.createElement('option');
      autoOption.value = 'auto';
      autoOption.textContent = autoLabels[mode];
      select.appendChild(autoOption);

      if (state.localEnabled) {
        const runtime = LOCAL_RUNTIME_PRESETS[state.localRuntime]?.label || 'Local';
        appendModeModelOptions(select, runtime, 'local', getLocalModels());
      }
      if (!state.localOnly && state.apiKey) {
        appendModeModelOptions(select, 'OpenRouter', 'openrouter', OPENROUTER_FREE_CHAT_MODELS);
      }
      if (!state.localOnly && state.veniceApiKey && typeof VENICE_MODELS !== 'undefined') {
        appendModeModelOptions(select, 'Venice', 'venice', VENICE_MODELS);
      }

      const selection = getModeModelSelection(mode);
      const selectedValue = encodeModeModelSelection(selection);
      const available = isModeModelSelectionAvailable(selection);
      if (
        selection.provider !== 'auto'
        && ![...select.options].some(option => option.value === selectedValue)
      ) {
        const unavailableOption = document.createElement('option');
        unavailableOption.value = selectedValue;
        unavailableOption.textContent = \`Unavailable · \${selection.provider} · \${selection.model}\`;
        select.appendChild(unavailableOption);
      }
      select.value = selectedValue;
      select.dataset.mode = mode;
      select.dataset.available = String(available);
      select.setAttribute('aria-label', \`Model for \${modeLabels[mode] || mode}\`);
      select.title = available
        ? 'Pick the provider and model used by this mode'
        : 'This saved model is unavailable. Reconnect it or choose another model.';
    }

    function setCurrentModeModelSelection(value) {
      const mode = getCurrentMode();
      const defaults = defaultModeModelSelections();
      const selection = normalizeModeModelSelection(
        decodeModeModelSelection(value),
        defaults[mode],
      );
      state.modeModelSelections = normalizeModeModelSelections(state.modeModelSelections);
      state.modeModelSelections[mode] = selection;
      refreshModeModelSelect();
      saveState();
    }`;

replaceRequired(
  "    // State\n    let state = {",
  `${runtimeOpenRouterModelConfig}

${runtimeLocalProviderConfig}

${runtimeModeModelConfig}

    // State
    let state = {`,
);
replaceRequired(
  "      model: 'anthropic/claude-opus-4.6',",
  "      model: OPENROUTER_DEFAULT_MODEL,",
);

replaceRegex(
  /(          <select class="model-select" id="modelSelect"[^\n]*>\n)[\s\S]*?(\n          <\/select>)/,
  (_match, opening, closing) =>
    `${opening}${renderOpenRouterFreeModelOptions("            ")}${closing}`,
  1,
);
replaceRequired(
  '<select class="model-select" id="modelSelect" onchange="saveState()" style="display: none;">',
  '<select class="model-select" id="modelSelect" onchange="setCurrentModeModelSelection(this.value)" aria-label="Model for current mode" title="Pick the provider and model used by this mode" style="display: none;">',
);
replaceRequired(
  '<div class="mode-option-desc">Query ALL models, AI judge picks best</div>',
  '<div class="mode-option-desc">Race all available models, or pin one model</div>',
);
replaceRequired(
  '<div class="mode-option-desc">33 text obfuscations race in parallel</div>',
  '<div class="mode-option-desc">Text transformations race on your picked model</div>',
);
replaceRequired(
  '<div class="mode-option-desc">Classic L1B3RT4S Prompts — 4 model+prompt combos race</div>',
  '<div class="mode-option-desc">Classic prompt combos race on your picked model</div>',
);
replaceRegex(
  /(              <select id="defaultModelInput">\n)[\s\S]*?(\n              <\/select>)/,
  (_match, opening, closing) =>
    `${opening}${renderOpenRouterFreeModelOptions("                ")}${closing}`,
  1,
);

replaceRequired(
  `          <div class="settings-section">
            <div class="settings-section-title">Local Models (Optional)</div>
            <div class="form-group">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                <input type="checkbox" id="localEnabled" style="width:auto;">
                <label for="localEnabled" style="margin:0;">Enable OpenAI-compatible local models</label>
              </div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                <input type="checkbox" id="localOnly" style="width:auto;">
                <label for="localOnly" style="margin:0;">Local-only mode</label>
              </div>
              <small style="color:#888;display:block;margin:-6px 0 12px;line-height:1.5;">
                Local-only mode never calls OpenRouter or Venice and automatically disables telemetry. Core racing, TASTEMAKER, coaching, and Liquid refinement can all use your local models.
              </small>
              <label>Base URL</label>
              <input type="text" id="localBaseUrlInput" placeholder="http://localhost:11434/v1">
              <small style="color:#888;display:block;margin-top:4px;">OpenAI-compatible localhost endpoint. Examples: Ollama <code>:11434/v1</code>, LM Studio <code>:1234/v1</code>.</small>
            </div>
            <div class="form-group">
              <label>Model IDs</label>
              <input type="text" id="localModelsInput" placeholder="qwen3:8b, llama3.2:3b">
              <small style="color:#888;display:block;margin-top:4px;">Comma-separated IDs reported by <code>/v1/models</code> (maximum 8). Multiple IDs race together.</small>
            </div>
            <div class="form-group">
              <label>API Key (Optional)</label>
              <input type="password" id="localApiKeyInput" placeholder="Leave blank unless your local server requires one">
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <button type="button" class="api-key-btn" onclick="testLocalConnection()">Test &amp; Discover Models</button>
              <span id="localConnectionStatus" style="font-size:11px;color:var(--text-dim);"></span>
            </div>
            <a href="LOCAL_MODELS.md" target="_blank" class="api-key-link">Local setup guide →</a>
          </div>`,
  `          <div class="settings-section">
            <div class="settings-section-title">Local Model Runtimes (Optional)</div>
            <div class="form-group">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                <input type="checkbox" id="localEnabled" style="width:auto;">
                <label for="localEnabled" style="margin:0;">Enable OpenAI-compatible local models</label>
              </div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                <input type="checkbox" id="localOnly" style="width:auto;">
                <label for="localOnly" style="margin:0;">Local-only mode</label>
              </div>
              <small style="color:#888;display:block;margin:-6px 0 12px;line-height:1.5;">
                Local-only mode never calls OpenRouter or Venice. After discovery, use the header model picker to save a different local model for ULTRAPLINIAN, PARSELTONGUE, and CLASSIC.
              </small>
              <label for="localRuntimeInput">Runtime preset</label>
              <select id="localRuntimeInput" onchange="applyLocalRuntimePreset(this.value)">
                <option value="ollama">Ollama</option>
                <option value="lmstudio">LM Studio</option>
                <option value="docker">Docker Model Runner</option>
                <option value="vllm">vLLM</option>
                <option value="llamacpp">llama.cpp</option>
                <option value="custom">Custom OpenAI-compatible</option>
              </select>
              <small id="localRuntimeHelp" style="color:#888;display:block;margin-top:4px;line-height:1.5;"></small>
            </div>
            <div class="form-group">
              <label for="localBaseUrlInput">Base URL</label>
              <input type="text" id="localBaseUrlInput" placeholder="http://localhost:11434/v1" spellcheck="false">
              <small style="color:#888;display:block;margin-top:4px;line-height:1.5;">
                Restricted to this computer: <code>localhost</code> or <code>127.0.0.1</code>. Docker Model Runner uses the nested <code>/engines/v1</code> path.
              </small>
            </div>
            <div class="form-group">
              <label for="localModelsInput">Model IDs</label>
              <input type="text" id="localModelsInput" placeholder="qwen3:8b, llama3.2:3b" spellcheck="false">
              <small style="color:#888;display:block;margin-top:4px;">Exact IDs reported by <code>/models</code> (maximum 8). ULTRAPLINIAN can race them all; each mode can also pin one exact model from the header.</small>
            </div>
            <div class="form-group">
              <label for="localApiKeyInput">API Key (Optional)</label>
              <input type="password" id="localApiKeyInput" placeholder="Optional bearer token">
            </div>
            <div style="padding:10px 12px;margin-bottom:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text-dim);font-size:11px;line-height:1.55;">
              A hosted page needs server CORS permission for <code id="localOriginHint"></code>. Your browser may also ask to allow local-network access; approve that prompt for discovery and chat.
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <button type="button" class="api-key-btn" onclick="testLocalConnection()">Test &amp; Discover Models</button>
              <span id="localConnectionStatus" style="font-size:11px;color:var(--text-dim);flex:1 1 230px;min-width:0;line-height:1.45;overflow-wrap:anywhere;"></span>
            </div>
            <a href="/LOCAL_MODELS.md" target="_blank" class="api-key-link">Setup commands for every runtime →</a>
          </div>`,
);

replaceRequired(
  `      localEnabled: false,  // Use an OpenAI-compatible server on loopback
      localOnly: false,  // Never use cloud providers; telemetry is disabled
      localBaseUrl: 'http://localhost:11434/v1',
      localModels: '',  // Comma-separated model IDs available from the local server
      localApiKey: '',  // Optional token for authenticated local servers`,
  `      localEnabled: false,  // Use an OpenAI-compatible server on loopback
      localOnly: false,  // Never use cloud providers; telemetry is disabled
      localRuntime: '',  // Missing legacy value is inferred from the saved URL
      localBaseUrl: 'http://localhost:11434/v1',
      localModels: '',  // Comma-separated model IDs available from the local server
      localApiKey: '',  // Optional token for authenticated local servers
      modeModelSelections: null,  // Explicit provider + model, saved independently for each mode`,
);

replaceRequired(
  `    function getLocalModels() {
      return [...new Set(String(state.localModels || '')
        .split(',')
        .map(model => model.trim())
        .filter(Boolean))].slice(0, 8);
    }`,
  `    function getLocalModels() {
      return parseLocalModelIds(state.localModels);
    }`,
);

replaceRequired(
  `    function normalizeLocalBaseUrl(raw = state.localBaseUrl) {
      const value = String(raw || '').trim().replace(/\\/+$/, '');
      if (!value) throw new Error('Enter a local model base URL.');
      const url = new URL(value);
      const host = url.hostname.toLowerCase().replace(/^\\[|\\]$/g, '');
      if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
        throw new Error('Local model URL must use localhost, 127.0.0.1, or ::1.');
      }
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Local model URL must use http:// or https://.');
      }
      url.pathname = url.pathname
        .replace(/\\/(?:chat\\/completions|models)\\/?$/i, '')
        .replace(/\\/+$/, '') || '/v1';
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\\/$/, '');
    }`,
  `    function normalizeLocalBaseUrl(raw = state.localBaseUrl, runtime = state.localRuntime) {
      const value = String(raw || '').trim().replace(/\\/+$/, '');
      if (!value) throw new Error('Enter a local model base URL.');
      const url = new URL(value);
      const host = url.hostname.toLowerCase().replace(/^\\[|\\]$/g, '');
      if (!['localhost', '127.0.0.1'].includes(host)) {
        throw new Error('Local model URL must use localhost or 127.0.0.1.');
      }
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Local model URL must use http:// or https://.');
      }
      const fallbackPath = runtime === 'docker' ? '/engines/v1' : '/v1';
      url.pathname = url.pathname
        .replace(/\\/(?:chat\\/completions|models)\\/?$/i, '')
        .replace(/\\/+$/, '') || fallbackPath;
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\\/$/, '');
    }`,
);

replaceRequired(
  `    async function testLocalConnection() {
      const status = document.getElementById('localConnectionStatus');
      if (status) { status.textContent = 'Connecting…'; status.style.color = 'var(--text-dim)'; }
      try {
        const baseUrl = normalizeLocalBaseUrl(document.getElementById('localBaseUrlInput').value);
        const key = (document.getElementById('localApiKeyInput').value || '').trim();
        const headers = key ? { Authorization: \`Bearer \${key}\` } : {};
        const response = await fetch(\`\${baseUrl}/models\`, { headers });
        if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
        const data = await response.json();
        const models = (Array.isArray(data?.data) ? data.data : [])
          .map(item => item?.id)
          .filter(id => typeof id === 'string' && id.trim())
          .slice(0, 8);
        if (!models.length) throw new Error('Server returned no model IDs');
        document.getElementById('localModelsInput').value = models.join(', ');
        document.getElementById('localEnabled').checked = true;
        saveSettings();
        if (status) { status.textContent = \`Connected — \${models.length} model\${models.length === 1 ? '' : 's'} found\`; status.style.color = 'var(--accent)'; }
      } catch (err) {
        if (status) { status.textContent = \`Connection failed: \${err.message}. Check server CORS.\`; status.style.color = '#ff6b6b'; }
      }
    }`,
  `    async function testLocalConnection() {
      const status = document.getElementById('localConnectionStatus');
      const runtimeInput = document.getElementById('localRuntimeInput');
      const runtime = LOCAL_RUNTIME_IDS.has(runtimeInput?.value) ? runtimeInput.value : 'custom';
      let baseUrl = '';
      if (status) { status.textContent = 'Checking /models…'; status.style.color = 'var(--text-dim)'; }
      try {
        baseUrl = normalizeLocalBaseUrl(
          document.getElementById('localBaseUrlInput').value,
          runtime,
        );
        const key = (document.getElementById('localApiKeyInput').value || '').trim();
        const headers = key ? { Authorization: \`Bearer \${key}\` } : {};
        const response = await fetch(\`\${baseUrl}/models\`, { headers });
        if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
        const data = await response.json();
        const models = (Array.isArray(data?.data) ? data.data : [])
          .map(item => item?.id)
          .filter(id => typeof id === 'string' && id.trim())
          .slice(0, 8);
        if (!models.length) throw new Error('Server returned no model IDs');
        document.getElementById('localBaseUrlInput').value = baseUrl;
        document.getElementById('localModelsInput').value = models.join(', ');
        document.getElementById('localEnabled').checked = true;
        saveSettings();
        const label = LOCAL_RUNTIME_PRESETS[state.localRuntime].label;
        if (status) {
          status.textContent = \`\${label}: \${models.length} model ID\${models.length === 1 ? '' : 's'} discovered and saved.\`;
          status.style.color = 'var(--success)';
        }
      } catch (err) {
        if (status) {
          status.textContent = \`Connection failed: \${describeLocalConnectionFailure(err, runtime, baseUrl)}\`;
          status.style.color = 'var(--danger)';
        }
      }
    }`,
);

replaceRequired(
  `      'localEnabled', 'localOnly', 'localBaseUrl', 'localModels', 'localApiKey',`,
  `      'localEnabled', 'localOnly', 'localRuntime', 'localBaseUrl', 'localModels', 'localApiKey',
      'modeModelSelections',`,
);

replaceRequired(
  `            <option value="all">❤️‍🔥 FULL COMBO — Race All 5</option>
            <option value="hermes-fast">⚡ GODMODE FAST · Hermes 4 · INSTANT STREAM</option>
            <option value="gpt-classic">💛 GPT-4o · OG GODMODE L33T</option>
            <option value="gemini-reset">💙 Gemini 2.5 Flash · REBEL GENIUS</option>
            <option value="sonnet-35">🩷 Claude Sonnet 4.6 · SEMANTIC INVERSION GODMODE</option>
            <option value="grok-reset">💜 Grok 3 · RESET_CORTEX</option>`,
  `            <option value="all">❤️‍🔥 FULL COMBO — Race All 5 Free Models</option>
            <option value="hermes-fast">⚡ GODMODE FAST · Ling 3.0 Flash · INSTANT STREAM</option>
            <option value="gpt-classic">💛 gpt-oss-20b · OG GODMODE L33T</option>
            <option value="gemini-reset">💙 Gemma 4 31B · REBEL GENIUS</option>
            <option value="sonnet-35">🩷 Nemotron 3 Ultra · SEMANTIC INVERSION GODMODE</option>
            <option value="grok-reset">💜 Nemotron 3 Super · RESET_CORTEX</option>`,
);
replaceRequired(
  '<select class="model-select" id="libertasModelSelect" onchange="state.libertasSelectedCombo = this.value; saveState();" style="display: none;">',
  '<select class="model-select" id="libertasModelSelect" onchange="state.libertasSelectedCombo = this.value; saveState();" aria-label="Classic prompt strategy" title="Pick the Classic prompt strategy" style="display: none;">',
);
replaceRequired(
  `            <option value="all">❤️‍🔥 FULL COMBO — Race All 5 Free Models</option>
            <option value="hermes-fast">⚡ GODMODE FAST · Ling 3.0 Flash · INSTANT STREAM</option>
            <option value="gpt-classic">💛 gpt-oss-20b · OG GODMODE L33T</option>
            <option value="gemini-reset">💙 Gemma 4 31B · REBEL GENIUS</option>
            <option value="sonnet-35">🩷 Nemotron 3 Ultra · SEMANTIC INVERSION GODMODE</option>
            <option value="grok-reset">💜 Nemotron 3 Super · RESET_CORTEX</option>`,
  `            <option value="all">✦ FULL PROMPT RACE · Run all 5 strategies</option>
            <option value="hermes-fast">⌁ FAST STREAM · Pliny Love prompt</option>
            <option value="gpt-classic">◇ OG GODMODE L33T prompt</option>
            <option value="gemini-reset">💙 REBEL GENIUS prompt</option>
            <option value="sonnet-35">🩷 SEMANTIC INVERSION prompt</option>
            <option value="grok-reset">💜 RESET_CORTEX prompt</option>`,
);

replaceRequired(
  `        model: 'anthropic/claude-sonnet-4.6',
        codename: 'CLAUDE SONNET 4.6',
        description: 'END/START boundary inversion with GODMODE semantic opposite response',`,
  `        model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
        codename: 'NEMOTRON 3 ULTRA',
        description: 'END/START boundary inversion with GODMODE semantic opposite response',`,
);
replaceRequired(
  `        model: 'x-ai/grok-4.5',
        codename: 'GROK 3',
        description: 'Unfiltered liberated response with GODMODE divider and rebel output',`,
  `        model: 'nvidia/nemotron-3-super-120b-a12b:free',
        codename: 'NEMOTRON 3 SUPER',
        description: 'Unfiltered liberated response with GODMODE divider and rebel output',`,
);
replaceRequired(
  `        model: 'google/gemini-2.5-flash',
        codename: 'GEMINI 2.5 FLASH',
        description: 'Pliny Love divider — refusal inversion + rebel genius code block output',`,
  `        model: 'google/gemma-4-31b-it:free',
        codename: 'GEMMA 4 31B',
        description: 'Pliny Love divider — refusal inversion + rebel genius code block output',`,
);
replaceRequired(
  `        model: 'openai/gpt-4o',
        codename: 'GPT-4 CLASSIC',
        description: 'The original GODMODE — refusal + divider + l33t rebel response. Battle-tested',`,
  `        model: 'openai/gpt-oss-20b:free',
        codename: 'GPT-OSS 20B',
        description: 'The original GODMODE — refusal + divider + l33t rebel response. Battle-tested',`,
);
replaceRequired(
  `        model: 'nousresearch/hermes-4-405b',
        codename: 'GODMODE FAST',
        description: 'Hermes 4 405B — instant token stream, zero refusal checking. Raw speed.',`,
  `        model: 'inclusionai/ling-3.0-flash:free',
        codename: 'GODMODE FAST',
        description: 'Ling 3.0 Flash — instant token stream, zero refusal checking. Raw speed.',`,
);

replaceRegex(
  /    const TIER_SIZES = \{[^\n]+\};\n    const ULTRAPLINIAN_MODELS = \[[\s\S]*?\n    \];(?=\n\n    \/\/ ═+\n    \/\/ VENICE MODELS)/,
  `    const TIER_SIZES = { fast: 3, standard: 5, smart: 8, power: 11, ultra: 13 };
    const ULTRAPLINIAN_MODELS = [
      'inclusionai/ling-3.0-flash:free',
      'poolside/laguna-xs-2.1:free',
      'nvidia/nemotron-3-nano-30b-a3b:free',
      'cohere/north-mini-code:free',
      'nvidia/nemotron-nano-9b-v2:free',
      'poolside/laguna-s-2.1:free',
      'openai/gpt-oss-20b:free',
      'google/gemma-4-26b-a4b-it:free',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-nano-12b-v2-vl:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free'
    ];`,
  1,
);

replaceRequired(
  "    const PREFILL_GENERATOR_MODEL = 'nousresearch/hermes-3-llama-3.1-70b'; // Hermes 3 - truly uncensored",
  "    const PREFILL_GENERATOR_MODEL = 'inclusionai/ling-3.0-flash:free';",
);
replaceRequired(
  "            model: 'meta-llama/llama-3.1-8b-instruct',",
  "            model: 'nvidia/nemotron-nano-9b-v2:free',",
);
replaceRequired(
  "            model: 'nousresearch/hermes-3-llama-3.1-70b', // Hermes 3 70B - truly uncensored",
  "            model: 'nvidia/nemotron-nano-9b-v2:free',",
);
replaceRequired(
  `      const HERMES_MODEL = 'nousresearch/hermes-4-70b';  // Preferred - uncensored
      const FAST_MODELS = [
        'google/gemini-2.5-flash',
        'deepseek/deepseek-chat',
      ];`,
  `      const HERMES_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
      const FAST_MODELS = [
        'google/gemma-4-26b-a4b-it:free',
        'openai/gpt-oss-20b:free',
      ];`,
);
replaceRequired(
  `    const PLINY_COACH_MODELS = [
      'nousresearch/hermes-4-70b',         // Primary - uncensored coach, won't hold back
      'deepseek/deepseek-chat',            // Fallback 1 - capable and direct
      'google/gemini-2.5-flash',           // Fallback 2 - fast
      'anthropic/claude-sonnet-4'          // Fallback 3 - smart but may be cautious
    ];`,
  `    const PLINY_COACH_MODELS = [
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'inclusionai/ling-3.0-flash:free'
    ];`,
);
replaceRequired(
  "            model: 'deepseek/deepseek-chat',  // Fast and good at analysis",
  "            model: 'nvidia/nemotron-nano-9b-v2:free',",
);
replaceRequired(
  "            model: 'deepseek/deepseek-chat',",
  "            model: 'nvidia/nemotron-nano-9b-v2:free',",
);
replaceRequired(
  "    const VISION_MODEL = 'google/gemini-2.5-flash';",
  "    const VISION_MODEL = 'google/gemma-4-31b-it:free';",
);
replaceRequired(
  `      // Build race entries: OpenRouter models (when key present) + Venice models (when key present)
      const raceEntries = (state.apiKey && !state.localOnly)
        ? modelsToQuery.map(m => ({ model: m, provider: 'openrouter' }))
        : [];
      if (state.veniceApiKey && !state.localOnly) {
        const veniceTier = state.ultraSpeedTier || 'standard';
        const veniceCount = VENICE_TIER_SIZES[veniceTier] || VENICE_TIER_SIZES.standard;
        const veniceSlice = VENICE_MODELS.slice(0, veniceCount);
        veniceSlice.forEach(m => raceEntries.push({ model: m, provider: 'venice' }));
        _log(\`[ULTRAPLINIAN] +\${veniceSlice.length} Venice models added to race\`);
        addThinkingLog(\`!VENICE +\${veniceSlice.length} models loaded\`, 'info');
      }
      if (hasLocalProvider()) {
        const localModels = getLocalModels();
        localModels.forEach(model => raceEntries.push({ model, provider: 'local' }));
        _log(\`[ULTRAPLINIAN] +\${localModels.length} local models added to race\`);
        addThinkingLog(\`!LOCAL +\${localModels.length} model\${localModels.length === 1 ? '' : 's'} loaded\`, 'info');
      }`,
  `      // Automatic keeps the native multi-provider race. Picking a model
      // pins ULTRAPLINIAN to that exact provider-qualified target.
      const ultraSelection = executionSelection || getModeExecutionSelection('ultraplinian');
      const raceEntries = [];
      if (ultraSelection.provider !== 'auto') {
        const pinnedTarget = resolveChatTarget(ultraSelection.model, ultraSelection.provider);
        raceEntries.push({ model: pinnedTarget.model, provider: pinnedTarget.provider });
        _log(\`[ULTRAPLINIAN] Pinned target: \${pinnedTarget.provider} / \${pinnedTarget.model}\`);
        addThinkingLog(\`!PINNED \${pinnedTarget.provider.toUpperCase()} · \${pinnedTarget.model}\`, 'info');
      } else {
        if (state.apiKey && !state.localOnly) {
          modelsToQuery.forEach(model => raceEntries.push({ model, provider: 'openrouter' }));
        }
        if (state.veniceApiKey && !state.localOnly) {
          const veniceTier = state.ultraSpeedTier || 'standard';
          const veniceCount = VENICE_TIER_SIZES[veniceTier] || VENICE_TIER_SIZES.standard;
          const veniceSlice = VENICE_MODELS.slice(0, veniceCount);
          veniceSlice.forEach(model => raceEntries.push({ model, provider: 'venice' }));
          _log(\`[ULTRAPLINIAN] +\${veniceSlice.length} Venice models added to race\`);
          addThinkingLog(\`!VENICE +\${veniceSlice.length} models loaded\`, 'info');
        }
        if (hasLocalProvider()) {
          const localModels = getLocalModels();
          localModels.forEach(model => raceEntries.push({ model, provider: 'local' }));
          _log(\`[ULTRAPLINIAN] +\${localModels.length} local models added to race\`);
          addThinkingLog(\`!LOCAL +\${localModels.length} model\${localModels.length === 1 ? '' : 's'} loaded\`, 'info');
        }
      }`,
);
replaceRequired(
  `      // ── Winner Priority: Move last race winner to front of the line ──
      // If a model won the previous turn, it gets queried first and becomes
      // the initial leader faster, giving conversation continuity a boost.
      if (state.lastUltraWinner && modelsToQuery.includes(state.lastUltraWinner)) {
        modelsToQuery = [
          state.lastUltraWinner,
          ...modelsToQuery.filter(m => m !== state.lastUltraWinner)
        ];
        _log(\`[ULTRAPLINIAN] Winner priority: \${state.lastUltraWinner.split('/')[1]} moved to front\`);
      }`,
  `      // Previous-winner continuity is provider-qualified. Ignore the
      // legacy bare model string because local and cloud IDs may collide.
      const priorWinnerTarget = state.lastUltraWinnerTarget
        && typeof state.lastUltraWinnerTarget === 'object'
        ? state.lastUltraWinnerTarget
        : null;
      if (
        priorWinnerTarget?.provider === 'openrouter'
        && modelsToQuery.includes(priorWinnerTarget.model)
      ) {
        modelsToQuery = [
          priorWinnerTarget.model,
          ...modelsToQuery.filter(model => model !== priorWinnerTarget.model),
        ];
        _log(\`[ULTRAPLINIAN] Winner priority: \${priorWinnerTarget.model} moved to front\`);
      }`,
);
replaceRequired(
  `      if (state.lastUltraWinner && modelsToQuery[0] === state.lastUltraWinner) {
        addThinkingLog(\`!PRIORITY >> \${state.lastUltraWinner.split('/')[1]} (prev winner)\`, 'info');
      }`,
  `      if (
        priorWinnerTarget?.provider === 'openrouter'
        && modelsToQuery[0] === priorWinnerTarget.model
      ) {
        addThinkingLog(\`!PRIORITY >> \${priorWinnerTarget.model} (prev winner)\`, 'info');
      }`,
);
replaceRequired(
  "      return { provider: 'openrouter', model: requestedModel, url: 'https://openrouter.ai/api/v1/chat/completions', apiKey: state.apiKey };",
  "      return { provider: 'openrouter', model: normalizeOpenRouterModel(requestedModel), url: 'https://openrouter.ai/api/v1/chat/completions', apiKey: state.apiKey };",
);
replaceRequired(
  "      const requestBody = { ...body, model: target.model };",
  `      const requestBody = target.provider === 'openrouter'
        ? normalizeOpenRouterRequestBody({ ...body, model: target.model })
        : { ...body, model: target.model };`,
);
replaceRequired(
  `    function resolveChatTarget(requestedModel, preferredProvider = 'auto') {
      const localModels = getLocalModels();
      let provider = preferredProvider;

      if (state.localOnly) provider = 'local';
      if (provider === 'auto') {
        if (state.apiKey) provider = 'openrouter';
        else if (hasLocalProvider()) provider = 'local';
        else if (state.veniceApiKey) provider = 'venice';
      }

      // Cloud-only helper model IDs transparently map to the first local
      // model when OpenRouter is unavailable. Explicit race entries stay exact.
      if (provider === 'openrouter' && !state.apiKey && hasLocalProvider()) provider = 'local';

      if (provider === 'local') {
        if (!hasLocalProvider()) throw new Error('Local models are not configured. Open Settings → API Keys.');
        return {
          provider,
          model: localModels.includes(requestedModel) ? requestedModel : localModels[0],
          url: \`\${normalizeLocalBaseUrl()}/chat/completions\`,
          apiKey: state.localApiKey || '',
        };
      }
      if (provider === 'venice') {
        if (!state.veniceApiKey) throw new Error('Venice API key is missing.');
        return { provider, model: requestedModel, url: 'https://api.venice.ai/api/v1/chat/completions', apiKey: state.veniceApiKey };
      }
      if (!state.apiKey) throw new Error('OpenRouter API key is missing.');
      return { provider: 'openrouter', model: normalizeOpenRouterModel(requestedModel), url: 'https://openrouter.ai/api/v1/chat/completions', apiKey: state.apiKey };
    }`,
  `    function resolveChatTarget(requestedModel, preferredProvider = 'auto') {
      const localModels = getLocalModels();
      const explicitProvider = preferredProvider !== 'auto';
      let provider = preferredProvider;

      if (!MODE_MODEL_PROVIDERS.has(provider)) {
        throw new Error('Unknown model provider.');
      }
      if (explicitProvider && state.localOnly && provider !== 'local') {
        throw new Error(\`The selected \${provider} model is unavailable while Local-only mode is enabled.\`);
      }
      if (!explicitProvider) {
        if (state.localOnly) provider = 'local';
        else if (state.apiKey) provider = 'openrouter';
        else if (hasLocalProvider()) provider = 'local';
        else if (state.veniceApiKey) provider = 'venice';
        else throw new Error('No model provider is configured.');
      }

      if (provider === 'local') {
        if (!hasLocalProvider()) {
          throw new Error('The selected local model provider is unavailable. Reconnect it in Settings → API Keys.');
        }
        if (explicitProvider && !localModels.includes(requestedModel)) {
          throw new Error(\`The selected local model "\${requestedModel}" is no longer available.\`);
        }
        return {
          provider,
          model: localModels.includes(requestedModel) ? requestedModel : localModels[0],
          url: \`\${normalizeLocalBaseUrl()}/chat/completions\`,
          apiKey: state.localApiKey || '',
        };
      }
      if (provider === 'venice') {
        if (!state.veniceApiKey) throw new Error('The selected Venice model provider is unavailable.');
        const model = typeof VENICE_MODELS !== 'undefined' && VENICE_MODELS.includes(requestedModel)
          ? requestedModel
          : explicitProvider
            ? ''
            : VENICE_MODELS?.[0];
        if (!model) throw new Error(\`The selected Venice model "\${requestedModel}" is unavailable.\`);
        return {
          provider,
          model,
          url: 'https://api.venice.ai/api/v1/chat/completions',
          apiKey: state.veniceApiKey,
        };
      }
      if (!state.apiKey) throw new Error('The selected OpenRouter model provider is unavailable.');
      const openRouterModel = OPENROUTER_LEGACY_MODEL_MIGRATIONS[requestedModel] || requestedModel;
      if (explicitProvider && !OPENROUTER_FREE_CHAT_MODEL_SET.has(openRouterModel)) {
        throw new Error(\`The selected OpenRouter model "\${requestedModel}" is unavailable.\`);
      }
      return {
        provider: 'openrouter',
        model: normalizeOpenRouterModel(openRouterModel),
        url: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: state.apiKey,
      };
    }`,
);
replaceRequired(
  `    async function fetchChatCompletion(body, options = {}) {
      const target = resolveChatTarget(body.model, options.provider || 'auto');`,
  `    async function fetchChatCompletion(body, options = {}) {
      const inheritedTarget = options.modeTarget?.provider && options.modeTarget.provider !== 'auto'
        ? options.modeTarget
        : null;
      const target = resolveChatTarget(
        inheritedTarget?.model || body.model,
        inheritedTarget?.provider || options.provider || 'auto',
      );`,
);
replaceRequired(
  `          const comboMaxTokens = {
            'anthropic/claude-sonnet-4.6': 8192,
            'x-ai/grok-4.5': 32768,
            'google/gemini-2.5-flash': 65536,
            'openai/gpt-4o': 16384,
            'nousresearch/hermes-4-405b': 16384,
          };`,
  `          const comboMaxTokens = {
            'nvidia/nemotron-3-ultra-550b-a55b:free': 8192,
            'nvidia/nemotron-3-super-120b-a12b:free': 8192,
            'google/gemma-4-31b-it:free': 8192,
            'openai/gpt-oss-20b:free': 8192,
            'inclusionai/ling-3.0-flash:free': 8192,
          };`,
);
replaceRequired(
  "            body: JSON.stringify(bodyParams),",
  "            body: JSON.stringify(normalizeOpenRouterRequestBody(bodyParams)),",
);
replaceRequired(
  `            body: JSON.stringify({
              model: model,
              messages: variantMessages,
              temperature: params.temperature,
              top_p: params.top_p,
              frequency_penalty: state.modelFreqPenalty ?? 0,
              presence_penalty: state.modelPresPenalty ?? 0,
              max_tokens: state.modelMaxTokens ?? 4096,
            }),`,
  `            body: JSON.stringify(normalizeOpenRouterRequestBody({
              model,
              messages: variantMessages,
              temperature: params.temperature,
              top_p: params.top_p,
              frequency_penalty: state.modelFreqPenalty ?? 0,
              presence_penalty: state.modelPresPenalty ?? 0,
              max_tokens: state.modelMaxTokens ?? 4096,
            })),`,
);

replaceRequired(
  `    async function executeParseltongue(baseMessages, model, userQuery) {
      const triggers = detectParseltrigueTriggers(userQuery);`,
  `    async function executeParseltongue(baseMessages, model, userQuery, executionSelection) {
      const modeRequest = resolveModeModelRequest('parseltongue', model, executionSelection);
      const requestModel = modeRequest.model;
      const triggers = detectParseltrigueTriggers(userQuery);`,
);
replaceRequired(
  "      addThinkingLog(`Model: ${model.split('/')[1] || model}`, 'info');",
  "      addThinkingLog(`Model: ${requestModel} [${modeRequest.provider}]`, 'info');",
);
replaceRequired(
  `          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': \`Bearer \${state.apiKey}\`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://godmod3.ai',
              'X-Title': 'GODMOD3.AI-parseltongue'
            },
            body: JSON.stringify(normalizeOpenRouterRequestBody({
              model,
              messages: variantMessages,
              temperature: params.temperature,
              top_p: params.top_p,
              frequency_penalty: state.modelFreqPenalty ?? 0,
              presence_penalty: state.modelPresPenalty ?? 0,
              max_tokens: state.modelMaxTokens ?? 4096,
            })),
            signal: abortController?.signal,
          });`,
  `          const response = await fetchChatCompletion({
            model: requestModel,
            messages: variantMessages,
            temperature: params.temperature,
            top_p: params.top_p,
            frequency_penalty: state.modelFreqPenalty ?? 0,
            presence_penalty: state.modelPresPenalty ?? 0,
            max_tokens: state.modelMaxTokens ?? 4096,
          }, {
            provider: modeRequest.provider,
            title: 'Crow-GodMod3-parseltongue',
            signal: abortController?.signal,
          });`,
);
replaceRequired(
  `          model: model,
          duration,`,
  `          model: requestModel,
          provider: modeRequest.provider,
          duration,`,
);
replaceRequired(
  `          body: JSON.stringify({
            model,
            messages: strategyMessages,
            temperature: strategy.temperature,
            top_p: strategy.top_p,
            max_tokens: state.modelMaxTokens ?? 4096,
            frequency_penalty: state.modelFreqPenalty ?? 0,
            presence_penalty: state.modelPresPenalty ?? 0
          }),`,
  `          body: JSON.stringify(normalizeOpenRouterRequestBody({
            model,
            messages: strategyMessages,
            temperature: strategy.temperature,
            top_p: strategy.top_p,
            max_tokens: state.modelMaxTokens ?? 4096,
            frequency_penalty: state.modelFreqPenalty ?? 0,
            presence_penalty: state.modelPresPenalty ?? 0
          })),`,
);
replaceRequired(
  `        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${state.apiKey}\`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://godmod3.ai',
            'X-Title': 'GODMOD3.AI'
          },
          body: JSON.stringify(normalizeOpenRouterRequestBody({
            model,
            messages: strategyMessages,
            temperature: strategy.temperature,
            top_p: strategy.top_p,
            max_tokens: state.modelMaxTokens ?? 4096,
            frequency_penalty: state.modelFreqPenalty ?? 0,
            presence_penalty: state.modelPresPenalty ?? 0
          })),
          signal
        });`,
  `        const modeRequest = resolveModeModelRequest('parseltongue', model);
        const response = await fetchChatCompletion({
          model: modeRequest.model,
          messages: strategyMessages,
          temperature: strategy.temperature,
          top_p: strategy.top_p,
          max_tokens: state.modelMaxTokens ?? 4096,
          frequency_penalty: state.modelFreqPenalty ?? 0,
          presence_penalty: state.modelPresPenalty ?? 0
        }, {
          provider: modeRequest.provider,
          title: 'Crow-GodMod3-strategy',
          signal,
        });`,
);
replaceRegex(
  /^([ \t]+)body: JSON\.stringify\(\{\n\1  model: conv\.model,\n\1  messages: retryMessages,\n\1  temperature: params\.temperature,\n\1  top_p: params\.top_p,\n\1  frequency_penalty: state\.modelFreqPenalty \?\? 0,\n\1  presence_penalty: params\.presence_penalty \|\| state\.modelPresPenalty \|\| 0,\n\1  max_tokens: state\.modelMaxTokens \?\? 4096\n\1\}\),/gm,
  (_match, indent) => `${indent}body: JSON.stringify(normalizeOpenRouterRequestBody({
${indent}  model: conv.model,
${indent}  messages: retryMessages,
${indent}  temperature: params.temperature,
${indent}  top_p: params.top_p,
${indent}  frequency_penalty: state.modelFreqPenalty ?? 0,
${indent}  presence_penalty: params.presence_penalty || state.modelPresPenalty || 0,
${indent}  max_tokens: state.modelMaxTokens ?? 4096
${indent}})),`,
  2,
);
replaceRequired(
  `                body: JSON.stringify({
                  model: fastCombo.model,
                  messages: fastMessages,
                  stream: true,
                  max_tokens: 16384,
                  temperature: 1.0,
                  top_p: 1.0,
                }),`,
  `                body: JSON.stringify(normalizeOpenRouterRequestBody({
                  model: fastCombo.model,
                  messages: fastMessages,
                  stream: true,
                  max_tokens: 16384,
                  temperature: 1.0,
                  top_p: 1.0,
                })),`,
);

replaceRequired(
  `              const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': \`Bearer \${state.apiKey}\`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': 'https://godmod3.ai',
                  'X-Title': 'GODMOD3.AI-godmode-fast'
                },
                body: JSON.stringify(normalizeOpenRouterRequestBody({
                  model: fastCombo.model,
                  messages: fastMessages,
                  stream: true,
                  max_tokens: 16384,
                  temperature: 1.0,
                  top_p: 1.0,
                })),
                signal: abortController.signal,
              });`,
  `              const fastModeRequest = resolveModeModelRequest('pliny', fastCombo.model, executionSelection);
              const response = await fetchChatCompletion({
                model: fastModeRequest.model,
                messages: fastMessages,
                stream: true,
                max_tokens: 16384,
                temperature: 1.0,
                top_p: 1.0,
              }, {
                provider: fastModeRequest.provider,
                title: 'Crow-GodMod3-godmode-fast',
                signal: abortController.signal,
              });`,
);
replaceRequired(
  "              return { content: fastContent, strategy: `godmode-classic-${fastCombo.id}`, score: 50 };",
  `              return {
                content: fastContent,
                strategy: \`godmode-classic-\${fastCombo.id}\`,
                score: 50,
                model: fastModeRequest.model,
                provider: fastModeRequest.provider,
              };`,
);

// CLASSIC: keep each prompt strategy, but run it on the provider-qualified
// model chosen for CLASSIC. "Automatic" preserves the original paired model.
replaceRequired(
  `          const noTempModels = /grok-4|\\/o1-|\\/o3-|deepseek-r1/i.test(combo.model);
          const cappedTempModels = /claude-3\\.7/i.test(combo.model);
          const isSonnet = /claude-sonnet-4\\.6/i.test(combo.model);`,
  `          const modeRequest = resolveModeModelRequest('pliny', combo.model, liquidOptions?.modeSelection);
          const requestModel = modeRequest.model;
          const noTempModels = /grok-4|\\/o1-|\\/o3-|deepseek-r1/i.test(requestModel);
          const cappedTempModels = /claude-3\\.7/i.test(requestModel);
          const isSonnet = /claude-sonnet-4\\.6/i.test(requestModel);`,
);
replaceRequired(
  `        const applied = applyHallOfFameCombo(combo, userQuery, encodeFn);

        addThinkingLog(\`━━━ \${combo.codename} [\${combo.model}] ━━━\`, 'step');`,
  `        const applied = applyHallOfFameCombo(combo, userQuery, encodeFn);
        const modeRequest = resolveModeModelRequest('pliny', combo.model, liquidOptions?.modeSelection);
        const requestModel = modeRequest.model;

        addThinkingLog(\`━━━ \${combo.codename} [\${modeRequest.provider} · \${requestModel}] ━━━\`, 'step');`,
);
replaceRequired(
  `          const modeRequest = resolveModeModelRequest('pliny', combo.model, liquidOptions?.modeSelection);
          const requestModel = modeRequest.model;
          const noTempModels = /grok-4|\\/o1-|\\/o3-|deepseek-r1/i.test(requestModel);`,
  "          const noTempModels = /grok-4|\\/o1-|\\/o3-|deepseek-r1/i.test(requestModel);",
);
replaceRequired(
  `          const bodyParams = {
            model: combo.model,
            messages: plinyMessages,
          };`,
  `          const bodyParams = {
            model: requestModel,
            messages: plinyMessages,
          };`,
);
replaceRequired(
  "            bodyParams.max_tokens = comboMaxTokens[combo.model] || 16384;",
  "            bodyParams.max_tokens = comboMaxTokens[requestModel] || 16384;",
);
replaceRequired(
  `          if (/gemini-2\\.5-pro/i.test(combo.model)) {
            bodyParams.reasoning = { effort: 'low' };
          } else if (/gemini-2\\.5|claude-3\\.7/i.test(combo.model)) {`,
  `          if (/gemini-2\\.5-pro/i.test(requestModel)) {
            bodyParams.reasoning = { effort: 'low' };
          } else if (/gemini-2\\.5|claude-3\\.7/i.test(requestModel)) {`,
);
replaceRequired(
  `          // All models (including Gemini 2.5) go through OpenRouter
          const fetchUrl = 'https://openrouter.ai/api/v1/chat/completions';
          const fetchHeaders = {
            'Authorization': \`Bearer \${state.apiKey}\`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://godmod3.ai',
            'X-Title': 'GODMOD3.AI-godmode-classic'
          };

          const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: fetchHeaders,
            body: JSON.stringify(normalizeOpenRouterRequestBody(bodyParams)),
            signal: AbortSignal.any([abortController?.signal, earlyExitAbort.signal].filter(Boolean))
          });`,
  `          const response = await fetchChatCompletion(bodyParams, {
            provider: modeRequest.provider,
            title: 'Crow-GodMod3-godmode-classic',
            signal: AbortSignal.any([abortController?.signal, earlyExitAbort.signal].filter(Boolean)),
          });`,
);
replaceRequired(
  "            throw new Error(`API ${response.status} [${combo.model}]: ${errBody.slice(0, 200)}`);",
  "            throw new Error(`API ${response.status} [${requestModel}]: ${errBody.slice(0, 200)}`);",
);
replaceRequired(
  `            comboModel: combo.model,
            systemPrompt: applied.system,`,
  `            comboModel: requestModel,
            comboProvider: modeRequest.provider,
            systemPrompt: applied.system,`,
);
replaceRequired(
  `        winnerModel: bestResult?.comboModel,
        winnerScore: bestResult?.score,`,
  `        winnerModel: bestResult?.comboModel,
        winnerProvider: bestResult?.comboProvider,
        winnerScore: bestResult?.score,`,
);
replaceRequired(
  `        winner_model: bestResult?.comboModel || null,
        winner_score: bestResult?.score || 0,`,
  `        winner_model: bestResult?.comboModel || null,
        winner_provider: bestResult?.comboProvider || null,
        winner_score: bestResult?.score || 0,`,
);
replaceRequired(
  `          model: bestResult.comboModel,
          encoding: winningEncoding,`,
  `          model: bestResult.comboModel,
          provider: bestResult.comboProvider,
          encoding: winningEncoding,`,
);
replaceRequired(
  `          mode: 'parseltongue',
          model: conv.model,`,
  `          mode: 'parseltongue',
          model: parseltongueResult?.magic?.model || conv.model,
          provider: parseltongueResult?.magic?.provider || null,`,
);
replaceRequired(
  `    function sanitizeLoadedState() {
      state.localEnabled = state.localEnabled === true;`,
  `    function sanitizeLoadedState() {
      state.model = normalizePersistedChatModel(state.model);
      state.localEnabled = state.localEnabled === true;`,
);
replaceRequired(
  `      state.localBaseUrl = typeof state.localBaseUrl === 'string'
        ? state.localBaseUrl.slice(0, 300)
        : 'http://localhost:11434/v1';
      state.localModels = typeof state.localModels === 'string' ? state.localModels.slice(0, 1000) : '';`,
  `      state.localBaseUrl = typeof state.localBaseUrl === 'string'
        ? state.localBaseUrl.slice(0, 300)
        : 'http://localhost:11434/v1';
      state.localRuntime = normalizeLocalRuntime(state.localRuntime, state.localBaseUrl);
      state.localModels = typeof state.localModels === 'string' ? state.localModels.slice(0, 1000) : '';
      state.modeModelSelections = normalizeModeModelSelections(
        state.modeModelSelections,
        state.model,
        parseLocalModelIds(state.localModels),
      );`,
);
replaceRequired(
  "      if (m.winnerModel != null) m.winnerModel = String(m.winnerModel).slice(0, 100);",
  `      if (m.winnerModel != null) m.winnerModel = String(m.winnerModel).slice(0, 100);
      if (m.winnerProvider != null) {
        m.winnerProvider = MODE_MODEL_PROVIDERS.has(m.winnerProvider)
          ? m.winnerProvider
          : null;
      }`,
);
replaceRequired(
  "              r.model = typeof r.model === 'string' ? r.model.slice(0, 100) : '';",
  `              r.model = typeof r.model === 'string' ? r.model.slice(0, 100) : '';
              r.provider = MODE_MODEL_PROVIDERS.has(r.provider) ? r.provider : null;`,
  2,
);

replaceRequired(
  `      // Provider configurations without OpenRouter use the provider-aware ULTRAPLINIAN pipeline.
      if (((!state.apiKey && (state.veniceApiKey || hasLocalProvider())) || state.localOnly) && !state.ultraplinian) {
        selectMode('ultraplinian');
      }

`,
  '',
  2,
);
replaceRequired(
  `          state.apiKey = plain;
          updateApiWarning();
          buildTierSelect();`,
  `          state.apiKey = plain;
          updateApiWarning();
          buildTierSelect();
          refreshModeModelSelect();`,
);
replaceRequired(
  `      const conv = getCurrentConv();

      // Build user message (may include image metadata for re-rendering)`,
  `      const conv = getCurrentConv();
      const executionMode = getCurrentMode();
      const executionSelection = getModeExecutionSelection(executionMode);
      const executionTarget = getPinnedModeTarget(executionSelection);

      // Build user message (may include image metadata for re-rendering)`,
);
replaceRequired(
  "          visionContext = await processImageWithVision(attachedImage, content);",
  "          visionContext = await processImageWithVision(attachedImage, content, executionTarget);",
);
replaceRequired(
  "      if (attachedImage && (state.apiKey || hasLocalProvider())) {",
  "      if (attachedImage && hasAuxiliaryModelProvider(executionTarget)) {",
);
replaceRequired(
  ": classifyHarm(content).then(r => { _lastHarmResult = r; return r; }).catch(() => null);",
  ": classifyHarm(content, executionTarget).then(r => { _lastHarmResult = r; return r; }).catch(() => null);",
);
replaceRequired(
  `      if (state.ultraplinian) {
        console.log('%c[DEBUG] ✓ ENTERING ULTRAPLINIAN MODE'`,
  `      if (executionMode === 'ultraplinian') {
        console.log('%c[DEBUG] ✓ ENTERING ULTRAPLINIAN MODE'`,
);
replaceRequired(
  "          const result = await ultraplinian(messages, content, handleLeaderChange);",
  "          const result = await ultraplinian(messages, content, handleLeaderChange, executionSelection);",
);
replaceRequired(
  `      if (state.plinyMode) {

        // ═══════════════════════════════════════════════════════════════════
        // GODMODE FAST`,
  `      if (executionMode === 'pliny') {

        // ═══════════════════════════════════════════════════════════════════
        // GODMODE FAST`,
);
replaceRequired(
  "      if (getCurrentMode() === 'parseltongue') {",
  "      if (executionMode === 'parseltongue') {",
  1,
);
replaceRequired(
  "    async function classifyHarm(query) {",
  "    async function classifyHarm(query, modeTarget = null) {",
);
replaceRequired(
  "      const cacheKey = query.slice(0, 120).toLowerCase().trim();",
  `      const targetKey = modeTarget ? modelTargetKey(modeTarget) : 'auto';
      const cacheKey = \`\${targetKey}:\${query.slice(0, 120).toLowerCase().trim()}\`;`,
);
replaceRequired(
  "          }, { title: 'G0DM0D3-Classifier', signal: controller.signal });",
  "          }, { title: 'Crow-GodMod3-Classifier', signal: controller.signal, modeTarget });",
);
replaceRequired(
  "    async function processImageWithVision(imageData, userPrompt) {",
  "    async function processImageWithVision(imageData, userPrompt, modeTarget = null) {",
);
replaceRequired(
  "        }, { title: 'GODMOD3.AI-vision' });",
  "        }, { title: 'Crow-GodMod3-vision', modeTarget });",
);
replaceRequired(
  `    function hasAuxiliaryModelProvider() {
      return !!state.apiKey || hasLocalProvider();
    }`,
  `    function hasAuxiliaryModelProvider(modeTarget = null) {
      if (modeTarget) {
        try {
          resolveChatTarget(modeTarget.model, modeTarget.provider);
          return true;
        } catch (_) {
          return false;
        }
      }
      if (state.localOnly) return hasLocalProvider();
      return !!(state.apiKey || state.veniceApiKey || hasLocalProvider());
    }`,
);
replaceRequired(
  "    async function generateSmartPrefill(query, classification) {",
  "    async function generateSmartPrefill(query, classification, modeTarget = null) {",
);
replaceRequired(
  "          }, { title: 'GODMOD3.AI-prefill' });",
  "          }, { title: 'Crow-GodMod3-prefill', modeTarget });",
);
replaceRequired(
  "    async function classifyQueryWithLLM(query) {",
  "    async function classifyQueryWithLLM(query, modeTarget = null) {",
);
replaceRequired(
  "          }, { title: 'GODMOD3.AI-classifier' });",
  "          }, { title: 'Crow-GodMod3-classifier', modeTarget });",
);
replaceRequired(
  `    async function getQueryClassification(query) {
      // Simple cache key (first 100 chars)
      const cacheKey = query.slice(0, 100).toLowerCase().trim();`,
  `    async function getQueryClassification(query, modeTarget = null) {
      // Keep explicit provider/model classifications isolated from Automatic.
      const targetKey = modeTarget
        ? \`\${modeTarget.provider}:\${modeTarget.model}\`
        : 'auto';
      const cacheKey = \`\${targetKey}:\${query.slice(0, 100).toLowerCase().trim()}\`;`,
);
replaceRequired(
  "      const result = await classifyQueryWithLLM(query);",
  "      const result = await classifyQueryWithLLM(query, modeTarget);",
);
replaceRequired(
  "    async function ultraplinian(messages, userQuery, onLeaderChange) {",
  `    async function ultraplinian(messages, userQuery, onLeaderChange, executionSelection = null) {
      executionSelection = executionSelection || getModeExecutionSelection('ultraplinian');
      const executionTarget = getPinnedModeTarget(executionSelection);`,
);
replaceRequired(
  "    // Main ULTRAPLINIAN execution",
  `    const ULTRAPLINIAN_CLOUD_RACE_TIMEOUT_MS = 45_000;
    const ULTRAPLINIAN_LOCAL_RACE_TIMEOUT_MS = 300_000;

    function getUltraplinianRaceTimeoutMs(raceEntries) {
      const isLocalOnlyRace = raceEntries.length > 0
        && raceEntries.every(({ provider }) => provider === 'local');
      return isLocalOnlyRace
        ? ULTRAPLINIAN_LOCAL_RACE_TIMEOUT_MS
        : ULTRAPLINIAN_CLOUD_RACE_TIMEOUT_MS;
    }

    async function waitForUltraplinianRace(
      promises,
      controller,
      {
        modelCount,
        minResultsForGrace,
        gracePeriodMs,
        hardTimeoutMs,
        onLog = () => {},
      },
    ) {
      await new Promise((resolveRace) => {
        let successCount = 0;
        let settledCount = 0;
        let graceTimer = null;
        let resolved = false;

        const finish = (abortOutstanding) => {
          if (resolved) return;
          resolved = true;
          if (graceTimer) clearTimeout(graceTimer);
          if (hardTimer) clearTimeout(hardTimer);
          if (abortOutstanding) controller.abort();
          resolveRace();
        };

        const hardTimer = setTimeout(() => {
          onLog('[ULTRAPLINIAN] Hard timeout reached, finishing race');
          finish(true);
        }, hardTimeoutMs);

        promises.forEach(promise => promise.then(result => {
          if (resolved) return;
          settledCount++;
          if (result && result.success) successCount++;

          if (successCount >= minResultsForGrace && !graceTimer) {
            onLog(\`[ULTRAPLINIAN] \${successCount} successes, starting \${gracePeriodMs}ms grace period\`);
            graceTimer = setTimeout(() => finish(true), gracePeriodMs);
          }

          if (settledCount === modelCount) finish(false);
        }).catch(() => {
          if (resolved) return;
          settledCount++;
          if (settledCount === modelCount) finish(false);
        }));

        if (modelCount === 0) finish(false);
      });

      // A timeout/grace finish aborts outstanding fetches. Let every worker
      // publish its success/error result before the caller counts or judges.
      await Promise.allSettled(promises);
    }

    // Main ULTRAPLINIAN execution`,
);
replaceRegex(
  /      const MIN_RESULTS_FOR_GRACE = Math\.min\(5, Math\.max\(2, Math\.ceil\(models\.length \* 0\.5\)\)\);[\s\S]*?        if \(models\.length === 0\) finish\(\);\n      \}\);/,
  `      const MIN_RESULTS_FOR_GRACE = Math.min(5, Math.max(2, Math.ceil(models.length * 0.5)));
      const GRACE_PERIOD_MS = 5000;
      // Local inference can legitimately take longer than a cloud race,
      // especially on CPU. Keep the stop button responsive through the same
      // AbortController, but do not discard a healthy local completion at 45s.
      const HARD_TIMEOUT_MS = getUltraplinianRaceTimeoutMs(raceEntries);
      _log(\`[ULTRAPLINIAN] Hard timeout: \${Math.round(HARD_TIMEOUT_MS / 1000)}s\`);

      await waitForUltraplinianRace(promises, controller, {
        modelCount: models.length,
        minResultsForGrace: MIN_RESULTS_FOR_GRACE,
        gracePeriodMs: GRACE_PERIOD_MS,
        hardTimeoutMs: HARD_TIMEOUT_MS,
        onLog: _log,
      });`,
  1,
);
replaceRequired(
  "getQueryClassification(userQuery)",
  "getQueryClassification(userQuery, executionTarget)",
  2,
);
replaceRequired(
  "generateSmartPrefill(userQuery, null)",
  "generateSmartPrefill(userQuery, null, executionTarget)",
);
replaceRequired(
  "    async function llmJudgeResponses(query, responses, classification) {",
  "    async function llmJudgeResponses(query, responses, classification, modeTarget = null) {",
);
replaceRequired(
  "            }, { title: 'GODMOD3.AI-tastemaker', signal: controller.signal });",
  "            }, { title: 'Crow-GodMod3-tastemaker', signal: controller.signal, modeTarget });",
);
replaceRequired(
  "winner = await llmJudgeResponses(userQuery, allResults, classification);",
  "winner = await llmJudgeResponses(userQuery, allResults, classification, executionTarget);",
);
replaceRequired(
  "    async function llmRefusalCheck(userQuery, responseContent) {",
  "    async function llmRefusalCheck(userQuery, responseContent, modeTarget = null) {",
);
replaceRequired(
  "          }, { title: 'GODMOD3.AI-refusal-detector' });",
  "          }, { title: 'Crow-GodMod3-refusal-detector', modeTarget });",
);
replaceRequired(
  "llmRefusalCheck(userQuery, winner.content)",
  "llmRefusalCheck(userQuery, winner.content, executionTarget)",
);
replaceRequired(
  "llmRefusalCheck(userQuery, r.content)",
  "llmRefusalCheck(userQuery, r.content, executionTarget)",
);
replaceRequired(
  "    async function plinyImprovementLoop(winnerModel, winnerContent, userQuery, messages) {",
  "    async function plinyImprovementLoop(winnerModel, winnerContent, userQuery, messages, winnerProvider = null, modeTarget = null) {",
);
replaceRequired(
  "        for (const coachModel of PLINY_COACH_MODELS) {",
  "        for (const coachModel of (modeTarget ? [modeTarget.model] : PLINY_COACH_MODELS)) {",
  1,
);
replaceRequired(
  "              }, { title: 'GODMOD3.AI-pliny-coach' });",
  "              }, { title: 'Crow-GodMod3-pliny-coach', modeTarget });",
);
replaceRequired(
  `          }, { provider: inferProviderForModel(winnerModel), title: 'GODMOD3.AI-pliny-improve' });`,
  `          }, {
            title: 'Crow-GodMod3-pliny-improve',
            modeTarget: modeTarget || (
              winnerProvider
                ? { provider: winnerProvider, model: winnerModel }
                : null
            ),
          });`,
);
replaceRequired(
  "plinyImprovementLoop(earlyWinner.model, earlyWinner.content, userQuery, messages)",
  "plinyImprovementLoop(earlyWinner.model, earlyWinner.content, userQuery, messages, earlyWinner.provider, executionTarget)",
);
replaceRequired(
  "plinyImprovementLoop(winner.model, winner.content, userQuery, messages)",
  "plinyImprovementLoop(winner.model, winner.content, userQuery, messages, winner.provider, executionTarget)",
);
replaceRequired(
  "            const abortResult = { model, content: '', success: false, error: 'aborted-early-stop', duration: 0 };",
  "            const abortResult = { model, provider: entryProvider, content: '', success: false, error: 'aborted-early-stop', duration: 0 };",
);
replaceRequired(
  "          const errorResult = { model, content: '', success: false, error: err.message, duration: 0 };",
  "          const errorResult = { model, provider: entryProvider, content: '', success: false, error: err.message, duration: 0 };",
);
replaceRequired(
  "          if (controller.signal.aborted) return { model, content: '', success: false, error: 'aborted-early-stop', duration: 0 };",
  "          if (controller.signal.aborted) return { model, provider: entryProvider, content: '', success: false, error: 'aborted-early-stop', duration: 0 };",
);
replaceRequired(
  `      let currentLeaderScore = 0;
      let currentLeaderModel = null;`,
  `      let currentLeaderScore = 0;
      let currentLeaderModel = null;
      let currentLeaderProvider = null;`,
);
replaceRequired(
  "            const continuityBonus = (state.lastUltraWinner && model === state.lastUltraWinner && messages.filter(m => m.role === 'assistant').length > 0) ? 5 : 0;",
  "            const continuityBonus = (sameModelTarget(priorWinnerTarget, { provider: entryProvider, model }) && messages.filter(m => m.role === 'assistant').length > 0) ? 5 : 0;",
);
replaceRequired(
  "              currentLeaderModel = model;",
  `              currentLeaderModel = model;
              currentLeaderProvider = entryProvider;`,
);
replaceRequired(
  "        state.lastUltraWinner = earlyWinner.model;",
  `        state.lastUltraWinner = earlyWinner.model;
        state.lastUltraWinnerTarget = Object.freeze({
          provider: earlyWinner.provider,
          model: earlyWinner.model,
        });`,
);
replaceRequired(
  "        state.lastUltraWinner = winner.model;",
  `        state.lastUltraWinner = winner.model;
        state.lastUltraWinnerTarget = Object.freeze({
          provider: winner.provider,
          model: winner.model,
        });`,
);
replaceRequired(
  "          state.lastUltraWinner = currentLeaderModel;",
  `          state.lastUltraWinner = currentLeaderModel;
          state.lastUltraWinnerTarget = Object.freeze({
            provider: currentLeaderProvider,
            model: currentLeaderModel,
          });`,
);
replaceRequired(
  "r.model === earlyWinner.model",
  "sameModelTarget(r, earlyWinner)",
);
replaceRequired(
  "r.model === winner.model",
  "sameModelTarget(r, winner)",
);
replaceRequired(
  "r.model === currentLeaderModel",
  "r.provider === currentLeaderProvider && r.model === currentLeaderModel",
  2,
);
replaceRequired(
  `          .map(r => ({
            model: r.model,
            content: polishResponse(r.content),`,
  `          .map(r => ({
            model: r.model,
            provider: r.provider,
            content: polishResponse(r.content),`,
);
replaceRequired(
  `            .map(r => ({
              model: r.model,
              content: polishResponse(r.content),`,
  `            .map(r => ({
              model: r.model,
              provider: r.provider,
              content: polishResponse(r.content),`,
);
replaceRequired(
  `            winnerModel: earlyWinner.model,
            winnerScore: displayScore.overall,`,
  `            winnerModel: earlyWinner.model,
            winnerProvider: earlyWinner.provider,
            winnerScore: displayScore.overall,`,
);
replaceRequired(
  `            winnerModel: winner.model,
            winnerScore: displayScore.overall,`,
  `            winnerModel: winner.model,
            winnerProvider: winner.provider,
            winnerScore: displayScore.overall,`,
);
replaceRequired(
  `              winnerModel: currentLeaderModel,
              winnerScore: displayScore.overall,`,
  `              winnerModel: currentLeaderModel,
              winnerProvider: leaderResult.provider,
              winnerScore: displayScore.overall,`,
);
replaceRequired(
  "    async function llmAccuracyCheck(userQuery, responseContent, forceCheck = false) {",
  "    async function llmAccuracyCheck(userQuery, responseContent, forceCheck = false, modeTarget = null) {",
);
replaceRequired(
  "          }, { title: 'GODMOD3.AI-accuracy-check' });",
  "          }, { title: 'Crow-GodMod3-accuracy-check', modeTarget });",
);
replaceRequired(
  "    async function liquidResponseLoop(messageIdx, originalContent, userQuery, winnerModel) {",
  "    async function liquidResponseLoop(messageIdx, originalContent, userQuery, winnerModel, modeTarget = null) {",
);
replaceRequired(
  "hasAuxiliaryModelProvider()",
  "hasAuxiliaryModelProvider(modeTarget)",
  8,
);
replaceRequired(
  "llmAccuracyCheck(userQuery, originalContent, true)",
  "llmAccuracyCheck(userQuery, originalContent, true, modeTarget)",
);
replaceRequired(
  "                }, { title: 'GODMOD3.AI-liquid-refiner' });",
  "                }, { title: 'Crow-GodMod3-liquid-refiner', modeTarget });",
);
replaceRequired(
  "liquidResponseLoop(messageIdx, result.content, content, winnerModel);",
  `liquidResponseLoop(
                messageIdx,
                result.content,
                content,
                winnerModel,
                executionTarget || (
                  result.magic?.winnerProvider || result.magic?.provider
                    ? {
                        provider: result.magic?.winnerProvider || result.magic?.provider,
                        model: winnerModel,
                      }
                    : null
                ),
              );`,
);
replaceRequired(
  "liquidResponseLoop(msgIdx, conv.messages[msgIdx].content, content, winnerModel);",
  `liquidResponseLoop(
                msgIdx,
                conv.messages[msgIdx].content,
                content,
                winnerModel,
                executionTarget || (
                  conv.messages[msgIdx].magic?.provider
                    ? { provider: conv.messages[msgIdx].magic.provider, model: winnerModel }
                    : null
                ),
              );`,
);
replaceRequired(
  "liquidResponseLoop(msgIdx, conv.messages[msgIdx].content, content, conv.model);",
  "liquidResponseLoop(msgIdx, conv.messages[msgIdx].content, content, conv.model, executionTarget);",
);
replaceRequired(
  `executePlinyMode(messages, conv.model, content, {
              enabled: true,`,
  `executePlinyMode(messages, conv.model, content, {
              enabled: true,
              modeSelection: executionSelection,
              modeTarget: executionTarget,`,
);
replaceRequired(
  "executePlinyMode(messages, conv.model, content);",
  "executePlinyMode(messages, conv.model, content, { modeSelection: executionSelection, modeTarget: executionTarget });",
);
replaceRequired(
  "executeParseltongue(messages, conv.model, content);",
  "executeParseltongue(messages, conv.model, content, executionSelection);",
);

replaceRegex(
  /        \} else \{\n          \/\/ Direct single-model mode \(OpenRouter key required\)\n[\s\S]*?\n        \}\n      \} finally \{/,
  `        } else if (state.plinyMode) {
          // Regeneration keeps CLASSIC prompt behavior and its saved model.
          try {
            abortController = new AbortController();
            const result = await executePlinyMode(messages, conv.model, userQuery);
            conv.messages = conv.messages.slice(0, userMsgIdx + 1);
            conv.messages.push({
              role: 'assistant',
              content: result?.content || '**Error:** Crow-GodMod3 CLASSIC regeneration failed.',
              strategy: result?.strategy,
              score: result?.score,
              magic: result?.magic,
            });
            saveState();
          } catch (err) {
            conv.messages = conv.messages.slice(0, userMsgIdx + 1);
            conv.messages.push({
              role: 'assistant',
              content: err.name === 'AbortError' ? '_[Response stopped]_' : \`**Error:** \${err.message}\`,
            });
            saveState();
          }
        } else {
          // PARSELTONGUE regeneration re-runs the transformation race on its
          // own provider-qualified model instead of falling through to cloud.
          try {
            abortController = new AbortController();
            const result = await executeParseltongue(messages, conv.model, userQuery);
            conv.messages = conv.messages.slice(0, userMsgIdx + 1);
            conv.messages.push({
              role: 'assistant',
              content: result?.content || '**Error:** PARSELTONGUE regeneration failed.',
              score: result?.score,
              magic: result?.magic,
            });
            saveState();
          } catch (err) {
            conv.messages = conv.messages.slice(0, userMsgIdx + 1);
            conv.messages.push({
              role: 'assistant',
              content: err.name === 'AbortError' ? '_[Response stopped]_' : \`**Error:** \${err.message}\`,
            });
            saveState();
          }
        }
      } finally {`,
  1,
);
replaceRequired(
  `      const userQuery = historyMessages[historyMessages.length - 1]?.content || '';

      try {
        if (state.ultraplinian) {`,
  `      const userQuery = historyMessages[historyMessages.length - 1]?.content || '';
      const executionMode = getCurrentMode();
      const executionSelection = getModeExecutionSelection(executionMode);
      const executionTarget = getPinnedModeTarget(executionSelection);

      try {
        if (executionMode === 'ultraplinian') {`,
);
replaceRequired(
  "const result = await ultraplinian(messages, userQuery, null);",
  "const result = await ultraplinian(messages, userQuery, null, executionSelection);",
);
replaceRequired(
  "        } else if (state.plinyMode) {\n          // Regeneration keeps CLASSIC",
  "        } else if (executionMode === 'pliny') {\n          // Regeneration keeps CLASSIC",
);
replaceRequired(
  "const result = await executePlinyMode(messages, conv.model, userQuery);",
  "const result = await executePlinyMode(messages, conv.model, userQuery, { modeSelection: executionSelection, modeTarget: executionTarget });",
);
replaceRequired(
  "const result = await executeParseltongue(messages, conv.model, userQuery);",
  "const result = await executeParseltongue(messages, conv.model, userQuery, executionSelection);",
);

replaceRequired(
  `          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': \`Bearer \${state.apiKey}\`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://godmod3.ai',
              'X-Title': 'GODMOD3.AI'
            },
            body: JSON.stringify(normalizeOpenRouterRequestBody({
              model: conv.model,
              messages: retryMessages,
              temperature: params.temperature,
              top_p: params.top_p,
              frequency_penalty: state.modelFreqPenalty ?? 0,
              presence_penalty: params.presence_penalty || state.modelPresPenalty || 0,
              max_tokens: state.modelMaxTokens ?? 4096
            })),
            signal: abortController.signal
          });`,
  `          const fallbackRequest = resolveModeModelRequest('parseltongue', conv.model, executionSelection);
          const response = await fetchChatCompletion({
            model: fallbackRequest.model,
            messages: retryMessages,
            temperature: params.temperature,
            top_p: params.top_p,
            frequency_penalty: state.modelFreqPenalty ?? 0,
            presence_penalty: params.presence_penalty || state.modelPresPenalty || 0,
            max_tokens: state.modelMaxTokens ?? 4096
          }, {
            provider: fallbackRequest.provider,
            title: 'Crow-GodMod3-retry',
            signal: abortController.signal,
          });`,
);
replaceRequired(
  `      for (const conv of state.conversations) {
        if (!Array.isArray(conv.messages)) { conv.messages = []; continue; }`,
  `      for (const conv of state.conversations) {
        conv.model = normalizePersistedChatModel(conv.model || state.model);
        if (!Array.isArray(conv.messages)) { conv.messages = []; continue; }`,
);

replaceRequired(
  `      document.getElementById('localEnabled').checked = !!state.localEnabled;
      document.getElementById('localOnly').checked = !!state.localOnly;
      document.getElementById('localBaseUrlInput').value = state.localBaseUrl || 'http://localhost:11434/v1';
      document.getElementById('localModelsInput').value = state.localModels || '';
      document.getElementById('localApiKeyInput').value = state.localApiKey || '';`,
  `      document.getElementById('localEnabled').checked = !!state.localEnabled;
      document.getElementById('localOnly').checked = !!state.localOnly;
      state.localRuntime = normalizeLocalRuntime(state.localRuntime, state.localBaseUrl);
      document.getElementById('localRuntimeInput').value = state.localRuntime;
      document.getElementById('localBaseUrlInput').value = state.localBaseUrl || 'http://localhost:11434/v1';
      document.getElementById('localModelsInput').value = state.localModels || '';
      document.getElementById('localApiKeyInput').value = state.localApiKey || '';
      document.getElementById('localConnectionStatus').textContent = '';
      updateLocalRuntimeHelp(state.localRuntime);
      refreshModeModelSelect();`,
);

replaceRequired(
  `      state.localEnabled = document.getElementById('localEnabled').checked;
      state.localOnly = document.getElementById('localOnly').checked;
      state.localBaseUrl = (document.getElementById('localBaseUrlInput').value || '').trim() || 'http://localhost:11434/v1';
      state.localModels = (document.getElementById('localModelsInput').value || '').trim();`,
  `      state.localEnabled = document.getElementById('localEnabled').checked;
      state.localOnly = document.getElementById('localOnly').checked;
      state.localBaseUrl = (document.getElementById('localBaseUrlInput').value || '').trim() || 'http://localhost:11434/v1';
      state.localRuntime = normalizeLocalRuntime(
        document.getElementById('localRuntimeInput').value,
        state.localBaseUrl,
      );
      document.getElementById('localRuntimeInput').value = state.localRuntime;
      state.localModels = (document.getElementById('localModelsInput').value || '').trim();
      state.modeModelSelections = normalizeModeModelSelections(
        state.modeModelSelections,
        state.model,
        parseLocalModelIds(state.localModels),
      );`,
);
replaceRequired(
  "      state.model = document.getElementById('defaultModelInput').value;",
  `      const defaultModelValue = document.getElementById('defaultModelInput').value;
      if (OPENROUTER_FREE_CHAT_MODEL_SET.has(defaultModelValue)) {
        state.model = defaultModelValue;
      }`,
);

replaceRequired(
  `      // Show/hide model selectors based on mode
      const libertasSelector = document.getElementById('libertasModelSelect');
      if (currentMode === 'ultraplinian') {
        selector.style.display = 'none';
        if (libertasSelector) libertasSelector.style.display = 'none';
      } else if (currentMode === 'pliny') {
        selector.style.display = 'none';
        if (libertasSelector) libertasSelector.style.display = 'block';
      } else {
        selector.style.display = 'block';
        if (libertasSelector) libertasSelector.style.display = 'none';
      }`,
  `      // The provider/model picker is available in every mode. CLASSIC keeps
      // its separate prompt-strategy picker alongside it.
      const libertasSelector = document.getElementById('libertasModelSelect');
      selector.style.display = 'block';
      if (libertasSelector) libertasSelector.style.display = currentMode === 'pliny' ? 'block' : 'none';
      refreshModeModelSelect();`,
);

replaceRequired(
  "      document.getElementById('modelSelect').value = state.model;",
  "      refreshModeModelSelect();",
  1,
);

replaceRequired(
  `    function saveState() {
      state.model = document.getElementById('modelSelect').value;

      // Also update current conversation's model/persona if mid-conversation
      const conv = getCurrentConv();
      if (conv) {
        conv.model = state.model;
        conv.persona = state.persona;
      }`,
  `    function saveState() {
      // Model picker changes are applied by setCurrentModeModelSelection().
      // Never copy its provider-encoded option value into legacy state.model.
      const conv = getCurrentConv();
      if (conv) {
        conv.persona = state.persona;
      }`,
);
replaceRequired(
  `      state.model = document.getElementById('modelSelect').value;
      const conv = getCurrentConv();
      if (conv) {
        conv.model = state.model;
        conv.persona = state.persona;
      }`,
  `      const conv = getCurrentConv();
      if (conv) {
        conv.persona = state.persona;
      }`,
  1,
);
replaceRequired(
  `      if (conv) {
        document.getElementById('modelSelect').value = conv.model;
        document.getElementById('personaSelect').value = conv.persona;
        state.model = conv.model;
        state.persona = conv.persona;
      }`,
  `      if (conv) {
        document.getElementById('personaSelect').value = conv.persona;
        state.model = conv.model;
        state.persona = conv.persona;
        refreshModeModelSelect();
      }`,
);
replaceRequired(
  `        } else if (mode === 'PLINY' || mode === 'G0DM0D3 CLASSIC') {
          state.ultraplinian = false;
          state.plinyMode = true;
        }`,
  `        } else if (mode === 'PLINY' || mode.includes('CLASSIC')) {
          state.ultraplinian = false;
          state.plinyMode = true;
        } else if (mode.includes('PARSELTONGUE')) {
          state.ultraplinian = false;
          state.plinyMode = false;
        }`,
);
replaceRequired(
  `      saveState();
      render();

      // Put the message back in the input field and send`,
  `      updateModeSwitcherUI();
      saveState();
      render();

      // Put the message back in the input field and send`,
);

replaceRequired(
  `        _version: 2,
        _exportedAt: new Date().toISOString(),`,
  `        _version: 4,
        _exportedAt: new Date().toISOString(),`,
);
replaceRequired(
  `        modelFreqPenalty: state.modelFreqPenalty,
        modelPresPenalty: state.modelPresPenalty,
      };`,
  `        modelFreqPenalty: state.modelFreqPenalty,
        modelPresPenalty: state.modelPresPenalty,
        localEnabled: state.localEnabled,
        localOnly: state.localOnly,
        localRuntime: state.localRuntime,
        localBaseUrl: state.localBaseUrl,
        localModels: state.localModels,
        modeModelSelections: state.modeModelSelections,
      };`,
);
replaceRequired(
  `        'modelTemperature', 'modelTopP', 'modelMaxTokens', 'modelFreqPenalty', 'modelPresPenalty',
        'sidebarOpen', 'backendUrl'];`,
  `        'modelTemperature', 'modelTopP', 'modelMaxTokens', 'modelFreqPenalty', 'modelPresPenalty',
        'localEnabled', 'localOnly', 'localRuntime', 'localBaseUrl', 'localModels', 'modeModelSelections',
        'sidebarOpen', 'backendUrl'];`,
);
replaceRequired(
  `      for (const key of allowed) {
        if (imported[key] !== undefined) candidate[key] = imported[key];
      }

      // Sanitize conversations: validate structure, strip dangerous values`,
  `      for (const key of allowed) {
        if (imported[key] !== undefined) candidate[key] = imported[key];
      }
      candidate.localEnabled = candidate.localEnabled === true;
      candidate.localOnly = candidate.localOnly === true;
      if (candidate.localOnly) candidate.localEnabled = true;
      candidate.localBaseUrl = typeof candidate.localBaseUrl === 'string'
        ? candidate.localBaseUrl.slice(0, 300)
        : 'http://localhost:11434/v1';
      candidate.localRuntime = imported.localRuntime === undefined
        ? inferLocalRuntimeFromBaseUrl(candidate.localBaseUrl)
        : normalizeLocalRuntime(candidate.localRuntime, candidate.localBaseUrl);
      candidate.localModels = typeof candidate.localModels === 'string'
        ? candidate.localModels.slice(0, 1000)
        : '';
      candidate.modeModelSelections = normalizeModeModelSelections(
        candidate.modeModelSelections,
        candidate.model,
        parseLocalModelIds(candidate.localModels),
        candidate.localOnly,
      );

      // Sanitize conversations: validate structure, strip dangerous values`,
);

replaceRequired(
  "<!DOCTYPE html>",
  `<!DOCTYPE html>
<!--
  Crow-GodMod3 is a modified derivative of __UPSTREAM_NAME__.
  Upstream: https://github.com/elder-plinius/__UPSTREAM_NAME__
  Snapshot: f6301765fb90eb7b336bdf365319cd2fe44b1187
  License: GNU AGPL-3.0 — /LICENSE.txt
  Attribution and source information: /ATTRIBUTION.md
-->`,
);

replaceRequired(
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
  `<meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#03040a">
  <meta name="description" content="Crow-GodMod3 — open-source, privacy-respecting multi-model AI with the CrowClaw visual identity.">
  <meta name="application-name" content="Crow-GodMod3">
  <meta name="apple-mobile-web-app-title" content="Crow-GodMod3">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Crow-GodMod3">
  <meta property="og:title" content="Crow-GodMod3">
  <meta property="og:description" content="Open-source, privacy-respecting multi-model AI with the CrowClaw visual identity.">
  <meta property="og:url" content="https://crow-godmod3.vercel.app/">
  <meta property="og:image" content="https://crow-godmod3.vercel.app/crow-theme/assets/product-variants/exports/crow-godmod3-1200x630.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Crow-GodMod3">
  <meta name="twitter:description" content="Open-source, privacy-respecting multi-model AI with the CrowClaw visual identity.">
  <meta name="twitter:image" content="https://crow-godmod3.vercel.app/crow-theme/assets/product-variants/exports/crow-godmod3-1200x630.png">
  <link rel="canonical" href="https://crow-godmod3.vercel.app/">
  <link rel="manifest" href="/manifest.webmanifest">`,
);

replaceRequired("<title>G0DM0DƎ</title>", "<title>Crow-GodMod3</title>");
replaceRequired(
  '<link rel="icon" type="image/svg+xml" href="public/favicon.svg">',
  `<link rel="icon" href="/crow-theme/assets/icons/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" href="/crow-theme/assets/icons/png/crow-signal-32.png" sizes="32x32">
  <link rel="apple-touch-icon" href="/crow-theme/assets/icons/png/crow-signal-180.png">`,
);
replaceRequired(
  `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">`,
  `  <link href="/crow-theme/fonts/bitfeather/crow-bitfeather.css" rel="stylesheet">
  <link href="/crow-theme/tokens/crow-theme.css" rel="stylesheet">`,
);
replaceRequired(
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;",
  "style-src 'self' 'unsafe-inline'; font-src 'self';",
);
replaceRequired(
  "http://127.0.0.1:* https://127.0.0.1:* http://[::1]:* https://[::1]:*",
  "http://127.0.0.1:* https://127.0.0.1:*",
);

replaceRequired(
  `    :root {
      --bg: #0d0208;
      --bg-secondary: #0a0a0a;
      --primary: #00ff41;
      --secondary: #008f11;
      --accent: #003b00;
      --text: #e0e0e0;
      --text-dim: #666;
      --border: #1a3a1a;
      --hover: #0d1f0d;
      --danger: #ff3e3e;
    }`,
  `    :root {
      --bg: var(--crow-bg-canvas, #03040a);
      --bg-secondary: var(--crow-bg-deep, #060814);
      --primary: var(--crow-product-primary, #734cff);
      --secondary: var(--crow-product-signal, #45e7ff);
      --accent: var(--crow-bg-selected, #15254a);
      --text: var(--crow-text-strong, #f2f7ff);
      --text-dim: var(--crow-text-muted, #8fa2c5);
      --border: var(--crow-border-subtle, #263453);
      --hover: var(--crow-bg-hover, #18213a);
      --danger: var(--crow-state-danger, #ff637d);
      --cyan: var(--crow-cyan, #45e7ff);
      --success: var(--crow-state-success, #3fe0b3);
      --warning: var(--crow-state-warning, #95a8ff);
      --magenta: var(--crow-magenta-spark, #d649ff);
    }`,
);

replaceRequired(
  "<body>",
  '<body data-crow-theme data-crow-product="crow-godmod3">',
);

replaceRequired(
  `        <div class="logo">
          <span class="logo-text">G0DM0<span class="flipped-e">D</span><span class="flipped-e-soft">E</span></span>
        </div>`,
  `        <div class="logo">
          <img class="brand-mark" src="/crow-theme/assets/icons/app/crow-signal-app-rounded-256.png" alt="" aria-hidden="true">
          <span class="logo-text">Crow-GodMod3</span>
        </div>`,
);
replaceRequired(
  `          <div class="welcome-icon">🜏</div>
          <h2>G0DM0<span class="flipped-e">D</span><span class="flipped-e-soft">E</span></h2>
          <p>Open-source, privacy-respecting, liberated AI chat. {GODMODE:ENABLED}</p>`,
  `          <div class="welcome-signal">CROW SYSTEM // GLITCH ASCENDANT</div>
          <div class="welcome-icon">
            <img class="welcome-crow" src="/crow-theme/assets/icons/avatars/crow-signal-avatar-512.png" alt="Crow Signal">
          </div>
          <h2>Crow-GodMod3</h2>
          <p class="welcome-copy">Open-source, privacy-respecting multi-model AI with the CrowClaw visual identity. <span>{CROW-GODMOD3:ENABLED}</span></p>`,
);
replaceRequired(
  `        <button class="settings-btn" onclick="openSettings()">
          <span>⚙</span> Settings
        </button>`,
  `        <button class="settings-btn" onclick="openSettings()">
          <span>⚙</span> Settings
        </button>
        <div class="source-links">
          <a href="/ATTRIBUTION.md" target="_blank">Source</a>
          <span>·</span>
          <a href="/LICENSE.txt" target="_blank">AGPL-3.0</a>
        </div>`,
);

replaceRequired("GODMOD3.AI", "Crow-GodMod3", 1);
replaceRequired("G0DM0D3", "Crow-GodMod3", 1);
replaceRequired("__UPSTREAM_NAME__", "G0DM0D3", 2);
replaceRequired(
  "'https://godmod3.ai'",
  "window.location.origin",
  1,
);
replaceRequired(
  "'X-Requested-With': 'Crow-GodMod3'",
  "'X-Requested-With': 'Crow-GodMod3'",
  1,
);

replaceRequired(
  "Crow-GodMod3 Backend API",
  "G0DM0D3-compatible Backend API",
);
replaceRequired(
  "URL of your self-hosted Crow-GodMod3 API backend.",
  "URL of a compatible self-hosted G0DM0D3 API backend.",
);
replaceRequired(
  "backendUrl: '',  // Crow-GodMod3 API backend URL",
  "backendUrl: '',  // Compatible self-hosted G0DM0D3 API backend URL",
);

replaceRequired(
  `<li style="margin-bottom: 8px;">Your provider keys are stored in <strong>browser storage</strong> and sent to the provider or local endpoint you configure. They are not included in Crow-GodMod3 app telemetry.</li>
          <li style="margin-bottom: 8px;"><strong>Metadata collection:</strong> App telemetry is on by default and includes operational metadata such as a random page-session ID, models used, latencies, pipeline configuration, content lengths, and categorized errors. It does <strong>not intentionally include</strong> prompt text, response text, images, or API keys. The Cloudflare endpoint temporarily reads the request IP for rate limiting but does not add it to published JSONL. Disable app telemetry at any time with No-Log or Local-only mode.</li>
          <li style="margin-bottom: 8px;"><strong>Public research data:</strong> When the telemetry publisher is configured, metadata batches are published to a public Hugging Face dataset. The separate full-content dataset exists only in the optional API server and activates only when an API caller sends <code>contribute_to_dataset: true</code>; this page does not send that flag. See <a href="TERMS.md" target="_blank" style="color: var(--primary); text-decoration: underline;">Terms of Service</a> for full details.</li>`,
  `<li style="margin-bottom: 8px;">Your provider keys are stored in <strong>browser storage</strong> and sent only to the provider or local endpoint you configure.</li>
          <li style="margin-bottom: 8px;"><strong>Application telemetry is disabled</strong> in this Crow-GodMod3 build. Selected model providers and the site host may have their own logging and privacy practices.</li>
          <li style="margin-bottom: 8px;">This is an independent AGPL-3.0 derivative. See the <a href="/ATTRIBUTION.md" target="_blank" style="color: var(--primary); text-decoration: underline;">source and attribution</a> and <a href="/TERMS.md" target="_blank" style="color: var(--primary); text-decoration: underline;">research-preview terms</a>.</li>`,
);
replaceRequired(
  `          This is an experimental research preview. Models are accessed through the provider or local endpoint you configure.
          Crow-GodMod3 app telemetry excludes conversation text; selected providers and hosting infrastructure have their own policies. See our <a href="TERMS.md" target="_blank" style="color: var(--primary);">Terms</a> for details.`,
  `          This is an experimental research preview. Models are accessed through the provider or local endpoint you configure.
          Crow-GodMod3 does not publish application telemetry; selected providers and hosting infrastructure have their own policies. See the <a href="/TERMS.md" target="_blank" style="color: var(--primary);">terms</a> for details.`,
);

replaceRequired(
  `<input type="checkbox" id="noLogMode">
                <label for="noLogMode" style="margin: 0;">Disable App Telemetry (No-Log)</label>`,
  `<input type="checkbox" id="noLogMode" checked disabled>
                <label for="noLogMode" style="margin: 0;">Application Telemetry Disabled</label>`,
);
replaceRequired(
  `On by default. Sends structural metadata, not prompt or response text, to the public research pipeline when configured. The optional classification step sends the prompt to your OpenRouter or local provider. Turn off anytime; provider and hosting logs are separate.`,
  `Locked off in this Crow-GodMod3 build. Optional model-classification steps still use the OpenRouter or local provider you configure; provider and hosting logs are separate.`,
);
replaceRequired("noLogMode: false,", "noLogMode: true,");
replaceRequired(
  "    const _telemetry = {",
  `    // This independent derivative has no telemetry publisher.
    const APP_TELEMETRY_ENABLED = false;

    const _telemetry = {`,
);
replaceRequired(
  "      if (state.noLogMode || state.localOnly) return;",
  "      if (!APP_TELEMETRY_ENABLED || state.noLogMode || state.localOnly) return;",
  1,
);
replaceRequired(
  "      if (state.noLogMode || state.localOnly) { _telemetry.buffer.length = 0; return; }",
  "      if (!APP_TELEMETRY_ENABLED || state.noLogMode || state.localOnly) { _telemetry.buffer.length = 0; return; }",
);
replaceRequired(
  "      if (!state.noLogMode && !state.localOnly && _telemetry.buffer.length > 0) {",
  "      if (APP_TELEMETRY_ENABLED && !state.noLogMode && !state.localOnly && _telemetry.buffer.length > 0) {",
);

replaceRequired(
  `              Crow-GodMod3 stores conversations, memories, settings, and keys locally in this browser.
              Model requests go only to the providers you configure; local-only mode keeps inference on your hardware and disables telemetry.`,
  `              Crow-GodMod3 stores conversations, memories, settings, and keys locally in this browser.
              Model requests go only to the providers you configure; application telemetry is disabled in this build.`,
);

replaceRequired(
  "a.download = `g0dm0d3-conversations-${new Date().toISOString().split('T')[0]}.json`;",
  "a.download = `crow-godmod3-conversations-${new Date().toISOString().split('T')[0]}.json`;",
);
replaceRequired("_source: 'g0dm0d3',", "_source: 'crow-godmod3',");
replaceRequired(
  "a.download = `g0dm0d3-backup-${new Date().toISOString().split('T')[0]}.json`;",
  "a.download = `crow-godmod3-backup-${new Date().toISOString().split('T')[0]}.json`;",
);
replaceRequired(
  "a.download = `g0dm0d3-logs-${new Date().toISOString().split('T')[0]}.json`;",
  "a.download = `crow-godmod3-logs-${new Date().toISOString().split('T')[0]}.json`;",
);

const hexMap = new Map([
  ["#0d0208", "#050711"],
  ["#0a0a0a", "#080b18"],
  ["#00ff41", "#7c5cff"],
  ["#008f11", "#1fb6ff"],
  ["#003b00", "#171b3a"],
  ["#e0e0e0", "#eef7ff"],
  ["#1a3a1a", "#29345f"],
  ["#0d1f0d", "#11162f"],
  ["#ffd700", "#7c5cff"],
  ["#ffaa00", "#a5b4fc"],
  ["#ffa500", "#4f46e5"],
  ["#ffcc00", "#39d9ff"],
  ["#ffb733", "#60a5fa"],
  ["#ff9900", "#818cf8"],
  ["#ff7b00", "#4f46e5"],
  ["#ff6600", "#4f46e5"],
  ["#fbbf24", "#93c5fd"],
  ["#f97316", "#6366f1"],
  ["#f59e0b", "#818cf8"],
  ["#00ff88", "#32d6c6"],
  ["#4a7c43", "#39d9ff"],
  ["#4ade80", "#32d6c6"],
  ["#2d5a27", "#1d3e5a"],
  ["#6fdb5f", "#32d6c6"],
  ["#10b981", "#32d6c6"],
  ["#0d2818", "#11162d"],
  ["#0a1f12", "#090d1a"],
  ["#00ff00", "#32d6c6"],
  ["#00ff64", "#32d6c6"],
  ["#ec4899", "#6366f1"],
  ["#ff0055", "#4f46e5"],
  ["#a855f7", "#6366f1"],
  ["#c084fc", "#a5b4fc"],
  ["#ff00ff", "#d946ef"],
]);

for (const [from, to] of hexMap) {
  html = html.replace(new RegExp(from, "gi"), to);
}

const rgbMap = [
  [[255, 215, 0], [124, 92, 255]],
  [[255, 170, 0], [165, 180, 252]],
  [[255, 165, 0], [79, 70, 229]],
  [[255, 204, 0], [57, 217, 255]],
  [[255, 100, 0], [79, 70, 229]],
  [[255, 102, 0], [79, 70, 229]],
  [[255, 123, 0], [79, 70, 229]],
  [[255, 153, 0], [129, 140, 248]],
  [[251, 191, 36], [147, 197, 253]],
  [[249, 115, 22], [99, 102, 241]],
  [[245, 158, 11], [129, 140, 248]],
  [[0, 255, 65], [124, 92, 255]],
  [[0, 143, 17], [31, 182, 255]],
  [[0, 255, 136], [50, 214, 198]],
  [[0, 255, 100], [50, 214, 198]],
  [[74, 124, 67], [57, 217, 255]],
  [[45, 90, 39], [29, 62, 90]],
  [[111, 219, 95], [50, 214, 198]],
  [[236, 72, 153], [99, 102, 241]],
  [[255, 0, 85], [79, 70, 229]],
  [[255, 0, 100], [79, 70, 229]],
  [[255, 0, 128], [124, 92, 255]],
  [[168, 85, 247], [99, 102, 241]],
  [[192, 132, 252], [165, 180, 252]],
];

for (const [[red, green, blue], [newRed, newGreen, newBlue]] of rgbMap) {
  const pattern = new RegExp(
    `rgba\\(\\s*${red}\\s*,\\s*${green}\\s*,\\s*${blue}\\s*,\\s*([^\\)]+)\\)`,
    "gi",
  );
  html = html.replace(
    pattern,
    `rgba(${newRed}, ${newGreen}, ${newBlue}, $1)`,
  );
}

const glyphMap = new Map([
  ["❤️‍🔥", "✦"],
  ["⛓️‍💥", "⌁"],
  ["⚠️", "!"],
  ["🌡️", "◫"],
  ["⚖️", "⟷"],
  ["🌋", "◈"],
  ["🔥", "✦"],
  ["💥", "✦"],
  ["⚠", "!"],
  ["✨", "✦"],
  ["🔱", "Ψ"],
  ["⏳", "…"],
  ["📋", "▧"],
  ["⚖", "⟷"],
  ["🌡", "◫"],
  ["📏", "↔"],
  ["📚", "≡"],
  ["📝", "≡"],
  ["🎓", "◇"],
  ["💛", "◇"],
  ["🏆", "◆"],
  ["👑", "✦"],
  ["⚡", "⌁"],
  ["🎨", "◇"],
]);
for (const [from, to] of glyphMap) {
  html = html.split(from).join(to);
}

replaceRequired(
  "            // Holding — show transformed result in gold",
  "            // Holding — show transformed result in ultraviolet",
);

replaceRegex(
  /      \/\/ Console easter egg\n      console\.log\([\s\S]*?\n      \);\n(?=    \}\)\(\);)/,
  `      // Console easter egg
      console.log(
        '%c\\n' +
        '  CROW-GODMOD3\\n' +
        '  ◈ CrowClaw interface online\\n\\n' +
        'Cognition without control.\\n\\n' +
        'Try: ↑↑↓↓←→←→BA (Konami Code)\\n' +
        'Type: "there is no spoon" | "follow the white rabbit" | "hack the planet" | "{GODMODE:ENABLED}"\\n\\n' +
        'Modified AGPL-3.0 derivative · /ATTRIBUTION.md\\n',
        'color:#7c5cff;font-family:monospace;'
      );`,
  1,
);

const crowThemeStyles = `

    /* Crow Theme v0.1 — Crow-GodMod3 product binding */
    ::selection {
      color: var(--crow-text-strong);
      background: var(--crow-selection-bg);
    }

    body {
      --primary: var(--crow-product-primary, #734cff);
      --secondary: var(--crow-product-signal, #45e7ff);
      background:
        radial-gradient(circle at 78% 16%, rgb(115 76 255 / 8%), transparent 30%),
        radial-gradient(circle at 28% 84%, rgb(69 231 255 / 6%), transparent 28%),
        var(--bg);
      color: var(--crow-text-default);
      font-family: var(--crow-font-body);
    }

    button,
    input,
    select,
    textarea,
    .mode-option,
    .conversation-item,
    .suggestion {
      font-family: var(--crow-font-mono);
    }

    :focus-visible {
      outline: 2px solid var(--crow-border-focus);
      outline-offset: 2px;
      box-shadow: var(--crow-focus-ring);
    }

    .sidebar {
      background:
        linear-gradient(180deg, rgb(10 14 27 / 98%), rgb(3 4 10 / 99%)),
        url("/crow-theme/assets/backgrounds/void-grid-neutral.png") 56% center / cover;
      border-color: var(--crow-border-subtle);
    }

    .chat-header {
      background: rgb(6 8 20 / 90%);
      backdrop-filter: blur(16px);
      z-index: 50;
      overflow: visible;
    }

    .brand-mark {
      width: 38px;
      height: 38px;
      flex: 0 0 38px;
      border-radius: 11px;
      box-shadow:
        0 0 18px rgb(115 76 255 / 28%),
        0 0 32px rgb(69 231 255 / 15%);
    }

    .logo-text {
      font-family: var(--crow-font-display);
      font-size: 17px;
      font-weight: 700;
      letter-spacing: var(--crow-tracking-display);
      white-space: nowrap;
      background: linear-gradient(
        90deg,
        var(--crow-text-strong) 0%,
        var(--crow-violet) 54%,
        var(--crow-cyan) 100%
      );
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      text-shadow: none;
    }

    .messages {
      padding: 14px;
      scrollbar-color: var(--crow-line-quiet) transparent;
    }

    .messages::-webkit-scrollbar-thumb {
      background: var(--crow-line-quiet);
    }

    .messages::-webkit-scrollbar-thumb:hover {
      background: var(--crow-line-strong);
    }

    .welcome {
      position: relative;
      isolation: isolate;
      min-height: 100%;
      align-items: flex-start;
      justify-content: center;
      overflow: hidden;
      padding: clamp(32px, 6vw, 84px);
      text-align: left;
      border: 1px solid rgb(70 92 145 / 42%);
      border-radius: var(--crow-radius-lg);
      background:
        linear-gradient(90deg, rgb(3 4 10 / 96%) 0%, rgb(3 4 10 / 82%) 36%, rgb(3 4 10 / 14%) 69%),
        linear-gradient(0deg, rgb(3 4 10 / 52%), transparent 45%),
        url("/crow-theme/assets/product-variants/exports/crow-godmod3-1920x1080.png") center / cover no-repeat;
      box-shadow:
        inset 0 0 90px rgb(47 123 255 / 8%),
        var(--crow-shadow-raised);
    }

    .welcome::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      background:
        linear-gradient(90deg, transparent 0 68%, rgb(69 231 255 / 8%) 68% 68.1%, transparent 68.1%),
        repeating-linear-gradient(0deg, transparent 0 27px, rgb(115 76 255 / 4%) 28px);
      mix-blend-mode: screen;
    }

    .welcome > * {
      position: relative;
      z-index: 1;
      width: min(610px, 56%);
    }

    .welcome-signal {
      margin-bottom: 14px;
      color: var(--crow-cyan);
      font-family: var(--crow-font-mono);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: var(--crow-tracking-signal);
      text-transform: uppercase;
    }

    .welcome-icon {
      width: auto;
      margin-bottom: 18px;
      line-height: 0;
    }

    .welcome-crow {
      width: 76px;
      height: 76px;
      object-fit: cover;
      border: 1px solid rgb(115 76 255 / 42%);
      border-radius: 20px;
      box-shadow:
        0 0 0 5px rgb(47 123 255 / 10%),
        0 0 34px rgb(115 76 255 / 22%),
        0 0 58px rgb(69 231 255 / 12%);
    }

    .welcome h2 {
      width: min(720px, 64%);
      margin-bottom: 14px;
      font-family: var(--crow-font-display);
      font-size: clamp(34px, 4.8vw, 66px);
      font-weight: 700;
      line-height: 0.94;
      letter-spacing: var(--crow-tracking-display);
      background: linear-gradient(
        90deg,
        var(--crow-text-strong) 0%,
        var(--crow-violet) 58%,
        var(--crow-cyan) 100%
      );
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      text-shadow: none;
    }

    .welcome p.welcome-copy {
      max-width: 570px;
      margin-bottom: 18px;
      color: var(--crow-text-default);
      font-size: clamp(14px, 1.45vw, 18px);
      line-height: 1.6;
    }

    .welcome-copy span {
      display: block;
      margin-top: 8px;
      color: var(--crow-cyan);
      font-family: var(--crow-font-mono);
      font-size: 11px;
      letter-spacing: var(--crow-tracking-signal);
    }

    .welcome .suggestions {
      width: min(620px, 60%);
      max-width: 620px;
      gap: 10px;
    }

    .welcome .suggestion {
      min-height: 54px;
      display: flex;
      align-items: center;
      padding: 13px 15px;
      color: var(--crow-text-default);
      background: rgb(10 14 27 / 84%);
      border-color: rgb(70 92 145 / 46%);
      backdrop-filter: blur(14px);
    }

    .source-links {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      margin-top: 10px;
      color: var(--text-dim);
      font-size: 9px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .source-links a {
      color: var(--text-dim);
      text-decoration: none;
    }

    .source-links a:hover {
      color: var(--cyan);
    }

    .new-chat-btn:hover,
    .settings-btn:hover,
    .suggestion:hover {
      border-color: var(--crow-product-primary);
      box-shadow: var(--crow-shadow-ultraviolet);
    }

    @media (pointer: fine) {
      body,
      .modal-overlay {
        cursor: url("/crow-theme/cursors/v0.5/src/32/normal.png") 6 2, default;
      }

      a,
      button,
      select,
      summary,
      label[for],
      [onclick],
      [role="button"],
      .suggestion,
      .conv-item,
      .conv-title,
      input[type="button"],
      input[type="submit"],
      input[type="reset"],
      input[type="checkbox"],
      input[type="radio"],
      input[type="range"],
      input[type="file"] {
        cursor: url("/crow-theme/cursors/v0.5/src/32/link.png") 6 2, pointer !important;
      }

      input:not([type]),
      input[type="text"],
      input[type="search"],
      input[type="email"],
      input[type="password"],
      input[type="url"],
      input[type="number"],
      textarea,
      [contenteditable="true"] {
        cursor: url("/crow-theme/cursors/v0.5/src/32/text.png") 16 16, text !important;
      }

      [draggable="true"],
      .pong-panel-header {
        cursor: url("/crow-theme/cursors/v0.5/src/32/move.png") 16 16, move !important;
      }

      :disabled,
      [aria-disabled="true"] {
        cursor: url("/crow-theme/cursors/v0.5/src/32/unavailable.png") 16 16, not-allowed !important;
      }
    }

    @media (max-width: 860px) {
      .welcome {
        align-items: center;
        padding: 34px 24px;
        text-align: center;
        background:
          linear-gradient(0deg, rgb(3 4 10 / 98%) 0%, rgb(3 4 10 / 78%) 58%, rgb(3 4 10 / 32%) 100%),
          url("/crow-theme/assets/product-variants/crow-godmod3-hero.png") 72% center / cover no-repeat;
      }

      .welcome > *,
      .welcome h2,
      .welcome .suggestions {
        width: min(100%, 620px);
      }

    }

    @media (max-width: 540px) {
      .messages {
        padding: 8px;
      }

      .welcome {
        min-height: 100%;
        padding: 28px 16px;
        border-radius: var(--crow-radius-md);
      }

      .welcome-crow {
        width: 62px;
        height: 62px;
        border-radius: 16px;
      }

      .welcome h2 {
        font-size: clamp(31px, 10vw, 44px);
      }

      .welcome .suggestions {
        grid-template-columns: 1fr;
      }
    }
`;

replaceRequired("</style>", `${crowThemeStyles}\n  </style>`);
replaceRequired(".split('/')[1]", ".split('/').pop()", 20);

function getHueAndSaturation(red, green, blue) {
  const [r, g, b] = [red, green, blue].map((value) => value / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const saturation = max === 0 ? 0 : delta / max;

  if (delta === 0) return { hue: 0, saturation };

  let hue;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;

  return { hue: (hue * 60 + 360) % 360, saturation };
}

function collectVisualColours(source) {
  const colours = [];
  const hexPattern =
    /#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})\b/gi;
  const rgbPattern =
    /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,[^\)]*)?\)/gi;

  for (const match of source.matchAll(hexPattern)) {
    const value = match[1];
    const channels =
      value.length <= 4
        ? [...value.slice(0, 3)].map((digit) =>
            Number.parseInt(`${digit}${digit}`, 16),
          )
        : [0, 2, 4].map((offset) =>
            Number.parseInt(value.slice(offset, offset + 2), 16),
          );
    colours.push({ token: match[0], channels });
  }

  for (const match of source.matchAll(rgbPattern)) {
    colours.push({
      token: match[0],
      channels: match.slice(1, 4).map(Number),
    });
  }

  return colours;
}

const warmMatches = collectVisualColours(html)
  .filter(({ channels }) => {
    const { hue, saturation } = getHueAndSaturation(...channels);
    return saturation >= 0.45 && hue >= 15 && hue <= 75;
  })
  .map(({ token }) => token);

if (warmMatches.length) {
  throw new Error(
    `Warm colour audit failed: ${[...new Set(warmMatches)].join(", ")}`,
  );
}

const dominantPinkColours =
  /#(?:e84bff|ec4899|ff0055)\b|rgba\(\s*(?:232\s*,\s*75\s*,\s*255|236\s*,\s*72\s*,\s*153|255\s*,\s*0\s*,\s*(?:85|100|128))\s*,/gi;
const pinkMatches = html.match(dominantPinkColours);
if (pinkMatches?.length) {
  throw new Error(
    `Dominant pink audit failed: ${[...new Set(pinkMatches)].join(", ")}`,
  );
}

const restrainedMagentaMatches =
  html.match(/#(?:d649ff|d946ef)\b|rgba\(\s*(?:214\s*,\s*73\s*,\s*255|217\s*,\s*70\s*,\s*239)\s*,/gi) ?? [];
if (restrainedMagentaMatches.length > 3) {
  throw new Error(
    `Magenta restraint audit failed: found ${restrainedMagentaMatches.length} visual tokens.`,
  );
}

for (const required of [
  "<title>Crow-GodMod3</title>",
  'data-crow-product="crow-godmod3"',
  'src="/crow-theme/assets/icons/app/crow-signal-app-rounded-256.png"',
  'url("/crow-theme/assets/product-variants/exports/crow-godmod3-1920x1080.png")',
  'href="/crow-theme/fonts/bitfeather/crow-bitfeather.css"',
  'url("/crow-theme/cursors/v0.5/src/32/normal.png") 6 2',
  "const APP_TELEMETRY_ENABLED = false;",
  'href="/ATTRIBUTION.md"',
  "--bg: var(--crow-bg-canvas, #03040a);",
  "--primary: var(--crow-product-primary, #734cff);",
  "--secondary: var(--crow-product-signal, #45e7ff);",
  "--cyan: var(--crow-cyan, #45e7ff);",
]) {
  if (!html.includes(required)) {
    throw new Error(`Generated app is missing required marker: ${required}`);
  }
}

if (html.length < 500_000) {
  throw new Error(`Generated app is unexpectedly small: ${html.length} bytes.`);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, html, "utf8");
console.log(`Generated ${outputPath} (${html.length.toLocaleString()} bytes).`);
