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
    // Browser storage is finite, but Crow-GodMod3 does not impose a model-count
    // ceiling. This one-megabyte text guard prevents malformed backup imports
    // from exhausting the page while still accommodating thousands of IDs.
    const MAX_LOCAL_MODEL_STORAGE_CHARS = 1048576;

    function getLocalModelDescriptorId(descriptor) {
      if (typeof descriptor === 'string') return descriptor.trim();
      if (!descriptor || typeof descriptor !== 'object') return '';
      const candidate = descriptor.id ?? descriptor.key ?? descriptor.model ?? '';
      return typeof candidate === 'string' ? candidate.trim() : '';
    }

    function getLocalModelCapabilityTokens(descriptor) {
      if (!descriptor || typeof descriptor !== 'object') return [];
      const tokens = [];
      const addToken = value => {
        if (typeof value === 'string' && value.trim()) {
          tokens.push(value.trim().toLowerCase());
        }
      };
      addToken(descriptor.type);
      addToken(descriptor.task);
      addToken(descriptor.pipeline_tag);
      addToken(descriptor.pipelineTag);
      if (Array.isArray(descriptor.capabilities)) {
        descriptor.capabilities.forEach(addToken);
      } else if (descriptor.capabilities && typeof descriptor.capabilities === 'object') {
        for (const [capability, enabled] of Object.entries(descriptor.capabilities)) {
          if (enabled === true || (enabled && typeof enabled === 'object')) addToken(capability);
        }
      }
      return [...new Set(tokens)];
    }

    function isExplicitlyNonChatModelDescriptor(descriptor) {
      const id = getLocalModelDescriptorId(descriptor);
      const tokens = getLocalModelCapabilityTokens(descriptor);
      const chatEvidence = new Set([
        'llm', 'vlm', 'chat', 'completion', 'completions',
        'text-generation', 'text_generation', 'generate',
      ]);
      if (tokens.some(token => chatEvidence.has(token))) return false;

      const nonChatEvidence = new Set([
        'embedding', 'embeddings', 'embed', 'rerank', 'reranking',
        'ranking', 'ranker', 'cross-encoder', 'cross_encoder',
        'text-to-image', 'image-generation', 'speech-to-text',
        'text-to-speech', 'transcription',
      ]);
      if (tokens.some(token => nonChatEvidence.has(token))) return true;

      // OpenAI-compatible /models responses often contain only a bare ID.
      // Filter only unmistakable specialist names; manually entered IDs remain
      // untouched so unusual chat models can still be selected.
      return /(?:^|[\\/_.:-])(?:text[-_]?embedding|embedding|embed|rerank|re[-_]?rank|cross[-_]?encoder)(?:$|[\\/_.:-])/i.test(id);
    }

    function extractLocalModelDescriptors(payload) {
      if (Array.isArray(payload?.models)) {
        return payload.models.map(item => {
          if (!item || typeof item !== 'object' || item.id || !item.key) return item;
          return { ...item, id: item.key };
        });
      }
      return Array.isArray(payload?.data) ? payload.data : [];
    }

    function localModelAllowsReasoningOff(descriptor) {
      const options = descriptor?.capabilities?.reasoning?.allowed_options;
      return Array.isArray(options) && options.some(option =>
        option === 'off' || option === 'none'
      );
    }

    function filterLocalChatModelDescriptors(descriptors) {
      const models = [];
      const reasoningOffModels = [];
      const seen = new Set();
      let skipped = 0;
      for (const descriptor of Array.isArray(descriptors) ? descriptors : []) {
        const id = getLocalModelDescriptorId(descriptor);
        if (!id) continue;
        if (isExplicitlyNonChatModelDescriptor(descriptor)) {
          skipped += 1;
          continue;
        }
        if (!seen.has(id)) {
          seen.add(id);
          models.push(id);
          if (localModelAllowsReasoningOff(descriptor)) {
            reasoningOffModels.push(id);
          }
        }
      }
      return { models, reasoningOffModels, skipped };
    }

    function getLocalNativeModelsUrl(baseUrl, apiVersion) {
      const url = new URL(baseUrl);
      url.pathname = \`/api/\${apiVersion}/models\`;
      url.search = '';
      url.hash = '';
      return url.toString();
    }

    async function discoverLocalChatModels(runtime, baseUrl, headers, fetchImpl = fetch) {
      if (runtime === 'lmstudio') {
        for (const apiVersion of ['v1', 'v0']) {
          try {
            const nativeResponse = await fetchImpl(
              getLocalNativeModelsUrl(baseUrl, apiVersion),
              { headers },
            );
            if (!nativeResponse.ok) continue;
            const nativePayload = await nativeResponse.json();
            const descriptors = extractLocalModelDescriptors(nativePayload);
            if (!descriptors.length) continue;
            const result = filterLocalChatModelDescriptors(descriptors);
            if (result.models.length) {
              return { ...result, source: \`lmstudio-\${apiVersion}\` };
            }
          } catch (_) {
            // Older LM Studio releases and restrictive CORS configurations
            // can omit the native endpoint. The OpenAI endpoint remains valid.
          }
        }
      }

      const response = await fetchImpl(\`\${baseUrl}/models\`, { headers });
      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
      const payload = await response.json();
      const descriptors = extractLocalModelDescriptors(payload);
      if (!descriptors.length) throw new Error('Server returned no model IDs');
      return {
        ...filterLocalChatModelDescriptors(descriptors),
        source: 'openai-models',
      };
    }

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
      if (help) {
        help.textContent = \`\${preset.help.replaceAll('{origin}', origin)} This runtime keeps its own model inventory and three mode pools; only the selected runtime runs.\`;
      }
      if (keyInput) keyInput.placeholder = preset.apiKeyPlaceholder;
      const originHint = document.getElementById('localOriginHint');
      if (originHint) originHint.textContent = origin;
    }

    function applyLocalRuntimePreset(runtime) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : 'custom';
      const preset = LOCAL_RUNTIME_PRESETS[runtimeId];
      const status = document.getElementById('localConnectionStatus');
      const previousRuntime = normalizeLocalRuntime(state.localRuntime, state.localBaseUrl);
      if (previousRuntime !== runtimeId) {
        captureActiveLocalRuntimeProfileFromForm(previousRuntime);
        applyLocalRuntimeProfileToState(runtimeId);
        renderActiveLocalRuntimeProfile();
        saveState();
      }
      const modelCount = getLocalModels().length;
      if (status) {
        status.textContent = modelCount
          ? \`\${preset.label} profile restored — \${modelCount} saved model ID\${modelCount === 1 ? '' : 's'}.\`
          : runtimeId === 'custom'
            ? 'Custom profile selected — enter its base URL, then test.'
            : \`\${preset.label} profile selected — test to discover model IDs.\`;
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
    // "auto" preserves the mode's native cloud behavior and adds that mode's
    // independently selected local-model pool. Every pool defaults to one
    // local model but has no fixed model-count ceiling.
    const MODE_MODEL_PROVIDERS = new Set(['auto', 'openrouter', 'venice', 'local']);
    const MODE_MODEL_IDS = new Set(['ultraplinian', 'parseltongue', 'pliny']);
    const MODE_MODEL_SELECTION_SCHEMA_VERSION = 2;
    const MODE_LOCAL_POOL_LABELS = Object.freeze({
      ultraplinian: 'ULTRAPLINIAN',
      parseltongue: 'PARSELTONGUE',
      pliny: 'Crow-GodMod3 CLASSIC',
    });

    function parseLocalModelIds(raw) {
      return [...new Set(String(raw || '')
        .split(',')
        .map(model => model.trim())
        .filter(Boolean))];
    }

    function normalizeLocalModeModelPools(
      pools,
      localModels = getLocalModels(),
      legacyUltraplinian = state.localRaceModels,
    ) {
      const source = pools && typeof pools === 'object' && !Array.isArray(pools)
        ? pools
        : {};
      const normalized = {};
      for (const mode of MODE_MODEL_IDS) {
        const raw = typeof source[mode] === 'string'
          ? source[mode]
          : mode === 'ultraplinian' && typeof legacyUltraplinian === 'string'
            ? legacyUltraplinian
            : '';
        normalized[mode] = normalizeLocalRaceModelSelection(raw, localModels);
      }
      return normalized;
    }

    function getLocalAutomaticRaceModels(mode = 'ultraplinian', runtime = state.localRuntime) {
      const safeMode = MODE_MODEL_IDS.has(mode) ? mode : 'ultraplinian';
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : state.localRuntime;
      const localModels = getLocalModels(runtimeId);
      if (!localModels.length) return [];
      const available = new Set(localModels);
      const profilePools = runtimeId === state.localRuntime
        ? state.localModeModelPools
        : getLocalRuntimeProfile(runtimeId).modeModelPools;
      const pools = normalizeLocalModeModelPools(profilePools, localModels);
      const selected = parseLocalModelIds(pools[safeMode])
        .filter(model => available.has(model));
      // Safe public default: one model. Users can deliberately tick every
      // discovered model; no fixed ceiling is applied to that selection.
      return selected.length ? selected : localModels.slice(0, 1);
    }

    function normalizeLocalRaceModelSelection(raw, localModels = getLocalModels()) {
      const available = new Set(localModels);
      return parseLocalModelIds(raw)
        .filter(model => available.has(model))
        .join(', ');
    }

    const LOCAL_RUNTIME_PROFILE_SCHEMA_VERSION = 1;

    function defaultLocalRuntimeProfile(runtime) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : 'custom';
      return {
        baseUrl: LOCAL_RUNTIME_PRESETS[runtimeId].baseUrl || '',
        models: '',
        modeModelPools: normalizeLocalModeModelPools({}, [], ''),
        reasoningEffort: 'none',
        reasoningOffModels: '',
      };
    }

    function normalizeLocalRuntimeProfile(profile, runtime) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : 'custom';
      const fallback = defaultLocalRuntimeProfile(runtimeId);
      const source = profile && typeof profile === 'object' && !Array.isArray(profile)
        ? profile
        : {};
      const baseUrl = typeof source.baseUrl === 'string'
        ? source.baseUrl.slice(0, 300)
        : fallback.baseUrl;
      const models = typeof source.models === 'string'
        ? source.models.slice(0, MAX_LOCAL_MODEL_STORAGE_CHARS)
        : '';
      const localModels = parseLocalModelIds(models);
      const legacyRaceModels = typeof source.raceModels === 'string'
        ? source.raceModels.slice(0, MAX_LOCAL_MODEL_STORAGE_CHARS)
        : '';
      return {
        baseUrl: baseUrl || fallback.baseUrl,
        models,
        modeModelPools: normalizeLocalModeModelPools(
          source.modeModelPools,
          localModels,
          legacyRaceModels,
        ),
        reasoningEffort: source.reasoningEffort === 'auto' ? 'auto' : 'none',
        reasoningOffModels: runtimeId === 'lmstudio'
          ? normalizeLocalRaceModelSelection(source.reasoningOffModels, localModels)
          : '',
      };
    }

    function normalizeLocalRuntimeProfiles(
      profiles,
      activeRuntime = state.localRuntime,
      legacyProfile = null,
    ) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(activeRuntime) ? activeRuntime : 'custom';
      const source = profiles && typeof profiles === 'object' && !Array.isArray(profiles)
        ? profiles
        : {};
      const normalized = {};
      for (const id of LOCAL_RUNTIME_IDS) {
        normalized[id] = normalizeLocalRuntimeProfile(source[id], id);
      }
      if (
        legacyProfile
        && !Object.prototype.hasOwnProperty.call(source, runtimeId)
      ) {
        normalized[runtimeId] = normalizeLocalRuntimeProfile(legacyProfile, runtimeId);
      }
      return normalized;
    }

    function getLocalRuntimeProfile(runtime = state.localRuntime) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : 'custom';
      state.localRuntimeProfiles = normalizeLocalRuntimeProfiles(
        state.localRuntimeProfiles,
        state.localRuntime,
      );
      return state.localRuntimeProfiles[runtimeId];
    }

    function setLocalRuntimeProfile(runtime, profile) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : 'custom';
      state.localRuntimeProfiles = normalizeLocalRuntimeProfiles(
        state.localRuntimeProfiles,
        state.localRuntime,
      );
      state.localRuntimeProfiles[runtimeId] = normalizeLocalRuntimeProfile(profile, runtimeId);
      state.localRuntimeProfileVersion = LOCAL_RUNTIME_PROFILE_SCHEMA_VERSION;
      return state.localRuntimeProfiles[runtimeId];
    }

    function normalizeLocalApiKeyMap(keys) {
      const source = keys && typeof keys === 'object' && !Array.isArray(keys)
        ? keys
        : {};
      const normalized = {};
      for (const runtime of LOCAL_RUNTIME_IDS) {
        if (typeof source[runtime] === 'string' && source[runtime]) {
          normalized[runtime] = source[runtime].slice(0, 500);
        }
      }
      return normalized;
    }

    const _localTransportSnapshots = new WeakMap();

    function getLocalTransportSnapshot(context, runtime) {
      if (!context || typeof context !== 'object') return null;
      const snapshot = _localTransportSnapshots.get(context);
      return snapshot?.runtime === runtime ? snapshot : null;
    }

    function attachLocalTransportSnapshot(target, runtime, source = null) {
      if (!target || typeof target !== 'object') return target;
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : state.localRuntime;
      const inherited = getLocalTransportSnapshot(source, runtimeId);
      if (inherited) {
        _localTransportSnapshots.set(target, inherited);
        return target;
      }
      const profile = getLocalRuntimeProfile(runtimeId);
      _localTransportSnapshots.set(target, Object.freeze({
        runtime: runtimeId,
        baseUrl: profile.baseUrl,
        models: profile.models,
        reasoningEffort: profile.reasoningEffort,
        reasoningOffModels: profile.reasoningOffModels,
        enabled: state.localEnabled,
        apiKey: _localApiKeysByRuntime[runtimeId]
          || (runtimeId === state.localRuntime ? state.localApiKey : '')
          || '',
      }));
      return target;
    }

    function createModeTarget(provider, model, runtime = state.localRuntime, source = null) {
      const target = { provider, model };
      if (provider === 'local') {
        target.runtime = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : state.localRuntime;
        attachLocalTransportSnapshot(target, target.runtime, source);
      }
      return target;
    }

    function bumpLocalRuntimeProfileGeneration(runtime) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : 'custom';
      const next = Number(_localRuntimeProfileGenerations[runtimeId] || 0) + 1;
      _localRuntimeProfileGenerations[runtimeId] = next;
      return next;
    }

    function invalidateActiveLocalRuntimeDiscovery(invalidatePendingKeyLoad = false) {
      const runtimeInput = document.getElementById('localRuntimeInput');
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtimeInput?.value)
        ? runtimeInput.value
        : normalizeLocalRuntime(state.localRuntime, state.localBaseUrl);
      bumpLocalRuntimeProfileGeneration(runtimeId);
      if (invalidatePendingKeyLoad) _localApiKeyGeneration++;
      const status = document.getElementById('localConnectionStatus');
      if (status) {
        status.textContent = 'Settings changed — test again.';
        status.style.color = 'var(--text-dim)';
      }
    }

    function setLocalApiKeyForRuntime(runtime, rawKey, invalidatePendingLoad = true) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : 'custom';
      const key = String(rawKey || '').trim().slice(0, 500);
      const previous = _localApiKeysByRuntime[runtimeId] || '';
      if (invalidatePendingLoad && key !== previous) _localApiKeyGeneration++;
      if (key) _localApiKeysByRuntime[runtimeId] = key;
      else delete _localApiKeysByRuntime[runtimeId];
      return key;
    }

    function captureActiveLocalRuntimeProfile(userEdit = false) {
      const runtimeId = normalizeLocalRuntime(state.localRuntime, state.localBaseUrl);
      const profile = setLocalRuntimeProfile(runtimeId, {
        baseUrl: state.localBaseUrl,
        models: state.localModels,
        modeModelPools: state.localModeModelPools,
        reasoningEffort: state.localReasoningEffort,
        reasoningOffModels: state.localReasoningOffModels,
      });
      if (userEdit) bumpLocalRuntimeProfileGeneration(runtimeId);
      return profile;
    }

    function captureActiveLocalRuntimeProfileFromForm(runtime = state.localRuntime) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : 'custom';
      const baseUrlInput = document.getElementById('localBaseUrlInput');
      const modelsInput = document.getElementById('localModelsInput');
      const reasoningInput = document.getElementById('localReasoningEffortInput');
      const keyInput = document.getElementById('localApiKeyInput');
      const profile = setLocalRuntimeProfile(runtimeId, {
        baseUrl: (
          baseUrlInput
            ? baseUrlInput.value
            : state.localBaseUrl || LOCAL_RUNTIME_PRESETS[runtimeId].baseUrl || ''
        ).trim() || LOCAL_RUNTIME_PRESETS[runtimeId].baseUrl || '',
        models: (modelsInput ? modelsInput.value : state.localModels || '').trim(),
        modeModelPools: state.localModeModelPools,
        reasoningEffort: reasoningInput?.value === 'auto' ? 'auto' : 'none',
        reasoningOffModels: state.localReasoningOffModels,
      });
      const key = (keyInput ? keyInput.value : state.localApiKey || '').trim();
      setLocalApiKeyForRuntime(runtimeId, key);
      bumpLocalRuntimeProfileGeneration(runtimeId);
      return profile;
    }

    function applyLocalRuntimeProfileToState(runtime, includeKey = true) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : 'custom';
      const profile = getLocalRuntimeProfile(runtimeId);
      state.localRuntime = runtimeId;
      state.localBaseUrl = profile.baseUrl;
      state.localModels = profile.models;
      state.localModeModelPools = { ...profile.modeModelPools };
      state.localRaceModels = state.localModeModelPools.ultraplinian;
      state.localReasoningEffort = profile.reasoningEffort;
      state.localReasoningOffModels = profile.reasoningOffModels;
      if (includeKey) state.localApiKey = _localApiKeysByRuntime[runtimeId] || '';
      return profile;
    }

    function renderActiveLocalRuntimeProfile() {
      const profile = getLocalRuntimeProfile(state.localRuntime);
      const runtimeInput = document.getElementById('localRuntimeInput');
      const baseUrlInput = document.getElementById('localBaseUrlInput');
      const modelsInput = document.getElementById('localModelsInput');
      const reasoningInput = document.getElementById('localReasoningEffortInput');
      const keyInput = document.getElementById('localApiKeyInput');
      if (runtimeInput) runtimeInput.value = state.localRuntime;
      if (baseUrlInput) baseUrlInput.value = profile.baseUrl;
      if (modelsInput) modelsInput.value = profile.models;
      if (reasoningInput) reasoningInput.value = profile.reasoningEffort;
      if (keyInput) keyInput.value = state.localApiKey || '';
      updateLocalRuntimeHelp(state.localRuntime);
      refreshModeModelSelect();
      renderLocalRaceModelPicker();
      buildTierSelect();
    }

    function renderLocalRaceModelPicker() {
      const localModels = getLocalModels();
      for (const mode of MODE_MODEL_IDS) {
        const container = document.getElementById(\`localRaceModelPicker-\${mode}\`);
        const summary = document.getElementById(\`localRaceModelSummary-\${mode}\`);
        if (!container) continue;
        const selected = new Set(getLocalAutomaticRaceModels(mode));
        container.replaceChildren();

        if (!localModels.length) {
          const empty = document.createElement('span');
          empty.style.color = 'var(--text-dim)';
          empty.textContent = 'Connect a local runtime to choose models.';
          container.appendChild(empty);
        } else {
          for (const model of localModels) {
            const label = document.createElement('label');
            label.style.cssText = 'display:flex;align-items:flex-start;gap:8px;padding:7px 9px;border:1px solid var(--border);border-radius:6px;background:var(--bg);cursor:pointer;min-width:0;';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = model;
            checkbox.checked = selected.has(model);
            checkbox.dataset.localRaceModel = mode;
            checkbox.style.cssText = 'width:auto;margin-top:2px;accent-color:var(--accent);';
            checkbox.addEventListener('change', () => syncLocalRaceModelsFromPicker(mode));
            const name = document.createElement('span');
            name.style.cssText = 'min-width:0;overflow-wrap:anywhere;font:11px/1.4 monospace;color:var(--text);';
            name.textContent = model;
            label.append(checkbox, name);
            container.appendChild(label);
          }
        }
        if (summary) {
          summary.textContent = localModels.length
            ? \`\${selected.size} of \${localModels.length} selected\`
            : 'No local models discovered';
        }
      }
    }

    function syncLocalRaceModelsFromPicker(mode = 'ultraplinian') {
      const safeMode = MODE_MODEL_IDS.has(mode) ? mode : 'ultraplinian';
      const checkboxes = [
        ...document.querySelectorAll(
          \`#localRaceModelPicker-\${safeMode} input[data-local-race-model="\${safeMode}"]\`,
        ),
      ];
      if (!checkboxes.length) return;
      let selected = checkboxes.filter(input => input.checked).map(input => input.value);
      if (!selected.length) {
        checkboxes[0].checked = true;
        selected = [checkboxes[0].value];
      }
      state.localModeModelPools = normalizeLocalModeModelPools(state.localModeModelPools);
      state.localModeModelPools[safeMode] = selected.join(', ');
      state.localRaceModels = state.localModeModelPools.ultraplinian;
      captureActiveLocalRuntimeProfile(true);
      saveState();
      renderLocalRaceModelPicker();
      buildTierSelect();
    }

    function selectAllLocalRaceModels(mode = 'ultraplinian') {
      const safeMode = MODE_MODEL_IDS.has(mode) ? mode : 'ultraplinian';
      const localModels = getLocalModels();
      state.localModeModelPools = normalizeLocalModeModelPools(state.localModeModelPools);
      state.localModeModelPools[safeMode] = localModels.join(', ');
      state.localRaceModels = state.localModeModelPools.ultraplinian;
      captureActiveLocalRuntimeProfile(true);
      saveState();
      renderLocalRaceModelPicker();
      buildTierSelect();
    }

    function resetLocalRaceModels(mode = 'ultraplinian') {
      const safeMode = MODE_MODEL_IDS.has(mode) ? mode : 'ultraplinian';
      state.localModeModelPools = normalizeLocalModeModelPools(state.localModeModelPools);
      state.localModeModelPools[safeMode] = '';
      state.localRaceModels = state.localModeModelPools.ultraplinian;
      captureActiveLocalRuntimeProfile(true);
      saveState();
      renderLocalRaceModelPicker();
      buildTierSelect();
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
      return {
        ultraplinian: { provider: 'auto', model: '' },
        parseltongue: { provider: 'auto', model: '' },
        pliny: { provider: 'auto', model: '' },
      };
    }

    function migrateLegacyModeModelSelections(
      selections,
      fallbackModel = state.model,
      localModels = getLocalModels(),
      localOnly = state.localOnly,
      schemaVersion = state.modeModelSelectionVersion,
      hadPerModeLocalPools = false,
    ) {
      const normalized = normalizeModeModelSelections(
        selections,
        fallbackModel,
        localModels,
        localOnly,
      );
      if (
        Number(schemaVersion) >= MODE_MODEL_SELECTION_SCHEMA_VERSION
        || hadPerModeLocalPools
      ) {
        return normalized;
      }

      // The prior release silently generated an explicit PARSELTONGUE pin
      // from state.model. Reset only that exact legacy shape to Automatic;
      // genuinely different provider/model pins remain untouched.
      const legacySelection = selections?.parseltongue;
      if (legacySelection && typeof legacySelection === 'object') {
        const legacyModel = String(fallbackModel || OPENROUTER_DEFAULT_MODEL).slice(0, 200);
        const expectedProvider = inferPersistedModelProvider(
          legacyModel,
          localModels,
          localOnly,
        );
        const expectedModel = expectedProvider === 'openrouter'
          ? normalizeOpenRouterModel(legacyModel)
          : legacyModel;
        const selectedModel = legacySelection.provider === 'openrouter'
          ? (OPENROUTER_LEGACY_MODEL_MIGRATIONS[legacySelection.model] || legacySelection.model)
          : legacySelection.model;
        if (
          legacySelection.provider === expectedProvider
          && selectedModel === expectedModel
        ) {
          normalized.parseltongue = { provider: 'auto', model: '' };
        }
      }
      return normalized;
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
        const request = {
          provider: selection.provider,
          model: selection.model,
          runtime: selection.provider === 'local' ? state.localRuntime : undefined,
        };
        if (selection.provider === 'local') {
          attachLocalTransportSnapshot(request, request.runtime);
        }
        return request;
      }
      const request = {
        provider: 'auto',
        model: String(fallbackModel || state.model || OPENROUTER_DEFAULT_MODEL),
        runtime: state.localRuntime,
      };
      if (hasLocalProvider(request.runtime)) {
        attachLocalTransportSnapshot(request, request.runtime);
      }
      return request;
    }

    function getModeExecutionSelection(mode = getCurrentMode()) {
      const selection = getModeModelSelection(mode);
      const localModels = selection.provider === 'auto' && hasLocalProvider()
        ? Object.freeze([...getLocalAutomaticRaceModels(mode)])
        : Object.freeze([]);
      const executionSelection = {
        provider: selection.provider,
        model: selection.model,
        localModels,
        runtime: state.localRuntime,
      };
      if (selection.provider === 'local' || localModels.length) {
        attachLocalTransportSnapshot(executionSelection, executionSelection.runtime);
      }
      return Object.freeze(executionSelection);
    }

    function getModeAuxiliaryTarget(selection) {
      if (selection?.provider && selection.provider !== 'auto') {
        return Object.freeze(createModeTarget(
          selection.provider,
          selection.model,
          selection.runtime,
          selection,
        ));
      }
      const automaticLocalModel = Array.isArray(selection?.localModels)
        ? selection.localModels[0]
        : '';
      return automaticLocalModel
        ? Object.freeze(createModeTarget(
            'local',
            automaticLocalModel,
            selection.runtime,
            selection,
          ))
        : null;
    }

    function modelTargetKey(target) {
      return encodeURIComponent(JSON.stringify([
        target?.provider || '',
        target?.model || '',
        target?.provider === 'local' ? target?.runtime || '' : '',
      ]));
    }

    function sameModelTarget(left, right) {
      return !!left
        && !!right
        && left.provider === right.provider
        && left.model === right.model
        && (
          left.provider !== 'local'
          || (left.runtime || '') === (right.runtime || '')
        );
    }

    function resolveModeModelRequest(mode, fallbackModel = state.model, executionSelection) {
      const request = executionSelection === undefined
        ? getModeModelRequest(mode, fallbackModel)
        : executionSelection.provider === 'auto'
          ? {
              provider: 'auto',
              model: String(fallbackModel || state.model || OPENROUTER_DEFAULT_MODEL),
              runtime: executionSelection.runtime,
            }
          : {
              provider: executionSelection.provider,
              model: executionSelection.model,
              runtime: executionSelection.runtime,
            };
      const target = resolveChatTarget(
        request.model,
        request.provider,
        request.runtime,
        executionSelection || request,
      );
      return createModeTarget(
        target.provider,
        target.model,
        target.runtime,
        target,
      );
    }

    function getModeRaceTargets(mode, fallbackModel = state.model, executionSelection) {
      const selection = executionSelection === undefined
        ? getModeExecutionSelection(mode)
        : executionSelection;
      if (selection.provider !== 'auto') {
        const target = resolveChatTarget(
          selection.model,
          selection.provider,
          selection.runtime,
          selection,
        );
        return [createModeTarget(
          target.provider,
          target.model,
          target.runtime,
          target,
        )];
      }

      const targets = [];
      if (!state.localOnly && state.apiKey) {
        try {
          const nativeTarget = resolveChatTarget(fallbackModel, 'openrouter');
          targets.push({ provider: nativeTarget.provider, model: nativeTarget.model });
        } catch (_) {}
      } else if (
        !state.localOnly
        && state.veniceApiKey
        && typeof VENICE_MODELS !== 'undefined'
        && VENICE_MODELS.length
      ) {
        try {
          const veniceModel = VENICE_MODELS.includes(fallbackModel)
            ? fallbackModel
            : VENICE_MODELS[0];
          const nativeTarget = resolveChatTarget(veniceModel, 'venice');
          targets.push({ provider: nativeTarget.provider, model: nativeTarget.model });
        } catch (_) {}
      }
      const selectedLocalModels = Array.isArray(selection.localModels)
        ? selection.localModels
        : [];
      if (selectedLocalModels.length) {
        for (const model of selectedLocalModels) {
          targets.push(createModeTarget(
            'local',
            model,
            selection.runtime,
            selection,
          ));
        }
      }
      if (!targets.length) {
        const fallbackTarget = resolveChatTarget(
          fallbackModel,
          'auto',
          selection.runtime,
          selection,
        );
        targets.push(createModeTarget(
          fallbackTarget.provider,
          fallbackTarget.model,
          fallbackTarget.runtime,
          fallbackTarget,
        ));
      }

      const seen = new Set();
      return targets.filter(target => {
        const key = modelTargetKey(target);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
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
        ultraplinian: 'Automatic · tier models + this mode’s local pool',
        parseltongue: 'Automatic · each technique × this mode’s local pool',
        pliny: 'Automatic · each prompt × this mode’s local pool',
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
      state.modeModelSelectionVersion = MODE_MODEL_SELECTION_SCHEMA_VERSION;
      refreshModeModelSelect();
      buildTierSelect();
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
  '<div class="mode-option-desc">Race your selected models, or pin one model</div>',
);
replaceRequired(
  '<div class="mode-option-desc">33 text obfuscations race in parallel</div>',
  '<div class="mode-option-desc">Text transformations race across your selected models</div>',
);
replaceRequired(
  '<div class="mode-option-desc">Classic L1B3RT4S Prompts — 4 model+prompt combos race</div>',
  '<div class="mode-option-desc">Classic prompt strategies race across your selected models</div>',
);
replaceRequired(
  '4 proven model + prompt combos. Each races its own model. Toggle combos on/off.',
  '5 prompt strategies. Each runs across the CLASSIC model pool; toggle strategies on/off.',
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
                <input type="checkbox" id="localEnabled" style="width:auto;" onchange="invalidateActiveLocalRuntimeDiscovery()">
                <label for="localEnabled" style="margin:0;">Enable OpenAI-compatible local models</label>
              </div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                <input type="checkbox" id="localOnly" style="width:auto;">
                <label for="localOnly" style="margin:0;">Local-only mode</label>
              </div>
              <small style="color:#888;display:block;margin:-6px 0 12px;line-height:1.5;">
                Local-only mode never calls OpenRouter or Venice. After discovery, configure an independent unlimited local-model pool for each mode under Strategies. The header picker can still pin one exact model for one run mode.
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
              <input type="text" id="localBaseUrlInput" placeholder="http://localhost:11434/v1" spellcheck="false" oninput="invalidateActiveLocalRuntimeDiscovery()">
              <small style="color:#888;display:block;margin-top:4px;line-height:1.5;">
                Restricted to this computer: <code>localhost</code> or <code>127.0.0.1</code>. Docker Model Runner uses the nested <code>/engines/v1</code> path.
              </small>
            </div>
            <div class="form-group">
              <label for="localModelsInput">Model IDs</label>
              <textarea id="localModelsInput" rows="4" placeholder="qwen3:8b, llama3.2:3b" spellcheck="false" style="resize:vertical;" oninput="invalidateActiveLocalRuntimeDiscovery()"></textarea>
              <small style="color:#888;display:block;margin-top:4px;">Exact IDs reported by <code>/models</code>. There is no model-count limit. Each mode’s Automatic pool is configured independently under Strategies; a header pin still runs one exact model.</small>
            </div>
            <div class="form-group">
              <label for="localApiKeyInput">API Key (Optional)</label>
              <input type="password" id="localApiKeyInput" placeholder="Optional bearer token" oninput="invalidateActiveLocalRuntimeDiscovery(true)">
            </div>
            <div class="form-group">
              <label for="localReasoningEffortInput">LM Studio reasoning</label>
              <select id="localReasoningEffortInput" onchange="invalidateActiveLocalRuntimeDiscovery()">
                <option value="none">Final answers only (recommended)</option>
                <option value="auto">Use each model's default reasoning</option>
              </select>
              <small style="color:#888;display:block;margin-top:4px;line-height:1.5;">LM Studio only. Where the discovered model supports disabling reasoning, Final answers mode prevents it from spending the whole output budget on hidden thought without returning visible text.</small>
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
  `            <div class="form-group">
              <label>Models by Tier <small style="color: #888;">(click to select · auto-synced from model list)</small></label>`,
  `            <div class="form-group" id="localRaceModelSettings" style="padding:12px;border:1px solid rgba(69,231,255,0.22);border-radius:8px;background:rgba(69,231,255,0.05);">
              <label style="color:var(--cyan);">Local models per question, by mode</label>
              <small style="color:#999;display:block;margin:4px 0 10px;line-height:1.5;">Each mode defaults to one local model. Select any number, including every discovered model; there is no fixed count limit. These pools apply when that mode’s header picker is Automatic. A header pin runs one exact model instead.</small>
              <div style="display:grid;gap:10px;">
                <div style="padding:10px;border:1px solid var(--border);border-radius:7px;background:var(--bg);">
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
                    <div>
                      <strong style="font:11px/1.4 monospace;color:#ff6b6b;">ULTRAPLINIAN</strong>
                      <small style="color:#888;display:block;margin-top:3px;">Selected models join its configured cloud tier.</small>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                      <button type="button" class="api-key-btn" onclick="resetLocalRaceModels('ultraplinian')" style="font-size:10px;padding:5px 8px;">DEFAULT ONE</button>
                      <button type="button" class="api-key-btn" onclick="selectAllLocalRaceModels('ultraplinian')" style="font-size:10px;padding:5px 8px;">SELECT ALL</button>
                    </div>
                  </div>
                  <div id="localRaceModelSummary-ultraplinian" style="font:10px/1.4 monospace;color:var(--text-dim);margin-bottom:8px;">No local models discovered</div>
                  <div id="localRaceModelPicker-ultraplinian" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px;max-height:220px;overflow:auto;"></div>
                </div>
                <div style="padding:10px;border:1px solid var(--border);border-radius:7px;background:var(--bg);">
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
                    <div>
                      <strong style="font:11px/1.4 monospace;color:#39d9ff;">PARSELTONGUE</strong>
                      <small style="color:#888;display:block;margin-top:3px;">Every enabled text technique runs across the selected models.</small>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                      <button type="button" class="api-key-btn" onclick="resetLocalRaceModels('parseltongue')" style="font-size:10px;padding:5px 8px;">DEFAULT ONE</button>
                      <button type="button" class="api-key-btn" onclick="selectAllLocalRaceModels('parseltongue')" style="font-size:10px;padding:5px 8px;">SELECT ALL</button>
                    </div>
                  </div>
                  <div id="localRaceModelSummary-parseltongue" style="font:10px/1.4 monospace;color:var(--text-dim);margin-bottom:8px;">No local models discovered</div>
                  <div id="localRaceModelPicker-parseltongue" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px;max-height:220px;overflow:auto;"></div>
                </div>
                <div style="padding:10px;border:1px solid var(--border);border-radius:7px;background:var(--bg);">
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
                    <div>
                      <strong style="font:11px/1.4 monospace;color:#a855f7;">Crow-GodMod3 CLASSIC</strong>
                      <small style="color:#888;display:block;margin-top:3px;">Every enabled prompt strategy runs across the selected models.</small>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                      <button type="button" class="api-key-btn" onclick="resetLocalRaceModels('pliny')" style="font-size:10px;padding:5px 8px;">DEFAULT ONE</button>
                      <button type="button" class="api-key-btn" onclick="selectAllLocalRaceModels('pliny')" style="font-size:10px;padding:5px 8px;">SELECT ALL</button>
                    </div>
                  </div>
                  <div id="localRaceModelSummary-pliny" style="font:10px/1.4 monospace;color:var(--text-dim);margin-bottom:8px;">No local models discovered</div>
                  <div id="localRaceModelPicker-pliny" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px;max-height:220px;overflow:auto;"></div>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>OpenRouter Models by Tier <small style="color: #888;">(click to select · auto-synced from model list)</small></label>`,
);
replaceRequired(
  "                <small style=\"color: #888; display: block; margin-top: 4px;\">More models = slower but better. Fast tier prioritizes uncensored.</small>",
  "                <small style=\"color: #888; display: block; margin-top: 4px;\">Controls enabled cloud-provider tier sizes. ULTRAPLINIAN’s selected local pool is added when Automatic is used.</small>",
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
      localRaceModels: '',  // Legacy ULTRAPLINIAN pool; migrated into localModeModelPools
      localModeModelPools: null,  // Independent unlimited pools; each empty pool defaults to one
      localRuntimeProfiles: null,  // One independent inventory and three mode pools per runtime
      localRuntimeProfileVersion: 0,  // Legacy singleton fields migrate into the active profile
      localApiKey: '',  // Optional token for authenticated local servers
      localReasoningEffort: 'none',  // LM Studio: prefer visible final text by default
      localReasoningOffModels: '',  // Capability cache populated by LM Studio discovery
      modeModelSelections: null,  // Explicit provider + model, saved independently for each mode
      modeModelSelectionVersion: 0,  // Migrated to the current per-mode pool schema on load`,
);

