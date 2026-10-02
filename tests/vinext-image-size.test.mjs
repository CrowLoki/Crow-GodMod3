import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  bundledImageSizePath,
  imageSizeFacade,
  patchVinextImageSize,
} from "../scripts/patch-vinext-image-size.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const bundledParser = new URL(`../node_modules/vinext/${bundledImageSizePath}`, import.meta.url);

function box(name, payload = Buffer.alloc(0), declaredSize = payload.length + 8) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(declaredSize);
  header.write(name, 4, "ascii");
  return Buffer.concat([header, payload]);
}

function heif(declaredImageSize = 20) {
  const dimensions = Buffer.alloc(12);
  dimensions.writeUInt32BE(64, 4);
  dimensions.writeUInt32BE(32, 8);
  return Buffer.concat([
    box("ftyp", Buffer.from("mif1")),
    box("meta", Buffer.concat([
      Buffer.alloc(4),
      box("iprp", box("ipco", box("ispe", dimensions, declaredImageSize))),
    ])),
  ]);
}

// The malformed inputs exercise the zero-length entries that previously kept
// the ICNS/HEIF/JXL parsing loops from advancing. A subprocess deadline and
// memory cap make a regression fail the test without hanging the test runner.
function parseInBoundedProcess(input) {
  const result = spawnSync(process.execPath, [
    "--max-old-space-size=96",
    "--input-type=module",
    "--eval",
    `const parser = await import(process.argv[1]);
     try {
       console.log(JSON.stringify({ value: parser.imageSize(Buffer.from(process.argv[2], "base64")) }));
     } catch (error) {
       console.log(JSON.stringify({ error: error.message }));
     }`,
    bundledParser.href,
    input.toString("base64"),
  ], {
    cwd: projectRoot,
    timeout: 3000,
    maxBuffer: 64 * 1024,
    windowsHide: true,
    encoding: "utf8",
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("vinext uses the patched package through its actual bundled import path", async () => {
  assert.equal(await readFile(bundledParser, "utf8"), imageSizeFacade);
  const installed = await import(bundledParser.href);
  const official = await import("image-size");
  assert.deepEqual(Object.keys(installed).sort(), ["default", "imageSize", "types"]);
  assert.equal(installed.imageSize, official.imageSize);
  assert.equal(installed.default, official.default);
  assert.equal(installed.types, official.types);
  assert.equal((await patchVinextImageSize()).changed, false);
});

test("patched bundled parser preserves valid PNG and HEIF dimensions", () => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1sAAAAASUVORK5CYII=",
    "base64",
  );
  assert.deepEqual(parseInBoundedProcess(png).value, { width: 1, height: 1, type: "png" });
  assert.deepEqual(parseInBoundedProcess(heif()).value, { width: 64, height: 32, type: "mif1" });
});

test("patched bundled parser rejects zero-length ICNS, HEIF and JXL entries promptly", () => {
  const icns = Buffer.alloc(16);
  icns.write("icns");
  icns.writeUInt32BE(icns.length, 4);
  icns.write("ic07", 8);
  const jxl = Buffer.concat([
    box("JXL ", Buffer.from([13, 10, 135, 10])),
    box("ftyp", Buffer.from("jxl ")),
    box("jxlp", Buffer.alloc(4), 0),
  ]);
  for (const [format, input] of [["ICNS", icns], ["HEIF", heif(0)], ["JXL", jxl]]) {
    const result = parseInBoundedProcess(input);
    assert.match(result.error ?? "", /invalid|unsupported/i, format);
    assert.equal(result.value, undefined, format);
  }
});

test("patch refuses unreviewed versions and content without changing them", async () => {
  const root = await mkdtemp(join(tmpdir(), "crow-godmod3-vinext-patch-"));
  const target = join(root, "node_modules", "vinext", bundledImageSizePath);
  const vinextPackage = join(root, "node_modules", "vinext", "package.json");
  const imageSizePackage = join(root, "node_modules", "image-size", "package.json");
  try {
    await mkdir(dirname(target), { recursive: true });
    await mkdir(dirname(imageSizePackage), { recursive: true });
    await writeFile(imageSizePackage, JSON.stringify({ name: "image-size", version: "2.0.4" }));
    await writeFile(vinextPackage, JSON.stringify({ name: "vinext", version: "1.0.2" }));
    await writeFile(target, "unexpected bundle");
    await assert.rejects(patchVinextImageSize(root), /before changing vinext/);
    await writeFile(vinextPackage, JSON.stringify({ name: "vinext", version: "1.0.1" }));
    await assert.rejects(patchVinextImageSize(root), /unexpected vinext bundled/);
    await writeFile(imageSizePackage, JSON.stringify({ name: "image-size", version: "2.0.2" }));
    await assert.rejects(patchVinextImageSize(root), /reviewed image-size 2\.0\.4/);
    assert.equal(await readFile(target, "utf8"), "unexpected bundle");
  } finally {
    assert.equal(dirname(root), resolve(tmpdir()));
    assert.match(basename(root), /^crow-godmod3-vinext-patch-/);
    await rm(root, { recursive: true, force: true });
  }
});
