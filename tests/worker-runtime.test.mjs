import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { Miniflare } from "miniflare";

const serverDirectory = fileURLToPath(new URL("../dist/server/", import.meta.url));
const publicEntry = new URL("../public/crow-godmod3.html", import.meta.url);

async function workerOptions() {
  const config = JSON.parse(await readFile(resolve(serverDirectory, "wrangler.json"), "utf8"));
  // Miniflare 5 requires an explicit module manifest. These are the unmodified
  // files emitted by the production build, including its cloudflare: imports.
  const modules = Object.fromEntries(await Promise.all(
    (await readdir(serverDirectory, { recursive: true }))
      .filter((path) => /\.m?js$/.test(path))
      .map(async (path) => [path.replaceAll("\\", "/"), {
        type: "esm", contents: await readFile(resolve(serverDirectory, path), "utf8"),
      }]),
  ));
  const outboundRequests = [];
  return {
    outboundRequests,
    options: {
      host: "127.0.0.1",
      port: 0,
      cf: false,
      telemetry: { enabled: false },
      workers: [{
        config: {
          name: config.name,
          compatibilityDate: config.compatibility_date,
          compatibilityFlags: config.compatibility_flags,
          manifest: { mainModule: config.main, modulesRoot: serverDirectory, modules },
          env: { [config.assets.binding]: { type: "assets" } },
          assets: {
            hasUserWorker: true,
            directory: resolve(serverDirectory, config.assets.directory),
            htmlHandling: config.assets.html_handling,
            notFoundHandling: config.assets.not_found_handling,
            runWorkerFirst: config.assets.run_worker_first,
          },
        },
        dev: {
          outboundService: {
            type: "fetcher",
            handler(request) {
              outboundRequests.push(request.url);
              return new Response("Outbound network disabled in runtime tests", { status: 502 });
            },
          },
        },
      }],
    },
  };
}

test("serves the verified static clone in the built Worker runtime", async (t) => {
  const { options, outboundRequests } = await workerOptions();
  const assetRequests = [];
  const builtWorker = options.workers[0];
  // The normal runtime above uses the native ASSETS binding. This second copy
  // observes its request boundary while forwarding to that same real binding,
  // so query/method checks do not substitute a fabricated asset response.
  options.workers.push({
    config: {
      ...builtWorker.config,
      name: "crow-godmod3-request-observer",
      assets: undefined,
      env: {
        ASSETS: {
          type: "fetcher",
          async handler(request, miniflare) {
            assetRequests.push({ url: request.url, method: request.method });
            const { ASSETS } = await miniflare.getBindings(builtWorker.config.name);
            return ASSETS.fetch(request);
          },
        },
      },
    },
    dev: builtWorker.dev,
  });
  const runtime = new Miniflare(options);
  t.after(() => runtime.dispose());
  const response = await runtime.dispatchFetch("http://localhost/?source=test", {
    headers: { accept: "text/html" },
  });
  assert.equal(response.status, 200, response.status === 200 ? undefined : await response.clone().text());
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
  assert.equal(html, await readFile(publicEntry, "utf8"));

  await t.test("root HEAD returns the same asset headers and no body", async () => {
    const head = await runtime.dispatchFetch("http://localhost/?source=test", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("content-type"), response.headers.get("content-type"));
    assert.equal(head.headers.get("etag"), response.headers.get("etag"));
    assert.equal(await head.text(), "");
  });

  await t.test("built public asset routes serve their exact local files", async () => {
    for (const path of ["/crow-godmod3.html", "/LOCAL_MODELS.md", "/manifest.webmanifest", "/LICENSE.txt"]) {
      const asset = await runtime.dispatchFetch(`http://localhost${path}?source=test`);
      assert.equal(asset.status, 200, path);
      assert.equal(await asset.text(), await readFile(new URL(`../public${path}`, import.meta.url), "utf8"), path);
    }
  });

  await t.test("root rewrite preserves the query string and HTTP method", async () => {
    const worker = await runtime.getWorker("crow-godmod3-request-observer");
    for (const method of ["GET", "HEAD"]) {
      const result = await worker.fetch("http://localhost/?source=test", { method });
      assert.equal(result.status, 200);
      assert.equal(await result.text(), method === "GET" ? html : "");
    }
    assert.deepEqual(assetRequests, [
      { url: "http://localhost/crow-godmod3.html?source=test", method: "GET" },
      { url: "http://localhost/crow-godmod3.html?source=test", method: "HEAD" },
    ]);
  });

  assert.deepEqual(outboundRequests, [], "Serving the standalone application must not make network requests");
});