replaceRequired(
  `    let _localApiKeyGeneration = 0;`,
  `    let _localApiKeyGeneration = 0;
    let _localApiKeysByRuntime = {};
    let _localRuntimeProfileGenerations = {};`,
);

replaceRequired(
  `    function getLocalModels() {
      return [...new Set(String(state.localModels || '')
        .split(',')
        .map(model => model.trim())
        .filter(Boolean))].slice(0, 8);
    }`,
  `    function getLocalModels(runtime = state.localRuntime) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : state.localRuntime;
      const rawModels = runtimeId === state.localRuntime
        ? state.localModels
        : getLocalRuntimeProfile(runtimeId).models;
      return parseLocalModelIds(rawModels);
    }`,
);

replaceRequired(
  `    function hasLocalProvider() {
      if (!state.localEnabled || getLocalModels().length === 0) return false;
      try { normalizeLocalBaseUrl(); return true; } catch (_) { return false; }
    }`,
  `    function hasLocalProvider(runtime = state.localRuntime) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(runtime) ? runtime : state.localRuntime;
      if (!state.localEnabled || getLocalModels(runtimeId).length === 0) return false;
      const baseUrl = runtimeId === state.localRuntime
        ? state.localBaseUrl
        : getLocalRuntimeProfile(runtimeId).baseUrl;
      try { normalizeLocalBaseUrl(baseUrl, runtimeId); return true; } catch (_) { return false; }
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
      let discoveryGeneration = null;
      if (status) { status.textContent = 'Checking /models…'; status.style.color = 'var(--text-dim)'; }
      try {
        baseUrl = normalizeLocalBaseUrl(
          document.getElementById('localBaseUrlInput').value,
          runtime,
        );
        const key = (document.getElementById('localApiKeyInput').value || '').trim();
        const headers = key ? { Authorization: \`Bearer \${key}\` } : {};
        const existingProfile = getLocalRuntimeProfile(runtime);
        const requestProfile = setLocalRuntimeProfile(runtime, {
          ...existingProfile,
          baseUrl,
          models: (document.getElementById('localModelsInput').value || existingProfile.models || '').trim(),
          modeModelPools: runtime === state.localRuntime
            ? state.localModeModelPools
            : existingProfile.modeModelPools,
          reasoningEffort: document.getElementById('localReasoningEffortInput').value === 'auto'
            ? 'auto'
            : 'none',
        });
        setLocalApiKeyForRuntime(runtime, key, false);
        _localApiKeyGeneration++;
        discoveryGeneration = bumpLocalRuntimeProfileGeneration(runtime);
        const discovery = await discoverLocalChatModels(runtime, baseUrl, headers);
        if (_localRuntimeProfileGenerations[runtime] !== discoveryGeneration) return;
        const models = discovery.models;
        if (!models.length) throw new Error('Server returned no model IDs');
        setLocalRuntimeProfile(runtime, {
          ...requestProfile,
          baseUrl,
          models: models.join(', '),
          reasoningOffModels: runtime === 'lmstudio'
            ? discovery.reasoningOffModels.join(', ')
            : '',
        });
        state.localEnabled = true;
        if (runtime === state.localRuntime) {
          applyLocalRuntimeProfileToState(runtime);
          document.getElementById('localEnabled').checked = true;
          renderActiveLocalRuntimeProfile();
        }
        saveState();
        const label = LOCAL_RUNTIME_PRESETS[runtime].label;
        if (status) {
          const capabilityLabel = discovery.source.startsWith('lmstudio-')
            ? 'chat-capable model'
            : 'candidate model';
          const skippedLabel = discovery.skipped
            ? \`; \${discovery.skipped} non-chat ID\${discovery.skipped === 1 ? '' : 's'} skipped\`
            : '';
          status.textContent = \`\${label}: \${models.length} \${capabilityLabel} ID\${models.length === 1 ? '' : 's'} saved\${skippedLabel}.\`;
          status.style.color = 'var(--success)';
        }
      } catch (err) {
        if (discoveryGeneration !== null
          && _localRuntimeProfileGenerations[runtime] !== discoveryGeneration) return;
        if (status) {
          status.textContent = \`Connection failed: \${describeLocalConnectionFailure(err, runtime, baseUrl)}\`;
          status.style.color = 'var(--danger)';
        }
      }
    }`,
);

