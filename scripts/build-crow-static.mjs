import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const upstreamPath = resolve(projectRoot, "vendor", "godmod3", "index.html");
const outputPath = resolve(projectRoot, "public", "crow-godmod3.html");

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
  <meta name="theme-color" content="#050711">
  <meta name="description" content="Crow-GodMod3 — a CrowClaw-themed multi-model AI research interface.">`,
);

replaceRequired("<title>G0DM0DƎ</title>", "<title>Crow-GodMod3</title>");
replaceRequired(
  '<link rel="icon" type="image/svg+xml" href="public/favicon.svg">',
  '<link rel="icon" type="image/webp" href="/crowclaw-mark.webp">',
);
replaceRequired(
  `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">`,
  '  <link href="/jetbrains-mono.css" rel="stylesheet">',
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
      --bg: #050711;
      --bg-secondary: #080b18;
      --primary: #7c5cff;
      --secondary: #1fb6ff;
      --accent: #171b3a;
      --text: #eef7ff;
      --text-dim: #8c9aba;
      --border: #29345f;
      --hover: #11162f;
      --danger: #ff4d67;
      --cyan: #39d9ff;
      --success: #32d6c6;
      --warning: #a5b4fc;
      --magenta: #d946ef;
    }`,
);

replaceRequired(
  `        <div class="logo">
          <span class="logo-text">G0DM0<span class="flipped-e">D</span><span class="flipped-e-soft">E</span></span>
        </div>`,
  `        <div class="logo">
          <img class="brand-mark" src="/crowclaw-mark.webp" alt="" aria-hidden="true">
          <span class="logo-text">Crow-GodMod3</span>
        </div>`,
);
replaceRequired(
  `          <div class="welcome-icon">🜏</div>
          <h2>G0DM0<span class="flipped-e">D</span><span class="flipped-e-soft">E</span></h2>
          <p>Open-source, privacy-respecting, liberated AI chat. {GODMODE:ENABLED}</p>`,
  `          <div class="welcome-icon">
            <img class="welcome-crow" src="/crowclaw-head.webp" alt="CrowClaw emblem">
          </div>
          <h2>Crow-GodMod3</h2>
          <p>Open-source, privacy-respecting multi-model AI. {CROW-GODMOD3:ENABLED}</p>`,
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

    /* CrowClaw visual identity layer */
    body {
      background:
        radial-gradient(circle at 78% 16%, rgba(124, 92, 255, 0.075), transparent 30%),
        radial-gradient(circle at 28% 84%, rgba(57, 217, 255, 0.06), transparent 28%),
        var(--bg);
    }

    .sidebar {
      background:
        linear-gradient(180deg, rgba(11, 16, 36, 0.98), rgba(5, 7, 17, 0.99));
    }

    .chat-header {
      background: rgba(8, 11, 24, 0.9);
      backdrop-filter: blur(16px);
    }

    .brand-mark {
      width: 34px;
      height: 34px;
      flex: 0 0 34px;
      border-radius: 10px;
      box-shadow:
        0 0 18px rgba(124, 92, 255, 0.26),
        0 0 32px rgba(57, 217, 255, 0.14);
    }

    .logo-text {
      font-size: 16px;
      letter-spacing: -0.35px;
      white-space: nowrap;
      background: linear-gradient(90deg, #eef7ff 0%, #7c5cff 50%, #39d9ff 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      text-shadow: none;
    }

    .welcome-icon {
      margin-bottom: 22px;
      line-height: 0;
    }

    .welcome-crow {
      width: 148px;
      height: 148px;
      object-fit: cover;
      border-radius: 30px;
      border: 1px solid rgba(124, 92, 255, 0.34);
      box-shadow:
        0 0 0 7px rgba(31, 182, 255, 0.08),
        0 0 42px rgba(124, 92, 255, 0.18),
        0 0 70px rgba(57, 217, 255, 0.1);
    }

    .welcome h2 {
      background: linear-gradient(90deg, #eef7ff 0%, #7c5cff 52%, #39d9ff 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      text-shadow: none;
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
      box-shadow: 0 0 22px rgba(124, 92, 255, 0.14);
    }

    @media (max-width: 480px) {
      .welcome-crow {
        width: 112px;
        height: 112px;
        border-radius: 24px;
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
  html.match(/#d946ef\b|rgba\(\s*217\s*,\s*70\s*,\s*239\s*,/gi) ?? [];
if (restrainedMagentaMatches.length > 3) {
  throw new Error(
    `Magenta restraint audit failed: found ${restrainedMagentaMatches.length} visual tokens.`,
  );
}

for (const required of [
  "<title>Crow-GodMod3</title>",
  'src="/crowclaw-head.webp"',
  'src="/crowclaw-mark.webp"',
  "const APP_TELEMETRY_ENABLED = false;",
  'href="/ATTRIBUTION.md"',
  "--bg: #050711;",
  "--primary: #7c5cff;",
  "--secondary: #1fb6ff;",
  "--cyan: #39d9ff;",
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
