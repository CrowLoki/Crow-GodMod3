import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const upstreamPath = resolve(projectRoot, "vendor", "godmod3", "index.html");
const outputPath = resolve(projectRoot, "public", "crow-godmod3.html");
const brandSystemPath = resolve(projectRoot, "brand-system");
const runtimeThemePath = resolve(projectRoot, "public", "crow-theme");
const themeCatalogSourcePath = resolve(
  projectRoot,
  "theme-integration",
  "catalog.html",
);
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

async function syncCrowThemePack() {
  if (!runtimeThemePath.startsWith(resolve(projectRoot, "public"))) {
    throw new Error(`Refusing to replace unsafe theme output: ${runtimeThemePath}`);
  }

  await rm(runtimeThemePath, { recursive: true, force: true });
  await mkdir(runtimeThemePath, { recursive: true });
  await cp(brandSystemPath, runtimeThemePath, { recursive: true });
  await copyFile(
    themeCatalogSourcePath,
    resolve(runtimeThemePath, "index.html"),
  );
  await copyFile(webManifestSourcePath, webManifestOutputPath);
}

await syncCrowThemePack();

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
  <meta name="description" content="Crow-GodMod3 — open-source, privacy-respecting multi-model AI in the complete Crow Theme.">
  <meta name="application-name" content="Crow-GodMod3">
  <meta name="apple-mobile-web-app-title" content="Crow-GodMod3">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Crow-GodMod3">
  <meta property="og:title" content="Crow-GodMod3">
  <meta property="og:description" content="Open-source, privacy-respecting multi-model AI in the complete Crow Theme.">
  <meta property="og:url" content="https://crow-godmod3.vercel.app/">
  <meta property="og:image" content="https://crow-godmod3.vercel.app/crow-theme/assets/product-variants/exports/crow-godmod3-1200x630.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Crow-GodMod3">
  <meta name="twitter:description" content="Open-source, privacy-respecting multi-model AI in the complete Crow Theme.">
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
  `  <link href="/crow-theme/fonts/crow-signal.css" rel="stylesheet">
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
          <p class="welcome-copy">Open-source, privacy-respecting multi-model AI with the full Crow visual system. <span>{CROW-GODMOD3:ENABLED}</span></p>
          <div class="welcome-actions">
            <button type="button" class="theme-pack-cta" onclick="openCrowThemePack()">Explore the Crow Theme</button>
            <a class="theme-pack-link" href="/crow-theme/index.html" target="_blank" rel="noopener">Open the complete pack</a>
          </div>`,
);
replaceRequired(
  `        <button class="settings-btn" onclick="openSettings()">
          <span>⚙</span> Settings
        </button>`,
  `        <button class="crow-theme-btn" onclick="openCrowThemePack()">
          <img src="/crow-theme/assets/mascots/masters/core-architect.png" alt="" aria-hidden="true">
          <span><strong>Crow Theme</strong><small>Glitch Ascendant · v0.1</small></span>
        </button>
        <button class="settings-btn" onclick="openSettings()">
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
  `  <!-- Settings Modal -->`,
  `  <!-- Crow Theme Pack -->
  <div class="modal-overlay theme-pack-modal" id="crowThemeModal" aria-hidden="true">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="crowThemeTitle">
      <div class="modal-header">
        <h3 id="crowThemeTitle">Crow Theme System</h3>
        <button class="modal-close" type="button" onclick="closeCrowThemePack()" aria-label="Close Crow Theme">×</button>
      </div>
      <div class="theme-pack-body">
        <section class="theme-pack-hero">
          <div class="theme-pack-hero-copy">
            <div class="theme-pack-eyebrow">Canonical identity // version 0.1.0</div>
            <h4>One Crow. Four forms. One cold signal.</h4>
            <p>Black feather, gunmetal structure, deep navy space, ultraviolet, electric blue and cyan. Magenta is a pulse—not a wash. Every mascot has exactly three eyes and a true elongated crow profile.</p>
          </div>
        </section>

        <section class="crow-form-grid" aria-label="Approved Crow mascot forms">
          <article class="crow-form-card">
            <img src="/crow-theme/assets/mascots/masters/core-architect.png" loading="lazy" alt="Core Architect, the canonical Crow system architect">
            <div class="crow-form-meta">
              <strong>Core Architect</strong>
              <small>Flagship intelligence and compact Crow-GodMod3 identity.</small>
            </div>
          </article>
          <article class="crow-form-card">
            <img src="/crow-theme/assets/mascots/masters/field-operator.png" loading="lazy" alt="Field Operator, the grounded Crow builder">
            <div class="crow-form-meta">
              <strong>Field Operator</strong>
              <small>Grounded builder, researcher and local operator.</small>
            </div>
          </article>
          <article class="crow-form-card" data-form="glitch">
            <img src="/crow-theme/assets/mascots/masters/glitch-ascendant.png" loading="lazy" alt="Glitch Ascendant, the primary Crow-GodMod3 form">
            <div class="crow-form-meta">
              <strong>Glitch Ascendant</strong>
              <small>Crow-GodMod3 primary form: recursion and controlled power.</small>
            </div>
          </article>
          <article class="crow-form-card">
            <img src="/crow-theme/assets/mascots/masters/pet-companion.png" loading="lazy" alt="Pet Companion, the small non-humanoid Crow form">
            <div class="crow-form-meta">
              <strong>Pet Companion</strong>
              <small>Small non-humanoid companion for friendly compact moments.</small>
            </div>
          </article>
        </section>

        <section class="crow-system-grid">
          <article class="crow-system-card">
            <h5>Crow Signal type</h5>
            <img src="/crow-theme/fonts/specimens/crow-signal-v0.1.png" loading="lazy" alt="Crow Signal Display and Mono font specimen">
          </article>
          <article class="crow-system-card">
            <h5>Crow Talon pointers</h5>
            <img src="/crow-theme/cursors/preview.png" loading="lazy" alt="Crow Talon cursor family preview">
          </article>
        </section>

        <section class="crow-system-card">
          <h5>Crow-GodMod3 product signal</h5>
          <div class="crow-palette" aria-label="Crow Theme colour palette">
            <div class="crow-swatch" style="background:#03040a">VOID<br>#03040A</div>
            <div class="crow-swatch" style="background:#10172b">NAVY<br>#10172B</div>
            <div class="crow-swatch" style="background:#734cff">ULTRAVIOLET<br>#734CFF</div>
            <div class="crow-swatch" style="background:#45e7ff;color:#03040a;text-shadow:none">CYAN<br>#45E7FF</div>
          </div>
        </section>

        <nav class="crow-pack-links" aria-label="Crow Theme resources">
          <a href="/crow-theme/index.html" target="_blank" rel="noopener">Open complete theme pack</a>
          <a href="/crow-theme/downloads/Crow-Signal-Windows-v0.1.0.zip" download>Download Crow Signal</a>
          <a href="/crow-theme/downloads/Crow-Talon-Windows-v0.1.0.zip" download>Download Crow Talon</a>
          <a href="/crow-theme/docs/BRAND-GUIDE.md" target="_blank" rel="noopener">Brand guide</a>
          <a href="/crow-theme/docs/MASCOT-GUIDE.md" target="_blank" rel="noopener">Mascot guide</a>
          <a href="https://github.com/CrowLoki/Crow-GodMod3/tree/main/brand-system" target="_blank" rel="noopener">Source on GitHub</a>
        </nav>
      </div>
    </div>
  </div>

  <!-- Settings Modal -->`,
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

    .welcome-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .theme-pack-cta,
    .theme-pack-link {
      min-height: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 16px;
      border: 1px solid var(--crow-cyan);
      border-radius: var(--crow-radius-sm);
      font-family: var(--crow-font-mono);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.045em;
      text-decoration: none;
      transition:
        background var(--crow-motion-fast) var(--crow-ease-enter),
        border-color var(--crow-motion-fast) var(--crow-ease-enter),
        box-shadow var(--crow-motion-fast) var(--crow-ease-enter);
    }

    .theme-pack-cta {
      color: var(--crow-text-on-bright);
      background: var(--crow-cyan);
    }

    .theme-pack-link {
      color: var(--crow-text-strong);
      background: rgb(16 23 43 / 82%);
      border-color: var(--crow-border-strong);
    }

    .theme-pack-cta:hover,
    .theme-pack-link:hover {
      border-color: var(--crow-cyan);
      box-shadow: var(--crow-shadow-cyan);
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

    .crow-theme-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 9px;
      padding: 8px;
      color: var(--crow-text-default);
      text-align: left;
      background: rgb(16 23 43 / 72%);
      border: 1px solid var(--crow-border-subtle);
      border-radius: var(--crow-radius-sm);
    }

    .crow-theme-btn img {
      width: 36px;
      height: 36px;
      flex: 0 0 36px;
      object-fit: cover;
      object-position: 50% 17%;
      border: 1px solid rgb(115 76 255 / 44%);
      border-radius: 9px;
    }

    .crow-theme-btn span {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .crow-theme-btn strong {
      color: var(--crow-text-strong);
      font-family: var(--crow-font-display);
      font-size: 12px;
      letter-spacing: var(--crow-tracking-display);
    }

    .crow-theme-btn small {
      overflow: hidden;
      color: var(--crow-text-muted);
      font-size: 8px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .new-chat-btn:hover,
    .settings-btn:hover,
    .crow-theme-btn:hover,
    .suggestion:hover {
      border-color: var(--crow-product-primary);
      box-shadow: var(--crow-shadow-ultraviolet);
    }

    .theme-pack-modal {
      z-index: 10020;
    }

    .theme-pack-modal .modal {
      width: min(1080px, 94vw);
      max-width: 1080px;
      max-height: 90dvh;
      overflow: hidden;
      background:
        linear-gradient(145deg, rgb(16 23 43 / 98%), rgb(3 4 10 / 99%)),
        url("/crow-theme/assets/backgrounds/void-grid-neutral.png") center / cover;
      border-color: var(--crow-border-strong);
      box-shadow:
        0 0 0 1px rgb(69 231 255 / 8%),
        0 28px 110px rgb(0 0 0 / 72%),
        var(--crow-shadow-ultraviolet);
    }

    .theme-pack-modal .modal-header {
      background: rgb(3 4 10 / 72%);
      border-color: var(--crow-border-subtle);
    }

    .theme-pack-modal .modal-header h3 {
      font-family: var(--crow-font-display);
      letter-spacing: var(--crow-tracking-display);
    }

    .theme-pack-body {
      display: grid;
      gap: 18px;
      max-height: calc(90dvh - 70px);
      overflow-y: auto;
      padding: 20px;
    }

    .theme-pack-hero {
      position: relative;
      min-height: 250px;
      display: flex;
      align-items: flex-end;
      overflow: hidden;
      padding: clamp(24px, 5vw, 56px);
      border: 1px solid var(--crow-border-subtle);
      border-radius: var(--crow-radius-lg);
      background:
        linear-gradient(90deg, rgb(3 4 10 / 94%), rgb(3 4 10 / 12%) 70%),
        url("/crow-theme/assets/social/crow-family-banner.png") 38% center / cover no-repeat;
    }

    .theme-pack-hero-copy {
      max-width: 510px;
    }

    .theme-pack-eyebrow {
      color: var(--crow-cyan);
      font-family: var(--crow-font-mono);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: var(--crow-tracking-signal);
      text-transform: uppercase;
    }

    .theme-pack-hero h4 {
      margin: 8px 0 10px;
      color: var(--crow-text-strong);
      font-family: var(--crow-font-display);
      font-size: clamp(24px, 4vw, 42px);
      letter-spacing: var(--crow-tracking-display);
    }

    .theme-pack-hero p {
      margin: 0;
      color: var(--crow-text-default);
      line-height: 1.55;
    }

    .crow-form-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .crow-form-card {
      overflow: hidden;
      background: rgb(10 14 27 / 88%);
      border: 1px solid var(--crow-border-subtle);
      border-radius: var(--crow-radius-md);
    }

    .crow-form-card img {
      width: 100%;
      aspect-ratio: 4 / 3;
      display: block;
      object-fit: cover;
      object-position: 50% 16%;
      border-bottom: 1px solid var(--crow-border-subtle);
    }

    .crow-form-card[data-form="glitch"] {
      border-color: rgb(115 76 255 / 72%);
      box-shadow: var(--crow-shadow-ultraviolet);
    }

    .crow-form-meta {
      padding: 12px;
    }

    .crow-form-meta strong {
      display: block;
      margin-bottom: 4px;
      color: var(--crow-text-strong);
      font-family: var(--crow-font-display);
      font-size: 12px;
      letter-spacing: var(--crow-tracking-display);
    }

    .crow-form-meta small {
      color: var(--crow-text-muted);
      line-height: 1.4;
    }

    .crow-system-grid {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 12px;
    }

    .crow-system-card {
      min-width: 0;
      padding: 16px;
      background: rgb(10 14 27 / 88%);
      border: 1px solid var(--crow-border-subtle);
      border-radius: var(--crow-radius-md);
    }

    .crow-system-card h5 {
      margin: 0 0 10px;
      color: var(--crow-text-strong);
      font-family: var(--crow-font-display);
      font-size: 14px;
      letter-spacing: var(--crow-tracking-display);
    }

    .crow-system-card img {
      width: 100%;
      display: block;
      border: 1px solid var(--crow-border-subtle);
      border-radius: var(--crow-radius-sm);
    }

    .crow-palette {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 12px;
    }

    .crow-swatch {
      min-height: 68px;
      display: flex;
      align-items: flex-end;
      padding: 8px;
      border: 1px solid rgb(242 247 255 / 12%);
      border-radius: var(--crow-radius-sm);
      color: var(--crow-text-strong);
      font-family: var(--crow-font-mono);
      font-size: 8px;
      text-shadow: 0 1px 3px rgb(0 0 0 / 86%);
    }

    .crow-pack-links {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
    }

    .crow-pack-links a {
      min-height: 38px;
      display: inline-flex;
      align-items: center;
      padding: 0 12px;
      color: var(--crow-text-default);
      text-decoration: none;
      background: var(--crow-bg-raised);
      border: 1px solid var(--crow-border-default);
      border-radius: var(--crow-radius-sm);
      font-family: var(--crow-font-mono);
      font-size: 10px;
    }

    .crow-pack-links a:first-child {
      color: var(--crow-text-on-bright);
      background: var(--crow-cyan);
      border-color: var(--crow-cyan);
      font-weight: 700;
    }

    .crow-pack-links a:hover {
      border-color: var(--crow-cyan);
      box-shadow: var(--crow-shadow-cyan);
    }

    @media (pointer: fine) {
      body,
      .modal-overlay {
        cursor: url("/crow-theme/cursors/windows/normal.cur"), default;
      }

      a,
      button,
      select,
      label[for],
      [onclick],
      .suggestion,
      .conversation-item {
        cursor: url("/crow-theme/cursors/windows/link.cur"), pointer;
      }

      input,
      textarea,
      [contenteditable="true"] {
        cursor: url("/crow-theme/cursors/windows/text.cur"), text;
      }

      [draggable="true"] {
        cursor: url("/crow-theme/cursors/windows/move.cur"), move;
      }

      :disabled,
      [aria-disabled="true"] {
        cursor: url("/crow-theme/cursors/windows/unavailable.cur"), not-allowed;
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

      .welcome-actions {
        justify-content: center;
      }

      .crow-form-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .crow-system-grid {
        grid-template-columns: 1fr;
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

      .welcome-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .welcome .suggestions {
        grid-template-columns: 1fr;
      }

      .theme-pack-hero {
        min-height: 360px;
        align-items: flex-end;
        padding: 22px;
        background:
          linear-gradient(0deg, rgb(3 4 10 / 98%), rgb(3 4 10 / 20%) 76%),
          url("/crow-theme/assets/social/crow-family-banner.png") 29% center / cover no-repeat;
      }

      .crow-form-grid {
        grid-template-columns: 1fr;
      }

      .crow-palette {
        grid-template-columns: repeat(2, minmax(0, 1fr));
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

replaceRequired(
  "</body>",
  `  <script>
    function openCrowThemePack() {
      const modal = document.getElementById('crowThemeModal');
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      modal.querySelector('.modal-close')?.focus();
    }

    function closeCrowThemePack() {
      const modal = document.getElementById('crowThemeModal');
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }

    document.getElementById('crowThemeModal')?.addEventListener('click', (event) => {
      if (event.target.id === 'crowThemeModal') closeCrowThemePack();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.getElementById('crowThemeModal')?.classList.contains('open')) {
        closeCrowThemePack();
      }
    });
  </script>
</body>`,
);

for (const required of [
  "<title>Crow-GodMod3</title>",
  'data-crow-product="crow-godmod3"',
  'src="/crow-theme/assets/icons/app/crow-signal-app-rounded-256.png"',
  'url("/crow-theme/assets/product-variants/exports/crow-godmod3-1920x1080.png")',
  'src="/crow-theme/assets/mascots/masters/glitch-ascendant.png"',
  'href="/crow-theme/fonts/crow-signal.css"',
  'url("/crow-theme/cursors/windows/normal.cur")',
  'id="crowThemeModal"',
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