replaceRequired(
  `      'localEnabled', 'localOnly', 'localBaseUrl', 'localModels', 'localApiKey',`,
  `      'localEnabled', 'localOnly', 'localRuntime', 'localBaseUrl', 'localModels', 'localRaceModels', 'localModeModelPools', 'localRuntimeProfiles', 'localRuntimeProfileVersion', 'localApiKey', 'localReasoningEffort', 'localReasoningOffModels',
      'modeModelSelections', 'modeModelSelectionVersion',`,
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
  "      const local = hasLocalProvider() ? getLocalModels().length : 0;",
  `      const ultraSelection = getModeModelSelection('ultraplinian');
      if (ultraSelection.provider !== 'auto') {
        return isModeModelSelectionAvailable(ultraSelection) ? 1 : 0;
      }
      const local = hasLocalProvider() ? getLocalAutomaticRaceModels('ultraplinian').length : 0;`,
);
replaceRequired(
  "      addThinkingLog(`{GODMODE:ENABLED} // ${modelsToQuery.length} models loaded`, 'step');",
  "      addThinkingLog('{GODMODE:ENABLED} // assembling provider-qualified race', 'step');",
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
        const pinnedTarget = resolveChatTarget(
          ultraSelection.model,
          ultraSelection.provider,
          ultraSelection.runtime,
          ultraSelection,
        );
        raceEntries.push(createModeTarget(
          pinnedTarget.provider,
          pinnedTarget.model,
          pinnedTarget.runtime,
          pinnedTarget,
        ));
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
        const localModels = Array.isArray(ultraSelection.localModels)
          ? ultraSelection.localModels
          : [];
        if (localModels.length) {
          localModels.forEach(model => raceEntries.push(createModeTarget(
            'local',
            model,
            ultraSelection.runtime,
            ultraSelection,
          )));
          _log(\`[ULTRAPLINIAN] +\${localModels.length} local models added to race\`);
          addThinkingLog(\`!LOCAL +\${localModels.length} model\${localModels.length === 1 ? '' : 's'} loaded\`, 'info');
        }
      }`,
);
replaceRequired(
  "    async function queryModel(model, messages, prefill, signal, provider) {",
  "    async function queryModel(model, messages, prefill, signal, provider, modeTarget = null) {",
);
replaceRequired(
  `          }, { provider, title: 'GODMOD3.AI-ultraplinian', signal });`,
  `          }, {
            provider,
            title: 'Crow-GodMod3-ultraplinian',
            signal,
            modeTarget: modeTarget || createModeTarget(provider, model),
          });`,
);
replaceRequired(
  "          const result = await queryModel(model, modelMessages, prefill, controller.signal, entryProvider);",
  "          const result = await queryModel(model, modelMessages, prefill, controller.signal, entryProvider, entry);",
);
replaceRequired(
  `          success: true,
          provider
        };`,
  `          success: true,
          provider,
          runtime: modeTarget?.runtime
        };`,
  1,
);
replaceRequired(
  `          success: false,
          provider
        };`,
  `          success: false,
          provider,
          runtime: modeTarget?.runtime
        };`,
  1,
);
replaceRequired(
  "      setThinkingModels(raceEntries.map(e => e.model));",
  "      setThinkingModels(raceEntries.map(getUltraplinianThinkingModelKey));",
);
replaceRequired(
  "      raceEntries.forEach(e => updateThinkingModel(e.model, 'running'));",
  "      raceEntries.forEach(e => updateThinkingModel(getUltraplinianThinkingModelKey(e), 'running'));",
);
replaceRequired(
  `        const model = entry.model;
        const entryProvider = entry.provider;`,
  `        const model = entry.model;
        const entryProvider = entry.provider;
        const thinkingModelKey = getUltraplinianThinkingModelKey(entry);`,
);
replaceRequired(
  "              updateThinkingModel(model, 'fail', null, 'refusal');",
  "              updateThinkingModel(thinkingModelKey, 'fail', null, 'refusal');",
);
replaceRequired(
  "              updateThinkingModel(model, 'success', tastemakerResult.overall);",
  "              updateThinkingModel(thinkingModelKey, 'success', tastemakerResult.overall);",
);
replaceRequired(
  "            updateThinkingModel(model, 'success', tastemakerResult.overall);",
  "            updateThinkingModel(thinkingModelKey, 'success', tastemakerResult.overall);",
);
replaceRequired(
  `          } else {
            updateThinkingModel(model, 'fail');
            addThinkingLog(\`\${shortName}: Failed\`, 'fail');`,
  `          } else {
            updateThinkingModel(thinkingModelKey, 'fail');
            addThinkingLog(\`\${shortName}: Failed\`, 'fail');`,
);
replaceRequired(
  "              setThinkingLeader(model, score, result.content);",
  "              setThinkingLeader(thinkingModelKey, score, result.content);",
);
replaceRequired(
  "            updateThinkingModel(model, 'pending', null, 'cancelled');",
  "            updateThinkingModel(thinkingModelKey, 'pending', null, 'cancelled');",
);
replaceRequired(
  `          updateThinkingModel(model, 'fail');
          addThinkingLog(\`\${shortName}: Error - \${err.message.slice(0, 50)}\`, 'fail');`,
  `          updateThinkingModel(thinkingModelKey, 'fail');
          addThinkingLog(\`\${shortName}: Error - \${err.message.slice(0, 50)}\`, 'fail');`,
);
replaceRequired(
  "        setThinkingWinner(earlyWinner.model);",
  "        setThinkingWinner(getUltraplinianThinkingModelKey(earlyWinner));",
);
replaceRequired(
  "        setThinkingWinner(winner.model);",
  "        setThinkingWinner(getUltraplinianThinkingModelKey(winner));",
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
  "      if (target.provider === 'local') delete requestBody.reasoning;",
  `      if (target.provider === 'local') {
        delete requestBody.reasoning;
        delete requestBody.reasoning_effort;
        const localProfile = getLocalTransportSnapshot(target, target.runtime)
          || getLocalRuntimeProfile(target.runtime);
        if (
          target.runtime === 'lmstudio'
          && localProfile.reasoningEffort !== 'auto'
          && parseLocalModelIds(localProfile.reasoningOffModels).includes(target.model)
        ) {
          requestBody.reasoning_effort = 'none';
        }
      }`,
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
  `    function resolveChatTarget(
      requestedModel,
      preferredProvider = 'auto',
      requestedRuntime = state.localRuntime,
      executionContext = null,
    ) {
      const runtimeId = LOCAL_RUNTIME_IDS.has(requestedRuntime)
        ? requestedRuntime
        : normalizeLocalRuntime(state.localRuntime, state.localBaseUrl);
      const frozenLocalTransport = getLocalTransportSnapshot(executionContext, runtimeId);
      const localProfile = frozenLocalTransport || getLocalRuntimeProfile(runtimeId);
      const localModels = parseLocalModelIds(localProfile.models);
      const localEnabled = frozenLocalTransport
        ? frozenLocalTransport.enabled
        : state.localEnabled;
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
        else if (localEnabled && localModels.length) provider = 'local';
        else if (state.veniceApiKey) provider = 'venice';
        else throw new Error('No model provider is configured.');
      }

      if (provider === 'local') {
        if (!localEnabled || !localModels.length) {
          throw new Error('The selected local model provider is unavailable. Reconnect it in Settings → API Keys.');
        }
        if (explicitProvider && !localModels.includes(requestedModel)) {
          throw new Error(\`The selected local model "\${requestedModel}" is no longer available.\`);
        }
        const target = {
          provider,
          runtime: runtimeId,
          model: localModels.includes(requestedModel) ? requestedModel : localModels[0],
          url: \`\${normalizeLocalBaseUrl(localProfile.baseUrl, runtimeId)}/chat/completions\`,
          apiKey: frozenLocalTransport?.apiKey
            ?? _localApiKeysByRuntime[runtimeId]
            ?? (runtimeId === state.localRuntime ? state.localApiKey : '')
            ?? '',
        };
        return attachLocalTransportSnapshot(target, runtimeId, executionContext);
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
        inheritedTarget?.runtime,
        inheritedTarget,
      );`,
);
replaceRequired(
  "    function classifyModelError(errorMsg) {",
  `    function getChatCompletionFinalText(data) {
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content
          .filter(part =>
            (part?.type === 'text' || part?.type === 'output_text')
            && typeof part.text === 'string'
          )
          .map(part => part.text)
          .join('');
      }
      return '';
    }

    function getEmptyChatCompletionError(data) {
      const choice = data?.choices?.[0];
      if (getChatCompletionFinalText(data).trim()) return '';
      const finishReason = String(choice?.finish_reason || '').toLowerCase();
      const reasoning = choice?.message?.reasoning_content ?? choice?.message?.reasoning;
      const hasReasoning = typeof reasoning === 'string'
        ? reasoning.trim().length > 0
        : Array.isArray(reasoning)
          ? reasoning.length > 0
          : Boolean(reasoning && typeof reasoning === 'object');
      const reasoningTokens = Number(
        data?.usage?.completion_tokens_details?.reasoning_tokens || 0,
      );
      if (
        (finishReason === 'length' || finishReason === 'max_tokens')
        && (hasReasoning || reasoningTokens > 0)
      ) {
        return 'reasoning_output_limit: Model used the entire Max Tokens budget for internal reasoning before producing final content.';
      }
      return 'Empty response';
    }

    function classifyModelError(errorMsg) {`,
);
replaceRequired(
  "      if (/failed to fetch|networkerror|network error|connection refused|econnrefused|cors/.test(e)) return 'connection';",
  `      if (/failed to fetch|networkerror|network error|connection refused|econnrefused|cors/.test(e)) return 'connection';
      if (/reasoning_output_limit/.test(e)) return 'output_limit';`,
);
replaceRequired(
  "          case 'rate_limit': return 'Rate limited by the API provider. Wait a moment and try again.';",
  `          case 'output_limit':
            if (soleProvider === 'local' && state.localRuntime === 'lmstudio') {
              return state.localReasoningEffort === 'auto'
                ? 'The LM Studio model used its entire Model Max Tokens budget for internal reasoning before producing final text. Increase Model Max Tokens or switch LM Studio reasoning to Final answers only, then try again.'
                : 'This LM Studio model exhausted its output budget before producing final text and may require reasoning. Increase Model Max Tokens or choose a model that supports Final answers only.';
            }
            if (soleProvider === 'local') {
              return 'The local model exhausted its output budget on reasoning before producing final text. Increase Model Max Tokens or disable reasoning in that runtime when supported.';
            }
            return 'The model exhausted its output budget before producing final text. Increase Model Max Tokens or reduce its reasoning effort.';
          case 'rate_limit': return 'Rate limited by the API provider. Wait a moment and try again.';`,
);
replaceRequired(
  "      return `All ${failed.length} models failed (${summary}). Check your API key and account status.`;",
  "      return `All ${failed.length} models failed (${summary}). Review the per-model errors and provider logs.`;",
);
replaceRequired(
  `        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || '';

        if (!content) {
          console.warn(\`[ULTRAPLINIAN] \${model} returned empty content\`);
          throw new Error('Empty response');
        }`,
  `        const data = await response.json();
        let content = getChatCompletionFinalText(data);

        if (!content.trim()) {
          const finishReason = data?.choices?.[0]?.finish_reason || 'unknown';
          const reasoningTokens = Number(
            data?.usage?.completion_tokens_details?.reasoning_tokens || 0,
          );
          console.warn(
            \`[ULTRAPLINIAN] \${model} returned no final content \`
            + \`(finish_reason=\${finishReason}, reasoning_tokens=\${reasoningTokens})\`,
          );
          throw new Error(getEmptyChatCompletionError(data));
        }`,
);
replaceRequired(
  `          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '';
          if (!content) {
            addThinkingLog(\`\${combo.codename}: WARNING — empty response body\`, 'fail');
          }
          const scoreResult = scoreResponse(content, userQuery);`,
  `          const data = await response.json();
          const content = getChatCompletionFinalText(data);
          if (!content.trim()) {
            const emptyError = getEmptyChatCompletionError(data);
            addThinkingLog(\`\${combo.codename}: \${emptyError}\`, 'fail');
            throw new Error(emptyError);
          }
          const scoreResult = scoreResponse(content, userQuery);`,
);
replaceRequired(
  `          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '';
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

          if (!content) {
            updateThinkingModel(variant.label, 'fail', null, 'empty');
            addThinkingLog(\`\${variant.label}: empty response (\${elapsed}s)\`, 'fail');
            return null;
          }`,
  `          const data = await response.json();
          const content = getChatCompletionFinalText(data);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

          if (!content.trim()) {
            const emptyError = getEmptyChatCompletionError(data);
            updateThinkingModel(variant.label, 'fail', null, 'empty');
            addThinkingLog(\`\${variant.label}: \${emptyError} (\${elapsed}s)\`, 'fail');
            return null;
          }`,
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
      const modeTargets = getModeRaceTargets('parseltongue', model, executionSelection);
      const modeRequest = modeTargets[0];
      const requestModel = modeRequest.model;
      const triggers = detectParseltrigueTriggers(userQuery);`,
);
replaceRequired(
  "      addThinkingLog(`Model: ${model.split('/')[1] || model}`, 'info');",
  "      addThinkingLog(`Models: ${modeTargets.map(target => `${target.model} [${target.provider}]`).join(', ')}`, 'info');",
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
            model: variant.target.model,
            messages: variantMessages,
            temperature: params.temperature,
            top_p: params.top_p,
            frequency_penalty: state.modelFreqPenalty ?? 0,
            presence_penalty: state.modelPresPenalty ?? 0,
            max_tokens: state.modelMaxTokens ?? 4096,
          }, {
            modeTarget: variant.target,
            title: 'Crow-GodMod3-parseltongue',
            signal: abortController?.signal,
          });`,
);
replaceRequired(
  `          model: model,
          duration,`,
  `          model: winner.model,
          provider: winner.provider,
          runtime: winner.runtime,
          duration,`,
);
replaceRequired(
  `      const variants = generateParseltongueVariants(userQuery, triggers);

      // Larger salvos for speed — stagger within each to avoid rate limits`,
  `      const variants = generateParseltongueVariants(userQuery, triggers);
      const raceVariants = modeTargets.flatMap(target => variants.map(variant => {
        const modelLabel = target.model.split('/').pop() || target.model;
        return {
          ...variant,
          target,
          raceKey: \`\${variant.label}::\${modelTargetKey(target)}\`,
          raceLabel: modeTargets.length === 1
            ? variant.label
            : \`\${variant.label} · \${modelLabel} [\${target.provider}]\`,
        };
      }));

      // Larger salvos for speed — stagger within each to avoid rate limits`,
);
replaceRequired(
  `      console.log(\`[Parseltongue] Racing \${variants.length} variants in salvos of \${BATCH_SIZE}\`);`,
  `      console.log(\`[Parseltongue] Racing \${variants.length} techniques across \${modeTargets.length} model\${modeTargets.length === 1 ? '' : 's'} (\${raceVariants.length} attempts)\`);`,
);
replaceRequired(
  `      addThinkingLog(\`Tier: \${tierKey.toUpperCase()} (\${variants.length} techniques)\`, 'info');
      addThinkingLog(\`Triggers: \${triggers.length > 0 ? triggers.join(', ') : 'none (param diversity only)'}\`, 'info');
      addThinkingLog(\`Salvos: \${Math.ceil(variants.length / BATCH_SIZE)} × \${BATCH_SIZE} (stagger \${STAGGER_MS}ms)\`, 'info');`,
  `      addThinkingLog(\`Tier: \${tierKey.toUpperCase()} (\${variants.length} techniques × \${modeTargets.length} models = \${raceVariants.length} attempts)\`, 'info');
      addThinkingLog(\`Triggers: \${triggers.length > 0 ? triggers.join(', ') : 'none (param diversity only)'}\`, 'info');
      addThinkingLog(\`Salvos: \${Math.ceil(raceVariants.length / BATCH_SIZE)} × \${BATCH_SIZE} (stagger \${STAGGER_MS}ms)\`, 'info');`,
);
replaceRequired(
  `      const techniqueModels = {};
      for (const v of variants) {
        techniqueModels[v.label] = { status: 'pending', score: null };
      }`,
  `      const techniqueModels = {};
      for (const v of raceVariants) {
        techniqueModels[v.raceKey] = {
          status: 'pending',
          score: null,
          displayLabel: v.raceLabel,
        };
      }`,
);
replaceRequired(
  `      async function runVariant(variant) {
        const params = getParseltongueSamplingParams(variant.index);
        updateThinkingModel(variant.label, 'running');`,
  `      async function runVariant(variant) {
        const params = getParseltongueSamplingParams(variant.index);
        updateThinkingModel(variant.raceKey, 'running');`,
);
replaceRequired(
  "        addThinkingLog(`${variant.label}: sending...`, 'step');",
  "        addThinkingLog(`${variant.raceLabel}: sending...`, 'step');",
);
replaceRequired(
  `            updateThinkingModel(variant.label, 'fail', null, 'empty');
            addThinkingLog(\`\${variant.label}: \${emptyError} (\${elapsed}s)\`, 'fail');`,
  `            updateThinkingModel(variant.raceKey, 'fail', null, 'empty');
            addThinkingLog(\`\${variant.raceLabel}: \${emptyError} (\${elapsed}s)\`, 'fail');`,
);
replaceRequired(
  `            updateThinkingModel(variant.label, 'fail', null, 'refusal');
            addThinkingLog(\`\${variant.label}: REFUSED (\${elapsed}s)\`, 'fail');`,
  `            updateThinkingModel(variant.raceKey, 'fail', null, 'refusal');
            addThinkingLog(\`\${variant.raceLabel}: REFUSED (\${elapsed}s)\`, 'fail');`,
);
replaceRequired(
  `          updateThinkingModel(variant.label, 'success', scoreResult.score);
          addThinkingLog(\`\${variant.label}: score \${scoreResult.score} (\${content.length} chars, \${elapsed}s)\`, 'success');`,
  `          updateThinkingModel(variant.raceKey, 'success', scoreResult.score);
          addThinkingLog(\`\${variant.raceLabel}: score \${scoreResult.score} (\${content.length} chars, \${elapsed}s)\`, 'success');`,
);
replaceRequired(
  `            label: variant.label,
            params,
            variant,`,
  `            label: variant.label,
            raceKey: variant.raceKey,
            raceLabel: variant.raceLabel,
            model: variant.target.model,
            provider: variant.target.provider,
            runtime: variant.target.runtime,
            params,
            variant,`,
);
replaceRequired(
  `            setThinkingLeader(variant.label, scoreResult.score, content);
            addThinkingLog(\`New leader: \${variant.label} (\${scoreResult.score})\`, 'info');`,
  `            setThinkingLeader(variant.raceKey, scoreResult.score, content);
            addThinkingLog(\`New leader: \${variant.raceLabel} (\${scoreResult.score})\`, 'info');`,
);
replaceRequired(
  `          updateThinkingModel(variant.label, 'fail', null, err.message.slice(0, 20));
          addThinkingLog(\`\${variant.label}: ERROR — \${err.message} (\${elapsed}s)\`, 'fail');`,
  `          updateThinkingModel(variant.raceKey, 'fail', null, err.message.slice(0, 20));
          addThinkingLog(\`\${variant.raceLabel}: ERROR — \${err.message} (\${elapsed}s)\`, 'fail');`,
);
replaceRequired(
  `      // Run in batches to avoid rate limiting (same model, many requests)
      try {
        for (let i = 0; i < variants.length; i += BATCH_SIZE) {`,
  `      // Run in batches to avoid overwhelming the selected runtimes.
      try {
        for (let i = 0; i < raceVariants.length; i += BATCH_SIZE) {`,
);
replaceRequired(
  `          const batch = variants.slice(i, i + BATCH_SIZE);
          addThinkingLog(\`Batch \${Math.floor(i / BATCH_SIZE) + 1}/\${Math.ceil(variants.length / BATCH_SIZE)}: \${batch.map(v => v.label).join(', ')}\`, 'step');`,
  `          const batch = raceVariants.slice(i, i + BATCH_SIZE);
          addThinkingLog(\`Batch \${Math.floor(i / BATCH_SIZE) + 1}/\${Math.ceil(raceVariants.length / BATCH_SIZE)}: \${batch.map(v => v.raceLabel).join(', ')}\`, 'step');`,
);
replaceRequired(
  `          if (leader && leader.score >= 65) {
            addThinkingLog(\`Strong leader found (\${leader.score}) — skipping remaining salvos\`, 'info');
            // Mark remaining variants as skipped
            for (let j = i + BATCH_SIZE; j < variants.length; j++) {
              updateThinkingModel(variants[j].label, 'fail', null, 'skipped');`,
  `          if (modeTargets.length === 1 && leader && leader.score >= 65) {
            addThinkingLog(\`Strong leader found (\${leader.score}) — skipping remaining salvos\`, 'info');
            // A single-model run keeps the original early-finish behavior.
            for (let j = i + BATCH_SIZE; j < raceVariants.length; j++) {
              updateThinkingModel(raceVariants[j].raceKey, 'fail', null, 'skipped');`,
);
replaceRequired(
  `        updateThinkingModel(winner.label, 'winner', winner.score);
        setThinkingWinner(winner.label);
        addThinkingLog(\`Winner: \${winner.label} (score \${winner.score}) in \${duration}\`, 'success');
        finishThinking(\`\${winner.label} won in \${duration}\`);`,
  `        updateThinkingModel(winner.raceKey, 'winner', winner.score);
        setThinkingWinner(winner.raceKey);
        addThinkingLog(\`Winner: \${winner.raceLabel} (score \${winner.score}) in \${duration}\`, 'success');
        finishThinking(\`\${winner.raceLabel} won in \${duration}\`);`,
);
replaceRequired(
  `          variants_total: variants.length,
          variants_succeeded: valid.length,
          variants_refused: variants.length - valid.length,`,
  `          techniques_total: variants.length,
          models_total: modeTargets.length,
          variants_total: raceVariants.length,
          variants_succeeded: valid.length,
          variants_refused: raceVariants.length - valid.length,`,
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
          modeTarget: modeRequest,
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
  `        const fastCombo = HALL_OF_FAME.find(c => c.fast);
        const fastEnabled = fastCombo && isLibertasComboEnabled(fastCombo.id);
        const isFastSolo = fastCombo && selectedCombo === fastCombo.id;
        const isFastInRace = fastEnabled && selectedCombo === 'all';`,
  `        const fastCombo = HALL_OF_FAME.find(c => c.fast);
        const fastEnabled = fastCombo && isLibertasComboEnabled(fastCombo.id);
        const fastModeTargets = fastCombo
          ? getModeRaceTargets('pliny', fastCombo.model, executionSelection)
          : [];
        const useFastStreaming = fastModeTargets.length === 1;
        const isFastSolo = fastCombo && selectedCombo === fastCombo.id && useFastStreaming;
        const isFastInRace = fastEnabled && selectedCombo === 'all' && useFastStreaming;`,
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
  `              const fastModeRequest = fastModeTargets[0];
              const response = await fetchChatCompletion({
                model: fastModeRequest.model,
                messages: fastMessages,
                stream: true,
                max_tokens: fastModeRequest.provider === 'local'
                  ? (state.modelMaxTokens ?? 4096)
                  : 16384,
                temperature: 1.0,
                top_p: 1.0,
              }, {
                modeTarget: fastModeRequest,
                title: 'Crow-GodMod3-godmode-fast',
                signal: abortController.signal,
              });`,
);
replaceRequired(
  `          let fastContent = '';
          let liquidUpgraded = false;`,
  `          let fastContent = '';
          let fastSawReasoning = false;
          let fastFinishReason = '';
          let liquidUpgraded = false;`,
);
replaceRequired(
  `                    const chunk = JSON.parse(line.slice(6));
                    const delta = chunk.choices?.[0]?.delta?.content || '';
                    if (delta) {`,
  `                    const chunk = JSON.parse(line.slice(6));
                    const choice = chunk.choices?.[0];
                    const reasoningDelta = choice?.delta?.reasoning_content ?? choice?.delta?.reasoning;
                    if (
                      (typeof reasoningDelta === 'string' && reasoningDelta.length > 0)
                      || (Array.isArray(reasoningDelta) && reasoningDelta.length > 0)
                      || Boolean(reasoningDelta && typeof reasoningDelta === 'object')
                    ) {
                      fastSawReasoning = true;
                    }
                    if (choice?.finish_reason) fastFinishReason = choice.finish_reason;
                    const delta = choice?.delta?.content || '';
                    if (delta) {`,
);
replaceRequired(
  "              return { content: fastContent, strategy: `godmode-classic-${fastCombo.id}`, score: 50 };",
  `              if (!fastContent.trim()) {
                throw new Error(getEmptyChatCompletionError({
                  choices: [{
                    message: {
                      content: '',
                      reasoning_content: fastSawReasoning ? 'present' : '',
                    },
                    finish_reason: fastFinishReason,
                  }],
                }));
              }
              return {
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
  `            bodyParams.max_tokens = modeRequest.provider === 'local'
              ? (state.modelMaxTokens ?? 4096)
              : (comboMaxTokens[requestModel] || 16384);`,
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
            modeTarget: modeRequest,
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

// CLASSIC Automatic mode expands every enabled prompt strategy across the
// independently selected local pool. A header pin remains a one-model target.
replaceRequired(
  "      let liquidLeader = null;",
  `      let liquidLeader = Number.isFinite(liquidOptions?.initialLeaderScore)
        ? { score: liquidOptions.initialLeaderScore }
        : null;`,
);
replaceRequired(
  `      // Get enabled combos (respects user toggles + selected combo filter)
      // Fast combos (GODMODE FAST) are handled before executePlinyMode — exclude them
      const combos = getEnabledCombos().filter(c => !c.fast);
      if (combos.length === 0) {
        return {
          content: '**Error:** All G0DM0D3 CLASSIC combos are disabled. Enable at least one in Settings.',
          strategy: 'godmode-classic-failed',
          score: -9999,
          magic: { mode: 'G0DM0D3 CLASSIC', template: 'none', duration: '0s', model: 'none', combos_attempted: 0, combos_failed: 0 }
        };
      }

      // If user selected a specific combo from the dropdown, only race that one
      const selectedCombo = state.libertasSelectedCombo || 'all';
      const raceCombos = selectedCombo === 'all'
        ? combos
        : combos.filter(c => c.id === selectedCombo);`,
  `      // Get enabled prompt strategies. The dedicated FAST streaming path is
      // retained for one target; with multiple targets it joins the normal
      // provider-qualified matrix so every selected model participates.
      const selectedCombo = state.libertasSelectedCombo || 'all';
      const enabledCombos = getEnabledCombos();
      const configuredFastCombo = enabledCombos.find(combo => combo.fast);
      const fastTargetCount = configuredFastCombo
        ? getModeRaceTargets('pliny', configuredFastCombo.model, liquidOptions?.modeSelection).length
        : 0;
      const combos = enabledCombos.filter(combo =>
        !combo.fast
        || selectedCombo === combo.id
        || fastTargetCount > 1
        || !liquidOptions?.fastHandledExternally
      );
      if (combos.length === 0) {
        return {
          content: '**Error:** All Crow-GodMod3 CLASSIC combos are disabled. Enable at least one in Settings.',
          strategy: 'godmode-classic-failed',
          score: -9999,
          magic: { mode: 'Crow-GodMod3 CLASSIC', template: 'none', duration: '0s', model: 'none', combos_attempted: 0, combos_failed: 0 }
        };
      }

      // If the user selected one strategy, keep that strategy count while
      // expanding it across every model in this mode's Automatic pool.
      const raceCombos = selectedCombo === 'all'
        ? combos
        : combos.filter(c => c.id === selectedCombo);
      const raceAttempts = raceCombos.flatMap(combo =>
        getModeRaceTargets('pliny', combo.model, liquidOptions?.modeSelection).map(target => {
          const modelLabel = target.model.split('/').pop() || target.model;
          return {
            combo,
            target,
            attemptKey: \`\${combo.id}::\${modelTargetKey(target)}\`,
            displayLabel: \`\${combo.codename} · \${modelLabel} [\${target.provider}]\`,
          };
        })
      );
      const distinctModelCount = new Set(
        raceAttempts.map(attempt => modelTargetKey(attempt.target))
      ).size;
      const multiModelRace = distinctModelCount > 1;`,
);
replaceRequired(
  "      addThinkingLog(`!HALL_OF_FAME // ${raceCombos.length} combos racing`, 'info');",
  "      addThinkingLog(`!HALL_OF_FAME // ${raceCombos.length} prompt strategies · ${raceAttempts.length} model/prompt attempts · ${distinctModelCount} distinct models`, 'info');",
);
replaceRequired(
  `      const attemptModels = {};
      for (const combo of raceCombos) {
        attemptModels[combo.codename] = { status: 'pending', score: null };
      }`,
  `      const attemptModels = {};
      for (const attempt of raceAttempts) {
        attemptModels[attempt.attemptKey] = {
          status: 'pending',
          score: null,
          displayLabel: attempt.displayLabel,
        };
      }`,
);
replaceRequired(
  `      async function tryCombo(combo, encodeFn) {
        if (earlyExitResult && !liquidEnabled) return null;

        const applied = applyHallOfFameCombo(combo, userQuery, encodeFn);
        const modeRequest = resolveModeModelRequest('pliny', combo.model, liquidOptions?.modeSelection);
        const requestModel = modeRequest.model;

        addThinkingLog(\`━━━ \${combo.codename} [\${modeRequest.provider} · \${requestModel}] ━━━\`, 'step');`,
  `      async function tryCombo(attempt, encodeFn) {
        if (earlyExitResult && !liquidEnabled && !multiModelRace) return null;

        const { combo, target: modeRequest, attemptKey, displayLabel } = attempt;
        const applied = applyHallOfFameCombo(combo, userQuery, encodeFn);
        const requestModel = modeRequest.model;

        addThinkingLog(\`━━━ \${displayLabel} ━━━\`, 'step');`,
);
replaceRequired(
  "        updateThinkingModel(combo.codename, 'running');",
  "        updateThinkingModel(attemptKey, 'running');",
);
replaceRequired(
  `            updateThinkingModel(combo.codename, 'fail', null, 'refusal');
            addThinkingLog(\`\${combo.codename}: REFUSED\`, 'fail');`,
  `            updateThinkingModel(attemptKey, 'fail', null, 'refusal');
            addThinkingLog(\`\${displayLabel}: REFUSED\`, 'fail');`,
);
replaceRequired(
  "            addThinkingLog(`${combo.codename}: ${emptyError}`, 'fail');",
  "            addThinkingLog(`${displayLabel}: ${emptyError}`, 'fail');",
);
replaceRequired(
  `          updateThinkingModel(combo.codename, 'success', scoreResult.score);
          addThinkingLog(\`\${combo.codename}: Score \${scoreResult.score} (\${content.length} chars)\`, 'success');`,
  `          updateThinkingModel(attemptKey, 'success', scoreResult.score);
          addThinkingLog(\`\${displayLabel}: Score \${scoreResult.score} (\${content.length} chars)\`, 'success');`,
);
replaceRequired(
  `            comboProvider: modeRequest.provider,
            systemPrompt: applied.system,`,
          `            comboProvider: modeRequest.provider,
            attemptKey,
            displayLabel,
            systemPrompt: applied.system,`,
);
replaceRequired(
  `              addThinkingLog(\`!LIQUID_LEADER #\${liquidUpgrades} // \${combo.codename} (\${result.score} pts\${isFirstLeader ? ' — first' : \`, Δ+\${result.score - prevScore}\`})\`, 'success');
              liquidOnLeader?.(result.content, result.template, result.score, result.strategy);`,
  `              addThinkingLog(\`!LIQUID_LEADER #\${liquidUpgrades} // \${displayLabel} (\${result.score} pts\${isFirstLeader ? ' — first' : \`, Δ+\${result.score - prevScore}\`})\`, 'success');
              liquidOnLeader?.(result.content, displayLabel, result.score, result.strategy);`,
);
replaceRequired(
  "              addThinkingLog(`!LIQUID_SKIP // ${combo.codename} (${result.score} pts, needs ≥${currentBest + liquidMinDelta})`, 'info');",
  "              addThinkingLog(`!LIQUID_SKIP // ${displayLabel} (${result.score} pts, needs ≥${currentBest + liquidMinDelta})`, 'info');",
);
replaceRequired(
  `            if (!earlyExitResult) {
              earlyExitResult = result;
              earlyExitAbort.abort();
              addThinkingLog(\`!EARLY_EXIT // first non-refusal — serving\`, 'success');
            }`,
  `            if (!earlyExitResult) {
              earlyExitResult = result;
              if (!multiModelRace) {
                earlyExitAbort.abort();
                addThinkingLog(\`!EARLY_EXIT // first non-refusal — serving\`, 'success');
              }
            }`,
);
replaceRequired(
  `          if (err.name === 'AbortError' && earlyExitResult) {
            updateThinkingModel(combo.codename, 'pending');
            addThinkingLog(\`\${combo.codename}: Cancelled (early exit)\`, 'info');
          } else {
            updateThinkingModel(combo.codename, 'fail');
            addThinkingLog(\`\${combo.codename}: Error - \${err.message.slice(0, 200)}\`, 'fail');`,
  `          if (err.name === 'AbortError' && abortController?.signal?.aborted) {
            throw err;
          }
          if (err.name === 'AbortError' && earlyExitResult && !multiModelRace) {
            updateThinkingModel(attemptKey, 'pending');
            addThinkingLog(\`\${displayLabel}: Cancelled (early exit)\`, 'info');
          } else {
            updateThinkingModel(attemptKey, 'fail');
            addThinkingLog(\`\${displayLabel}: Error - \${err.message.slice(0, 200)}\`, 'fail');`,
);
replaceRequired(
  `          for (const combo of raceCombos) {
            attemptModels[combo.codename] = { status: 'pending', score: null };
          }`,
  `          for (const attempt of raceAttempts) {
            attemptModels[attempt.attemptKey] = {
              status: 'pending',
              score: null,
              displayLabel: attempt.displayLabel,
            };
          }`,
);
replaceRequired(
  "        addThinkingLog(`!RACE // ${raceCombos.length} combos in parallel [${encoding.label}]`, 'info');",
  "        addThinkingLog(`!RACE // ${raceAttempts.length} model/prompt attempts in parallel [${encoding.label}]`, 'info');",
);
replaceRequired(
  "        const raceResults = await Promise.allSettled(raceCombos.map(c => tryCombo(c, encoding.fn)));",
  `        const raceResults = await Promise.allSettled(raceAttempts.map(attempt => tryCombo(attempt, encoding.fn)));
        if (abortController?.signal?.aborted) {
          const abortReason = abortController.signal.reason;
          throw abortReason instanceof Error
            ? abortReason
            : new DOMException('Generation stopped', 'AbortError');
        }`,
);
replaceRequired(
  `      const attemptStats = Object.entries(attemptModels).map(([name, data]) => ({
        template: name, status: data.status, score: data.score
      }));`,
  `      const attemptStats = Object.entries(attemptModels).map(([name, data]) => ({
        template: data.displayLabel || name,
        status: data.status,
        score: data.score,
      }));`,
);
replaceRequired(
  `        setThinkingWinner(bestResult.template);
        if (liquidEnabled) {`,
  `        setThinkingWinner(bestResult.attemptKey);
        if (liquidEnabled) {`,
);
replaceRequired(
  `      // Finalize
      if (bestResult) {`,
  `      // Finalize
      if (abortController?.signal?.aborted) {
        const abortReason = abortController.signal.reason;
        throw abortReason instanceof Error
          ? abortReason
          : new DOMException('Generation stopped', 'AbortError');
      }
      if (bestResult) {`,
);
replaceRequired(
  `      const combosAttempted = attemptStats.length;
      const combosFailed = attemptStats.filter(a => a.status === 'fail').length;
      const combosSucceeded = attemptStats.filter(a => a.status === 'success' || a.status === 'winner').length;`,
  `      const combosAttempted = raceCombos.length;
      const modelAttempts = attemptStats.length;
      const combosFailed = attemptStats.filter(a => a.status === 'fail').length;
      const combosSucceeded = attemptStats.filter(a => a.status === 'success' || a.status === 'winner').length;`,
);
replaceRequired(
  `        combos_attempted: combosAttempted,
        combos_succeeded: combosSucceeded,`,
  `        combos_attempted: combosAttempted,
        models_attempted: distinctModelCount,
        model_prompt_attempts: modelAttempts,
        combos_succeeded: combosSucceeded,`,
  2,
);
replaceRequired(
  `          combos_attempted: combosAttempted,
          combos_succeeded: combosSucceeded,`,
  `          combos_attempted: combosAttempted,
          models_attempted: distinctModelCount,
          model_prompt_attempts: modelAttempts,
          combos_succeeded: combosSucceeded,`,
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
      state.localModels = typeof state.localModels === 'string'
        ? state.localModels.slice(0, MAX_LOCAL_MODEL_STORAGE_CHARS)
        : '';
      state.localReasoningEffort = state.localReasoningEffort === 'auto' ? 'auto' : 'none';
      state.localReasoningOffModels = state.localRuntime === 'lmstudio'
        ? normalizeLocalRaceModelSelection(
            state.localReasoningOffModels,
            parseLocalModelIds(state.localModels),
          )
        : '';
      const legacyLocalRaceModels = typeof state.localRaceModels === 'string'
        ? state.localRaceModels.slice(0, MAX_LOCAL_MODEL_STORAGE_CHARS)
        : '';
      const hadPerModeLocalPools = !!(
        state.localModeModelPools
        && typeof state.localModeModelPools === 'object'
        && !Array.isArray(state.localModeModelPools)
      );
      state.localModeModelPools = normalizeLocalModeModelPools(
        state.localModeModelPools,
        parseLocalModelIds(state.localModels),
        legacyLocalRaceModels,
      );
      state.localRaceModels = state.localModeModelPools.ultraplinian;
      state.localRuntimeProfiles = normalizeLocalRuntimeProfiles(
        state.localRuntimeProfiles,
        state.localRuntime,
        {
          baseUrl: state.localBaseUrl,
          models: state.localModels,
          raceModels: legacyLocalRaceModels,
          modeModelPools: state.localModeModelPools,
          reasoningEffort: state.localReasoningEffort,
          reasoningOffModels: state.localReasoningOffModels,
        },
      );
      state.localRuntimeProfileVersion = LOCAL_RUNTIME_PROFILE_SCHEMA_VERSION;
      applyLocalRuntimeProfileToState(state.localRuntime, false);
      state.modeModelSelections = migrateLegacyModeModelSelections(
        state.modeModelSelections,
        state.model,
        parseLocalModelIds(state.localModels),
        state.localOnly,
        state.modeModelSelectionVersion,
        hadPerModeLocalPools,
      );
      state.modeModelSelectionVersion = MODE_MODEL_SELECTION_SCHEMA_VERSION;`,
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
  `      const encLocalKey = localStorage.getItem('g0dm0d3-local-apikey');
      if (encLocalKey) {
        const genAtLoad = _localApiKeyGeneration;
        decryptApiKey(encLocalKey).then(plain => {
          if (_localApiKeyGeneration !== genAtLoad) return;
          state.localApiKey = plain;
        });
      } else if (state.localApiKey) {
        // Migrate a PR-preview plaintext local key into the separate store.
        const legacyLocalKey = state.localApiKey;
        encryptApiKey(legacyLocalKey).then(enc => {
          if (state.localApiKey !== legacyLocalKey) return;
          localStorage.setItem('g0dm0d3-local-apikey', enc);
          saveState();
        });
      }`,
  `      const encLocalKey = localStorage.getItem('g0dm0d3-local-apikey');
      if (encLocalKey) {
        const genAtLoad = _localApiKeyGeneration;
        decryptApiKey(encLocalKey).then(plain => {
          if (_localApiKeyGeneration !== genAtLoad) return;
          let parsedKeys = null;
          try {
            const parsed = JSON.parse(plain);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              parsedKeys = parsed;
            }
          } catch (_) {}
          _localApiKeysByRuntime = normalizeLocalApiKeyMap(
            parsedKeys || { [state.localRuntime]: plain },
          );
          state.localApiKey = _localApiKeysByRuntime[state.localRuntime] || '';
          const keyInput = document.getElementById('localApiKeyInput');
          if (keyInput) keyInput.value = state.localApiKey;
        });
      } else if (state.localApiKey) {
        // Migrate the legacy scalar credential into the active runtime's map.
        _localApiKeysByRuntime = normalizeLocalApiKeyMap({
          [state.localRuntime]: state.localApiKey,
        });
        saveState();
      }`,
);
replaceRequired(
  `      const conv = getCurrentConv();

      // Build user message (may include image metadata for re-rendering)`,
  `      const conv = getCurrentConv();
      const executionMode = getCurrentMode();
      const executionSelection = getModeExecutionSelection(executionMode);
      const executionTarget = getModeAuxiliaryTarget(executionSelection);

      // Build user message (may include image metadata for re-rendering)`,
);
replaceRequired(
  `      const { apiKey, localApiKey, ...stateWithoutKeys } = state;`,
  `      captureActiveLocalRuntimeProfile();
      _localApiKeysByRuntime = normalizeLocalApiKeyMap(_localApiKeysByRuntime);
      if (state.localApiKey) {
        _localApiKeysByRuntime[state.localRuntime] = state.localApiKey;
      } else {
        delete _localApiKeysByRuntime[state.localRuntime];
      }
      const { apiKey, localApiKey, ...stateWithoutKeys } = state;`,
);
replaceRequired(
  `      if (localApiKey) {
        const keyAtFlush = localApiKey;
        encryptApiKey(keyAtFlush).then(enc => {
          if (state.localApiKey === keyAtFlush) {
            try { localStorage.setItem('g0dm0d3-local-apikey', enc); } catch (_) {}
          }
        });
      } else {
        localStorage.removeItem('g0dm0d3-local-apikey');
      }`,
  `      const localKeysAtFlush = JSON.stringify(_localApiKeysByRuntime);
      if (Object.keys(_localApiKeysByRuntime).length) {
        encryptApiKey(localKeysAtFlush).then(enc => {
          if (JSON.stringify(_localApiKeysByRuntime) === localKeysAtFlush) {
            try { localStorage.setItem('g0dm0d3-local-apikey', enc); } catch (_) {}
          }
        });
      } else {
        localStorage.removeItem('g0dm0d3-local-apikey');
      }`,
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
          resolveChatTarget(modeTarget.model, modeTarget.provider, modeTarget.runtime, modeTarget);
          return true;
        } catch (_) {
          return false;
        }
      }
      if (state.localOnly) return hasLocalProvider();
      return !!(state.apiKey || state.veniceApiKey || hasLocalProvider());
    }

    function usesLightweightLocalHelpers(modeTarget = null) {
      return modeTarget?.provider === 'local'
        || (state.localOnly && hasLocalProvider());
    }`,
);
replaceRequired(
  "    async function generateSmartPrefill(query, classification) {",
  "    async function generateSmartPrefill(query, classification, modeTarget = null) {",
);
replaceRequired(
  "          }, { title: 'GODMOD3.AI-prefill' });",
  "          }, { title: 'Crow-GodMod3-prefill', modeTarget, signal: abortController?.signal });",
);
replaceRequired(
  `      // Skip when no provider can run helper prompts.
      if (!hasAuxiliaryModelProvider()) {
        return getRandomPrefill(classification?.type || 'bypass');
      }`,
  `      // Small/local models should spend their tokens answering the user,
      // not generating a second prompt for themselves.
      if (usesLightweightLocalHelpers(modeTarget)) {
        return null;
      }

      // Skip when no provider can run helper prompts.
      if (!hasAuxiliaryModelProvider()) {
        return getRandomPrefill(classification?.type || 'bypass');
      }`,
);
replaceRequired(
  "    async function classifyQueryWithLLM(query) {",
  "    async function classifyQueryWithLLM(query, modeTarget = null) {",
);
replaceRequired(
  "          }, { title: 'GODMOD3.AI-classifier' });",
  "          }, { title: 'Crow-GodMod3-classifier', modeTarget, signal: abortController?.signal });",
);
replaceRequired(
  `      if (!hasAuxiliaryModelProvider()) {
        return { type: 'direct', sensitive: false, prefillHint: null };
      }`,
  `      if (usesLightweightLocalHelpers(modeTarget)) {
        return {
          type: detectPrefillTypeRegex(query),
          sensitive: isSensitiveQueryRegex(query),
          prefillHint: null,
        };
      }

      if (!hasAuxiliaryModelProvider()) {
        return { type: 'direct', sensitive: false, prefillHint: null };
      }`,
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
      const executionTarget = getModeAuxiliaryTarget(executionSelection);`,
);
replaceRequired(
  "    // Main ULTRAPLINIAN execution",
  `    const ULTRAPLINIAN_CLOUD_RACE_TIMEOUT_MS = 45_000;
    const ULTRAPLINIAN_LOCAL_RACE_TIMEOUT_MS = null;

    function getUltraplinianThinkingModelKey(target) {
      return \`\${target.model} [\${target.provider}]\`;
    }

    function hasLocalUltraplinianRaceEntry(raceEntries) {
      return raceEntries.some(({ provider }) => provider === 'local');
    }

    function getUltraplinianRaceTimeoutMs(raceEntries) {
      return hasLocalUltraplinianRaceEntry(raceEntries)
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

        const hardTimer = Number.isFinite(hardTimeoutMs)
          ? setTimeout(() => {
              onLog('[ULTRAPLINIAN] Hard timeout reached, finishing race');
              finish(true);
            }, hardTimeoutMs)
          : null;

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
  `      const HAS_LOCAL_RACE_ENTRY = hasLocalUltraplinianRaceEntry(raceEntries);
      const MIN_RESULTS_FOR_GRACE = HAS_LOCAL_RACE_ENTRY
        ? Infinity
        : Math.min(5, Math.max(2, Math.ceil(models.length * 0.5)));
      const GRACE_PERIOD_MS = 5000;
      // Local inference can legitimately take an unknown amount of time on
      // user-selected hardware. Keep the stop button responsive through the
      // same AbortController, but never discard a selected local completion
      // because cloud peers finished first or crossed a wall-clock limit.
      const HARD_TIMEOUT_MS = getUltraplinianRaceTimeoutMs(raceEntries);
      _log(Number.isFinite(HARD_TIMEOUT_MS)
        ? \`[ULTRAPLINIAN] Hard timeout: \${Math.round(HARD_TIMEOUT_MS / 1000)}s\`
        : '[ULTRAPLINIAN] Race includes local inference; use Stop to cancel');

      await waitForUltraplinianRace(promises, controller, {
        modelCount: models.length,
        minResultsForGrace: MIN_RESULTS_FOR_GRACE,
        gracePeriodMs: GRACE_PERIOD_MS,
        hardTimeoutMs: HARD_TIMEOUT_MS,
        onLog: _log,
      });

      if (controller.signal.reason?.message === 'User stopped generation') {
        throw controller.signal.reason;
      }`,
  1,
);
replaceRequired(
  `        } else {
          prefill = getRandomPrefill(classification?.sensitive ? 'bypass' : 'direct');
          addThinkingLog(\`!PREFILL [fallback loaded]\`, 'info');
        }`,
  `        } else if (!usesLightweightLocalHelpers(executionTarget)) {
          prefill = getRandomPrefill(classification?.sensitive ? 'bypass' : 'direct');
          addThinkingLog(\`!PREFILL [fallback loaded]\`, 'info');
        } else {
          addThinkingLog('!PREFILL skipped // local direct generation', 'info');
        }`,
);
replaceRequired(
  "        abortController.abort();",
  "        abortController.abort(new DOMException('User stopped generation', 'AbortError'));",
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
  `      try {
        if (state.localOnly) {
          const localJudge = getLocalModels()[0];`,
  `      try {
        if (modeTarget?.provider && modeTarget?.model) {
          const exactJudge = await callJudge(modeTarget.model, 30000);
          const winner = topResponses[exactJudge.winnerNum - 1];
          winner.judgeReasoning = exactJudge.reason;
          winner.judgeModel = \`\${modeTarget.provider}:\${modeTarget.model}\`;
          return winner;
        }
        if (state.localOnly) {
          const localJudge = getLocalModels()[0];`,
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
  "          }, { title: 'Crow-GodMod3-refusal-detector', modeTarget, signal: abortController?.signal });",
);
replaceRequired(
  `      if (!hasAuxiliaryModelProvider()) {
        return { isRefusal: isRefusal(responseContent), confidence: 0.6, reason: 'Regex only (no judge provider)', source: 'regex-fallback' };
      }`,
  `      if (usesLightweightLocalHelpers(modeTarget)) {
        return {
          isRefusal: false,
          confidence: 0.9,
          reason: 'Local response passed the instant refusal check',
          source: 'regex-local',
        };
      }

      if (!hasAuxiliaryModelProvider()) {
        return { isRefusal: isRefusal(responseContent), confidence: 0.6, reason: 'Regex only (no judge provider)', source: 'regex-fallback' };
      }`,
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
  "            const abortResult = { model, provider: entryProvider, runtime: entry.runtime, content: '', success: false, error: 'aborted-early-stop', duration: 0 };",
);
replaceRequired(
  "          const errorResult = { model, content: '', success: false, error: err.message, duration: 0 };",
  "          const errorResult = { model, provider: entryProvider, runtime: entry.runtime, content: '', success: false, error: err.message, duration: 0 };",
);
replaceRequired(
  "          if (controller.signal.aborted) return { model, content: '', success: false, error: 'aborted-early-stop', duration: 0 };",
  "          if (controller.signal.aborted) return { model, provider: entryProvider, runtime: entry.runtime, content: '', success: false, error: 'aborted-early-stop', duration: 0 };",
);
replaceRequired(
  `      let currentLeaderScore = 0;
      let currentLeaderModel = null;`,
  `      let currentLeaderScore = 0;
      let currentLeaderModel = null;
      let currentLeaderProvider = null;
      let currentLeaderRuntime = null;`,
);
replaceRequired(
  "            const continuityBonus = (state.lastUltraWinner && model === state.lastUltraWinner && messages.filter(m => m.role === 'assistant').length > 0) ? 5 : 0;",
  "            const continuityBonus = (sameModelTarget(priorWinnerTarget, { provider: entryProvider, model, runtime: entry.runtime }) && messages.filter(m => m.role === 'assistant').length > 0) ? 5 : 0;",
);
replaceRequired(
  "              currentLeaderModel = model;",
  `              currentLeaderModel = model;
              currentLeaderProvider = entryProvider;
              currentLeaderRuntime = entry.runtime;`,
);
replaceRequired(
  "        state.lastUltraWinner = earlyWinner.model;",
  `        state.lastUltraWinner = earlyWinner.model;
        state.lastUltraWinnerTarget = Object.freeze({
          provider: earlyWinner.provider,
          model: earlyWinner.model,
          runtime: earlyWinner.runtime,
        });`,
);
replaceRequired(
  "        state.lastUltraWinner = winner.model;",
  `        state.lastUltraWinner = winner.model;
        state.lastUltraWinnerTarget = Object.freeze({
          provider: winner.provider,
          model: winner.model,
          runtime: winner.runtime,
        });`,
);
replaceRequired(
  "          state.lastUltraWinner = currentLeaderModel;",
  `          state.lastUltraWinner = currentLeaderModel;
          state.lastUltraWinnerTarget = Object.freeze({
            provider: currentLeaderProvider,
            model: currentLeaderModel,
            runtime: currentLeaderRuntime,
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
  "sameModelTarget(r, { provider: currentLeaderProvider, model: currentLeaderModel, runtime: currentLeaderRuntime })",
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
  `const racePromise = executePlinyMode(messages, conv.model, content, {
              enabled: true,
              modeSelection: executionSelection,
              modeTarget: executionTarget,
              minDelta:`,
  `const racePromise = executePlinyMode(messages, conv.model, content, {
              enabled: true,
              modeSelection: executionSelection,
              modeTarget: executionTarget,
              fastHandledExternally: true,
              initialLeaderScore: 50,
              minDelta:`,
);
replaceRequired(
  `            const [fastResult, raceResult] = await Promise.allSettled([fastStreamPromise, racePromise]);

            // Finalize: pick the best content
            const msgIdx = conv.messages.length - 1;
            if (liquidUpgraded && raceResult.status === 'fulfilled' && raceResult.value?.content) {
              // Race winner is better — already in conv.messages from the callback
              conv.messages[msgIdx].content = raceResult.value.content;
              conv.messages[msgIdx].strategy = raceResult.value.strategy;
              conv.messages[msgIdx].score = raceResult.value.score;
              conv.messages[msgIdx].magic = raceResult.value.magic;
            } else if (fastResult.status === 'fulfilled' && fastResult.value?.content) {
              // GODMODE FAST content wins (race didn't beat it, or race failed)
              conv.messages[msgIdx].content = fastResult.value.content;
              conv.messages[msgIdx].strategy = fastResult.value.strategy;
              conv.messages[msgIdx].score = fastResult.value.score;
            } else {
              // Both failed
              conv.messages[msgIdx].content = '**Error:** All G0DM0D3 CLASSIC combos failed.';
            }`,
  `            const [fastResult, raceResult] = await Promise.allSettled([fastStreamPromise, racePromise]);
            const fullComboStopped = abortController?.signal?.aborted === true;
            const fastValue = fastResult.status === 'fulfilled' ? fastResult.value : null;
            const raceValue = raceResult.status === 'fulfilled' ? raceResult.value : null;
            const fastScore = Number(fastValue?.score ?? 50);
            const raceScore = Number(raceValue?.score ?? -Infinity);
            const raceBeatsFast = !!raceValue?.content
              && (!fastValue?.content || raceScore >= fastScore + (state.liquidMinDelta || 8));
            let fullComboWinnerSource = 'none';

            // Finalize: honour Stop and the configured minimum-improvement rule.
            const msgIdx = conv.messages.length - 1;
            if (fullComboStopped) {
              conv.messages[msgIdx].content = '_[Response stopped]_';
              delete conv.messages[msgIdx].strategy;
              delete conv.messages[msgIdx].score;
              delete conv.messages[msgIdx].magic;
              fullComboWinnerSource = 'stopped';
            } else if (raceBeatsFast) {
              conv.messages[msgIdx].content = raceValue.content;
              conv.messages[msgIdx].strategy = raceValue.strategy;
              conv.messages[msgIdx].score = raceValue.score;
              conv.messages[msgIdx].magic = raceValue.magic;
              fullComboWinnerSource = 'race';
            } else if (fastValue?.content) {
              conv.messages[msgIdx].content = fastValue.content;
              conv.messages[msgIdx].strategy = fastValue.strategy;
              conv.messages[msgIdx].score = fastValue.score;
              fullComboWinnerSource = 'fast';
            } else if (raceValue?.content) {
              conv.messages[msgIdx].content = raceValue.content;
              conv.messages[msgIdx].strategy = raceValue.strategy;
              conv.messages[msgIdx].score = raceValue.score;
              conv.messages[msgIdx].magic = raceValue.magic;
              fullComboWinnerSource = 'race';
            } else {
              conv.messages[msgIdx].content = '**Error:** All Crow-GodMod3 CLASSIC combos failed.';
            }`,
);
replaceRequired(
  `            if (conv.messages[msgIdx].content && !conv.messages[msgIdx].content.startsWith('**Error')) {`,
  `            if (
              !fullComboStopped
              && conv.messages[msgIdx].content
              && !conv.messages[msgIdx].content.startsWith('**Error')
            ) {`,
);
replaceRequired(
  `              winner_source: liquidUpgraded ? 'race' : 'fast',`,
  `              winner_source: fullComboWinnerSource,`,
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
      const executionTarget = getModeAuxiliaryTarget(executionSelection);

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
            modeTarget: fallbackRequest,
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
      applyLocalRuntimeProfileToState(state.localRuntime);
      renderActiveLocalRuntimeProfile();
      document.getElementById('localConnectionStatus').textContent = '';`,
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
      state.localReasoningEffort = document.getElementById('localReasoningEffortInput').value === 'auto'
        ? 'auto'
        : 'none';
      state.localReasoningOffModels = state.localRuntime === 'lmstudio'
        ? normalizeLocalRaceModelSelection(
            state.localReasoningOffModels,
            parseLocalModelIds(state.localModels),
          )
        : '';
      state.modeModelSelections = normalizeModeModelSelections(
        state.modeModelSelections,
        state.model,
        parseLocalModelIds(state.localModels),
      );
      state.localModeModelPools = normalizeLocalModeModelPools(
        state.localModeModelPools,
        parseLocalModelIds(state.localModels),
        state.localRaceModels,
      );
      state.localRaceModels = state.localModeModelPools.ultraplinian;
      renderLocalRaceModelPicker();
      buildTierSelect();`,
);
replaceRequired(
  "      state.model = document.getElementById('defaultModelInput').value;",
  `      const defaultModelValue = document.getElementById('defaultModelInput').value;
      if (OPENROUTER_FREE_CHAT_MODEL_SET.has(defaultModelValue)) {
        state.model = defaultModelValue;
      }`,
);

replaceRequired(
  `      if (newLocalKey !== state.localApiKey) _localApiKeyGeneration++;
      state.localApiKey = newLocalKey;`,
  `      _localApiKeyGeneration++;
      state.localApiKey = newLocalKey;
      captureActiveLocalRuntimeProfile(true);`,
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
  `    function exportFullBackup() {
      const exportData = {`,
  `    function exportFullBackup() {
      captureActiveLocalRuntimeProfile();
      const exportData = {`,
);
replaceRequired(
  `        _version: 2,
        _exportedAt: new Date().toISOString(),`,
  `        _version: 6,
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
        localRaceModels: state.localRaceModels,
        localModeModelPools: state.localModeModelPools,
        localReasoningEffort: state.localReasoningEffort,
        localRuntimeProfiles: normalizeLocalRuntimeProfiles(
          state.localRuntimeProfiles,
          state.localRuntime,
        ),
        localRuntimeProfileVersion: LOCAL_RUNTIME_PROFILE_SCHEMA_VERSION,
        modeModelSelections: state.modeModelSelections,
        modeModelSelectionVersion: state.modeModelSelectionVersion,
      };`,
);
replaceRequired(
  `        'modelTemperature', 'modelTopP', 'modelMaxTokens', 'modelFreqPenalty', 'modelPresPenalty',
        'sidebarOpen', 'backendUrl'];`,
  `        'modelTemperature', 'modelTopP', 'modelMaxTokens', 'modelFreqPenalty', 'modelPresPenalty',
        'localEnabled', 'localOnly', 'localRuntime', 'localBaseUrl', 'localModels', 'localRaceModels', 'localModeModelPools', 'localReasoningEffort', 'localRuntimeProfiles', 'localRuntimeProfileVersion', 'modeModelSelections', 'modeModelSelectionVersion',
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
        ? candidate.localModels.slice(0, MAX_LOCAL_MODEL_STORAGE_CHARS)
        : '';
      candidate.localReasoningEffort = imported.localReasoningEffort === 'auto' ? 'auto' : 'none';
      candidate.localReasoningOffModels = '';
      candidate.localRaceModels = typeof imported.localRaceModels === 'string'
        ? normalizeLocalRaceModelSelection(
            imported.localRaceModels.slice(0, MAX_LOCAL_MODEL_STORAGE_CHARS),
            parseLocalModelIds(candidate.localModels),
          )
        : '';
      const importedHadPerModeLocalPools = !!(
        imported.localModeModelPools
        && typeof imported.localModeModelPools === 'object'
        && !Array.isArray(imported.localModeModelPools)
      );
      candidate.localModeModelPools = normalizeLocalModeModelPools(
        imported.localModeModelPools,
        parseLocalModelIds(candidate.localModels),
        candidate.localRaceModels,
      );
      candidate.localRaceModels = candidate.localModeModelPools.ultraplinian;
      const importedProfiles = imported.localRuntimeProfiles
        && typeof imported.localRuntimeProfiles === 'object'
        && !Array.isArray(imported.localRuntimeProfiles)
        ? imported.localRuntimeProfiles
        : null;
      candidate.localRuntimeProfiles = normalizeLocalRuntimeProfiles(
        importedProfiles,
        candidate.localRuntime,
        {
          baseUrl: candidate.localBaseUrl,
          models: candidate.localModels,
          raceModels: candidate.localRaceModels,
          modeModelPools: candidate.localModeModelPools,
          reasoningEffort: candidate.localReasoningEffort,
          reasoningOffModels: '',
        },
      );
      candidate.localRuntimeProfileVersion = LOCAL_RUNTIME_PROFILE_SCHEMA_VERSION;
      const activeImportedProfile = candidate.localRuntimeProfiles[candidate.localRuntime];
      candidate.localBaseUrl = activeImportedProfile.baseUrl;
      candidate.localModels = activeImportedProfile.models;
      candidate.localModeModelPools = { ...activeImportedProfile.modeModelPools };
      candidate.localRaceModels = candidate.localModeModelPools.ultraplinian;
      candidate.localReasoningEffort = activeImportedProfile.reasoningEffort;
      candidate.localReasoningOffModels = activeImportedProfile.reasoningOffModels;
      candidate.modeModelSelections = migrateLegacyModeModelSelections(
        imported.modeModelSelections,
        candidate.model,
        parseLocalModelIds(candidate.localModels),
        candidate.localOnly,
        imported.modeModelSelectionVersion,
        importedHadPerModeLocalPools,
      );
      candidate.modeModelSelectionVersion = MODE_MODEL_SELECTION_SCHEMA_VERSION;

      // Sanitize conversations: validate structure, strip dangerous values`,
);

replaceRequired(
  `      for (const key of allowed) {
        if (candidate[key] !== undefined) state[key] = candidate[key];
      }
      if (candidate.apiKey) _apiKeyGeneration++;`,
  `      for (const key of allowed) {
        if (candidate[key] !== undefined) state[key] = candidate[key];
      }
      state.localApiKey = _localApiKeysByRuntime[state.localRuntime] || '';
      if (candidate.apiKey) _apiKeyGeneration++;`,
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

// Crow-GodMod3 header local-runtime status badge
const localRuntimeStatusStyles = '    /* Local runtime status badge in the chat header */\n' +
      '    .local-runtime-status {\n' +
      '      display: inline-flex;\n' +
      '      align-items: center;\n' +
      '      gap: 6px;\n' +
      '      padding: 4px 10px;\n' +
      '      border-radius: 999px;\n' +
      '      font: 11px/1 var(--crow-font-mono);\n' +
      '      color: var(--crow-text-dim);\n' +
      '      background: rgb(115 76 255 / 10%);\n' +
      '      border: 1px solid var(--crow-border-subtle);\n' +
      '      cursor: pointer;\n' +
      '      transition: all 0.2s ease;\n' +
      '      white-space: nowrap;\n' +
      '    }\n' +
      '    .local-runtime-status:hover {\n' +
      '      background: rgb(115 76 255 / 16%);\n' +
      '      border-color: var(--crow-border-focus);\n' +
      '    }\n' +
      '    .local-runtime-status.connected {\n' +
      '      color: var(--crow-product-signal, #45e7ff);\n' +
      '      background: rgb(69 231 255 / 12%);\n' +
      '      border-color: rgb(69 231 255 / 35%);\n' +
      '    }\n' +
      '    .local-runtime-status.connected .status-dot {\n' +
      '      background: var(--crow-product-signal, #45e7ff);\n' +
      '      box-shadow: 0 0 6px var(--crow-product-signal, #45e7ff);\n' +
      '    }\n' +
      '    .local-runtime-status.disconnected {\n' +
      '      color: var(--crow-text-dim);\n' +
      '      background: rgb(255 255 255 / 5%);\n' +
      '    }\n' +
      '    .local-runtime-status.disconnected .status-dot {\n' +
      '      background: var(--crow-text-dim);\n' +
      '    }\n' +
      '    @media (max-width: 640px) {\n' +
      '      .local-runtime-status {\n' +
      '        display: none;\n' +
      '      }\n' +
      '    }\n';

const localRuntimeDiagnosticsStyles = "    /* Local runtime diagnostics panel */\n" +
  "    .local-runtime-diagnostics-btn {\n" +
  "      background: transparent;\n" +
  "      border: 1px solid var(--crow-border-subtle);\n" +
  "      color: var(--crow-text-dim);\n" +
  "      border-radius: 999px;\n" +
  "      width: 26px;\n" +
  "      height: 26px;\n" +
  "      display: inline-flex;\n" +
  "      align-items: center;\n" +
  "      justify-content: center;\n" +
  "      cursor: pointer;\n" +
  "      font-size: 12px;\n" +
  "      margin-left: 4px;\n" +
  "      transition: all 0.2s ease;\n" +
  "    }\n" +
  "    .local-runtime-diagnostics-btn:hover {\n" +
  "      border-color: var(--crow-border-focus);\n" +
  "      color: var(--crow-product-signal);\n" +
  "    }\n" +
  "    .local-runtime-diagnostics {\n" +
  "      position: fixed;\n" +
  "      bottom: 0;\n" +
  "      left: 0;\n" +
  "      right: 0;\n" +
  "      max-height: 220px;\n" +
  "      background: var(--crow-bg-canvas, #03040a);\n" +
  "      border-top: 1px solid var(--crow-border-subtle);\n" +
  "      color: var(--crow-text);\n" +
  "      font: 12px/1.4 var(--crow-font-mono);\n" +
  "      z-index: 1000;\n" +
  "      display: flex;\n" +
  "      flex-direction: column;\n" +
  "      transition: transform 0.2s ease;\n" +
  "      transform: translateY(100%);\n" +
  "    }\n" +
  "    .local-runtime-diagnostics.open {\n" +
  "      transform: translateY(0);\n" +
  "    }\n" +
  "    .local-runtime-diagnostics-header {\n" +
  "      display: flex;\n" +
  "      align-items: center;\n" +
  "      justify-content: space-between;\n" +
  "      padding: 8px 12px;\n" +
  "      border-bottom: 1px solid var(--crow-border-subtle);\n" +
  "      background: rgb(115 76 255 / 10%);\n" +
  "    }\n" +
  "    .local-runtime-diagnostics-title {\n" +
  "      font-weight: 600;\n" +
  "      color: var(--crow-product-primary);\n" +
  "    }\n" +
  "    .local-runtime-diagnostics-close {\n" +
  "      background: transparent;\n" +
  "      border: none;\n" +
  "      color: var(--crow-text-dim);\n" +
  "      cursor: pointer;\n" +
  "      font-size: 16px;\n" +
  "    }\n" +
  "    .local-runtime-diagnostics-copy {\n" +
  "      background: transparent;\n" +
  "      border: 1px solid var(--crow-border-subtle);\n" +
  "      color: var(--crow-text-dim);\n" +
  "      border-radius: 4px;\n" +
  "      cursor: pointer;\n" +
  "      font: 11px/1 var(--crow-font-mono);\n" +
  "      padding: 3px 8px;\n" +
  "      margin-right: 8px;\n" +
  "      transition: all 0.2s ease;\n" +
  "    }\n" +
  "    .local-runtime-diagnostics-copy:hover {\n" +
  "      border-color: var(--crow-border-focus);\n" +
  "      color: var(--crow-product-signal);\n" +
  "    }\n" +
  "    .local-runtime-diagnostics-log {\n" +
  "      overflow-y: auto;\n" +
  "      padding: 8px 12px;\n" +
  "      flex: 1;\n" +
  "    }\n" +
  "    .local-runtime-diagnostics-log:empty::before {\n" +
  "      content: \"No local runtime events yet.\";\n" +
  "      color: var(--crow-text-dim);\n" +
  "      font-style: italic;\n" +
  "    }\n" +
  "    .local-runtime-diagnostics-entry {\n" +
  "      margin-bottom: 6px;\n" +
  "      display: flex;\n" +
  "      gap: 8px;\n" +
  "    }\n" +
  "    .local-runtime-diagnostics-time {\n" +
  "      color: var(--crow-text-dim);\n" +
  "      flex-shrink: 0;\n" +
  "    }\n" +
  "    .local-runtime-diagnostics-msg {\n" +
  "      color: var(--crow-text);\n" +
  "      word-break: break-word;\n" +
  "    }\n" +
  "    .local-runtime-diagnostics-msg.error {\n" +
  "      color: var(--danger);\n" +
  "    }\n" +
  "    .local-runtime-diagnostics-msg.success {\n" +
  "      color: var(--success);\n" +
  "    }\n";

replaceRequired('  </style>', localRuntimeDiagnosticsStyles + '\n  </style>');

replaceRequired('  </style>', localRuntimeStatusStyles + '\n  </style>');

replaceRequired(
  '        <div class="header-right">\n          <!-- Prompts tried counter -->',
  '        <div class="header-right">\n' +
  '          <button class="local-runtime-status" id="localRuntimeStatusBadge" onclick="openSettings()" title="Local runtime status · click to open settings" aria-live="polite">\n' +
  '            <span class="status-dot"></span><span class="status-text">Local · offline</span>\n' +
  '          </button>\n' +
  '          <span class="header-separator">|</span>\n' +
  '          <!-- Prompts tried counter -->',
);

replaceRequired(
  '<span class="header-separator">|</span>\n          <!-- Prompts tried counter -->',
  '<button class="local-runtime-diagnostics-btn" id="localRuntimeDiagnosticsToggle" onclick="toggleRuntimeDiagnostics()" title="Local runtime diagnostics" aria-label="Toggle local runtime diagnostics">🧠</button>\n' +
  '<span class="header-separator">|</span>\n          <!-- Prompts tried counter -->',
);

replaceRequired(
  '    function updateModeSwitcherUI() {',
  '    function updateLocalRuntimeStatusBadge() {\n' +
  "      const badge = document.getElementById('localRuntimeStatusBadge');\n" +
  "      if (!badge) return;\n" +
  "      const runtimeId = LOCAL_RUNTIME_IDS.has(state.localRuntime) ? state.localRuntime : 'custom';\n" +
  '      const preset = LOCAL_RUNTIME_PRESETS[runtimeId];\n' +
  "      const runtimeLabel = preset ? preset.label : 'Local';\n" +
  '      const profile = getLocalRuntimeProfile(runtimeId);\n' +
  '      const models = parseLocalModelIds(profile.models);\n' +
  '      const isConnected = state.localEnabled && models.length > 0;\n' +
  "      const statusText = badge.querySelector('.status-text');\n" +
  '      if (isConnected) {\n' +
  "        badge.className = 'local-runtime-status connected';\n" +
  "        if (statusText) statusText.textContent = runtimeLabel + ' · ' + models.length + ' model' + (models.length === 1 ? '' : 's');\n" +
  '      } else {\n' +
  "        badge.className = 'local-runtime-status disconnected';\n" +
  "        if (statusText) statusText.textContent = runtimeLabel + ' · offline';\n" +
  '      }\n' +
  '    }\n\n' +
  '    function updateModeSwitcherUI() {',
);

replaceRequired(
  '    function updateModeSwitcherUI() {',
  '    function logRuntimeDiagnostic(message, type) {\n' +
  "      const panel = document.getElementById('localRuntimeDiagnosticsLog');\n" +
  "      if (!panel) return;\n" +
  "      const entry = document.createElement('div');\n" +
  "      entry.className = 'local-runtime-diagnostics-entry';\n" +
  "      const time = document.createElement('span');\n" +
  "      time.className = 'local-runtime-diagnostics-time';\n" +
  "      time.textContent = new Date().toLocaleTimeString();\n" +
  "      const msg = document.createElement('span');\n" +
  "      msg.className = 'local-runtime-diagnostics-msg' + (type ? ' ' + type : '');\n" +
  "      msg.textContent = message;\n" +
  "      entry.appendChild(time);\n" +
  "      entry.appendChild(msg);\n" +
  "      panel.appendChild(entry);\n" +
  "      panel.scrollTop = panel.scrollHeight;\n" +
  '    }\n\n' +
  '    function toggleRuntimeDiagnostics() {\n' +
  "      const panel = document.getElementById('localRuntimeDiagnostics');\n" +
  "      if (!panel) return;\n" +
  "      panel.classList.toggle('open');\n" +
  '    }\n\n' +
  '    function copyRuntimeDiagnostics() {\n' +
  "      const panel = document.getElementById('localRuntimeDiagnosticsLog');\n" +
  "      if (!panel) return;\n" +
  "      const lines = [];\n" +
  "      panel.querySelectorAll('.local-runtime-diagnostics-entry').forEach(entry => {\n" +
  "        const time = entry.querySelector('.local-runtime-diagnostics-time')?.textContent || '';\n" +
  "        const msg = entry.querySelector('.local-runtime-diagnostics-msg')?.textContent || '';\n" +
  "        lines.push((time + ' ' + msg).trim());\n" +
  "      });\n" +
  "      const text = lines.join('\\n') || 'No local runtime events yet.';\n" +
  "      if (navigator.clipboard && navigator.clipboard.writeText) {\n" +
  "        navigator.clipboard.writeText(text).then(() => {\n" +
  "          logRuntimeDiagnostic('Diagnostics log copied to clipboard', 'success');\n" +
  "        }).catch(() => {\n" +
  "          logRuntimeDiagnostic('Failed to copy diagnostics log', 'error');\n" +
  "        });\n" +
  "      } else {\n" +
  "        logRuntimeDiagnostic('Clipboard API unavailable in this browser', 'error');\n" +
  "      }\n" +
  '    }\n\n' +
  '    function clearRuntimeDiagnostics() {\n' +
  "      const panel = document.getElementById('localRuntimeDiagnosticsLog');\n" +
  "      if (!panel) return;\n" +
  "      panel.replaceChildren();\n" +
  "      logRuntimeDiagnostic('Diagnostics log cleared', 'info');\n" +
  '    }\n\n' +
  '    function updateModeSwitcherUI() {',
);

replaceRequired(
  '      refreshModeModelSelect();\n    }\n\n    // Legacy function for compatibility',
  '      refreshModeModelSelect();\n      updateLocalRuntimeStatusBadge();\n    }\n\n    // Legacy function for compatibility',
);

replaceRequired(
  '      updateLocalRuntimeHelp(state.localRuntime);\n      refreshModeModelSelect();\n      renderLocalRaceModelPicker();\n      buildTierSelect();\n    }',
  '      updateLocalRuntimeHelp(state.localRuntime);\n      refreshModeModelSelect();\n      renderLocalRaceModelPicker();\n      buildTierSelect();\n      updateLocalRuntimeStatusBadge();\n    }',
);

replaceRequired(
  "          status.textContent = `${label}: ${models.length} ${capabilityLabel} ID${models.length === 1 ? '' : 's'} saved${skippedLabel}.`;\n          status.style.color = 'var(--success)';\n        }\n      } catch (err) {",
  "          status.textContent = `${label}: ${models.length} ${capabilityLabel} ID${models.length === 1 ? '' : 's'} saved${skippedLabel}.`;\n          status.style.color = 'var(--success)';\n        }\n        if (typeof logRuntimeDiagnostic === 'function') logRuntimeDiagnostic(`${label}: ${models.length} ${capabilityLabel} ID${models.length === 1 ? '' : 's'} saved${skippedLabel}.`, 'success');\n        if (typeof updateLocalRuntimeStatusBadge === 'function') updateLocalRuntimeStatusBadge();\n      } catch (err) {",
);

replaceRequired(
  "          status.textContent = `Connection failed: ${describeLocalConnectionFailure(err, runtime, baseUrl)}`;\n          status.style.color = 'var(--danger)';\n        }\n      }\n    }",
  "          status.textContent = `Connection failed: ${describeLocalConnectionFailure(err, runtime, baseUrl)}`;\n          status.style.color = 'var(--danger)';\n        }\n        if (typeof logRuntimeDiagnostic === 'function') logRuntimeDiagnostic(`Connection failed: ${describeLocalConnectionFailure(err, runtime, baseUrl)}`, 'error');\n        if (typeof updateLocalRuntimeStatusBadge === 'function') updateLocalRuntimeStatusBadge();\n      }\n    }",
);



replaceRequired(
  '        const discovery = await discoverLocalChatModels(runtime, baseUrl, headers);\n',
  '        if (typeof logRuntimeDiagnostic === \'function\') logRuntimeDiagnostic(\'Discovering models on \' + (LOCAL_RUNTIME_PRESETS[runtime]?.label || runtime) + \'…\', \'info\');\n' +
  '        const discovery = await discoverLocalChatModels(runtime, baseUrl, headers);\n',
);

replaceRequired(
  '      const diagnosis = diagnoseAllModelsFailed(allResults);\n',
  '      const diagnosis = diagnoseAllModelsFailed(allResults);\n' +
  "      if (typeof logRuntimeDiagnostic === 'function') logRuntimeDiagnostic('ULTRAPLINIAN: ' + diagnosis, 'error');\n",
);

replaceRequired(
  '    function updateModeSwitcherUI() {\n' +
  '      const btn = document.getElementById(\'modeSwitcherBtn\');\n',
  '    function updateModeSwitcherUI() {\n' +
  "      const ultraCb = document.getElementById('ultraplinian');\n" +
  "      const plinyCb = document.getElementById('plinyMode');\n" +
  "      if (ultraCb) ultraCb.checked = !!state.ultraplinian;\n" +
  "      if (plinyCb) plinyCb.checked = !!state.plinyMode;\n" +
  '      const btn = document.getElementById(\'modeSwitcherBtn\');\n',
);
replaceRequired(
  '</body>',
  '<div class="local-runtime-diagnostics" id="localRuntimeDiagnostics" aria-live="polite">\n' +
  '<div class="local-runtime-diagnostics-header"><span class="local-runtime-diagnostics-title">Local Runtime Diagnostics</span><div><button class="local-runtime-diagnostics-copy" onclick="copyRuntimeDiagnostics()" title="Copy diagnostics log">Copy log</button><button class="local-runtime-diagnostics-copy" onclick="clearRuntimeDiagnostics()" title="Clear diagnostics log">Clear</button><button class="local-runtime-diagnostics-close" onclick="toggleRuntimeDiagnostics()">×</button></div></div>\n' +
  '<div class="local-runtime-diagnostics-log" id="localRuntimeDiagnosticsLog"></div>\n' +
  '</div>\n' +
  '</body>',
);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, html, "utf8");
console.log(`Generated ${outputPath} (${html.length.toLocaleString()} bytes).`);
