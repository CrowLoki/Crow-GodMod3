import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const upstreamPath = resolve(projectRoot, "vendor", "godmod3", "index.html");
const outputPath = resolve(projectRoot, "public", "crow-godmod3.html");
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

replaceRequired(
  "    // State\n    let state = {",
  `${runtimeOpenRouterModelConfig}

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
replaceRegex(
  /(              <select id="defaultModelInput">\n)[\s\S]*?(\n              <\/select>)/,
  (_match, opening, closing) =>
    `${opening}${renderOpenRouterFreeModelOptions("                ")}${closing}`,
  1,
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
  `    function sanitizeLoadedState() {
      state.localEnabled = state.localEnabled === true;`,
  `    function sanitizeLoadedState() {
      state.model = normalizePersistedChatModel(state.model);
      state.localEnabled = state.localEnabled === true;`,
);
replaceRequired(
  `      for (const conv of state.conversations) {
        if (!Array.isArray(conv.messages)) { conv.messages = []; continue; }`,
  `      for (const conv of state.conversations) {
        conv.model = normalizePersistedChatModel(conv.model || state.model);
        if (!Array.isArray(conv.messages)) { conv.messages = []; continue; }`,
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
