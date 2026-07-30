import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const publicEntry = new URL("../public/crow-godmod3.html", import.meta.url);
const publicTheme = new URL("../public/crow-theme/", import.meta.url);
const sourceTheme = new URL("../brand-system/", import.meta.url);

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
  assert.match(html, /crow-mascot-v3\.png/);
  assert.doesNotMatch(
    html,
    /(?:Core Architect|Field Operator|Glitch Ascendant|Pet Companion|crow-head-identity-v2\.png|(?:core-architect|field-operator|glitch-ascendant|pet-companion)(?:-v2)?\.png)/i,
  );
  assert.match(html, /fonts\/bitfeather\/crow-bitfeather\.css/);
  assert.match(html, /cursors\/v0\.5\/src\/32\/normal\.png/);
  assert.match(html, /cursors\/v0\.5\/src\/32\/link\.png/);
  assert.match(html, /cursors\/v0\.5\/src\/32\/text\.png/);
  assert.doesNotMatch(
    html,
    /fonts\/crow-signal\.css|cursors\/windows\/normal\.cur|Crow-Signal-Windows-v0\.2\.0|Crow-Talon-Windows-v0\.2\.0/,
  );
  assert.match(html, /id="crowThemeModal"/);
  assert.match(html, /ULTRAPLINIAN/);
  assert.match(html, /PARSELTONGUE/);
  assert.match(html, /OpenRouter/);
  assert.match(html, /const APP_TELEMETRY_ENABLED = false;/);
  assert.doesNotMatch(html, /<iframe\b/i);
});

test("contains no orange, amber, yellow, or gold visual colour tokens", async () => {
  const html = await readFile(publicEntry, "utf8");
  const forbidden =
    /#(?:f59e0b|f97316|fbbf24|ff6600|ff7b00|ff9900|ffa500|ffaa00|ffb733|ffcc00|ffd700)\b|rgba\(\s*255\s*,\s*(?:100|102|123|153|165|170|204|215)\s*,|rgba\(\s*251\s*,\s*191\s*,\s*36|rgba\(\s*249\s*,\s*115\s*,\s*22|rgba\(\s*245\s*,\s*158\s*,\s*11/gi;
  assert.doesNotMatch(html, forbidden);
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

test("ships the complete Crow Theme source and generated site catalogue", async () => {
  const requiredThemeFiles = [
    // Sole active mascot.
    "assets/mascots/masters/crow-mascot-v3.png",
    // Retained byte-for-byte as legacy/reference artwork, never active forms.
    "assets/mascots/masters/core-architect.png",
    "assets/mascots/masters/field-operator.png",
    "assets/mascots/masters/glitch-ascendant.png",
    "assets/mascots/masters/pet-companion.png",
    "assets/mascots/masters/crow-head-identity-v2.png",
    "assets/mascots/masters/core-architect-v2.png",
    "assets/mascots/masters/field-operator-v2.png",
    "assets/mascots/masters/glitch-ascendant-v2.png",
    "assets/mascots/masters/pet-companion-v2.png",
    "assets/product-variants/exports/crow-godmod3-1200x630.png",
    "assets/product-variants/exports/crow-godmod3-1920x1080.png",
    "assets/backgrounds/void-grid-neutral.png",
    "assets/icons/favicon.ico",
    "fonts/bitfeather/crow-bitfeather.css",
    "fonts/bitfeather/woff2/CrowBitfeatherDisplay-Bold.woff2",
    "fonts/bitfeather/woff2/CrowBitfeatherMono-Regular.woff2",
    "fonts/bitfeather/specimens/crow-bitfeather-v0.3.0.png",
    "cursors/v0.5/src/32/normal.png",
    "cursors/v0.5/src/32/link.png",
    "cursors/v0.5/src/32/text.png",
    "cursors/v0.5/windows/normal.cur",
    "cursors/v0.5/windows/link.cur",
    "cursors/v0.5/windows/busy.ani",
    "cursors/v0.5/previews/crow-talon-v0.5-preview.png",
    "downloads/Crow-Bitfeather-Windows-v0.3.0.zip",
    "downloads/Crow-Talon-Windows-v0.5.0.zip",
    "tokens/crow-theme.css",
    "tokens/crow-theme.json",
    "tokens/crow-theme.ts",
    "docs/BRAND-GUIDE.md",
    "docs/MASCOT-GUIDE.md",
    "provenance/SOURCES.md",
    "brand-manifest.json",
    "checksums.sha256",
  ];

  for (const relativePath of requiredThemeFiles) {
    const [sourceFile, publicFile] = await Promise.all([
      readFile(new URL(relativePath, sourceTheme)),
      readFile(new URL(relativePath, publicTheme)),
    ]);
    assert.deepEqual(
      publicFile,
      sourceFile,
      `Generated theme file differs byte-for-byte: ${relativePath}`,
    );
  }

  const catalogue = await readFile(new URL("index.html", publicTheme), "utf8");
  assert.match(catalogue, /The complete Crow system/);
  assert.match(catalogue, /crow-mascot-v3\.png/);
  assert.doesNotMatch(
    catalogue,
    /(?:Core Architect|Field Operator|Glitch Ascendant|Pet Companion|crow-head-identity-v2\.png|(?:core-architect|field-operator|glitch-ascendant|pet-companion)(?:-v2)?\.png)/i,
  );
  assert.match(catalogue, /Crow Bitfeather v0\.3/);
  assert.match(catalogue, /Crow Talon v0\.5/);
  assert.match(catalogue, /Crow-Bitfeather-Windows-v0\.3\.0\.zip/);
  assert.match(catalogue, /Crow-Talon-Windows-v0\.5\.0\.zip/);
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
