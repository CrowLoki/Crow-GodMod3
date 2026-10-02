import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// vinext 1.0.1 embeds image-size 2.0.2 outside npm's dependency graph, so
// npm overrides and audit cannot repair or detect this copy. Its ICNS, HEIF,
// and JXL parsers are affected by GHSA-w3rx-r6r6-pgpr / GHSA-5p2g-fcmc-qvqq.
// Redirect that exact, reviewed bundle to the patched official package while
// preserving its three exports and vinext's THIRD_PARTY_LICENSES.md. Review
// and remove this workaround when vinext ships a patched bundled parser.
export const bundledImageSizePath =
  "dist/deps/.pnpm/image-size@2.0.2/deps/image-size/dist/index.js";
const upstreamSha256 =
  "456ef3528be51418bebdd975aac4b6f4345610964166d1492220b35d686c8d15";
export const imageSizeFacade =
  '// Crow-GodMod3: replace vinext 1.0.1 bundled image-size 2.0.2 with the patched official package.\n' +
  'export { default, imageSize, types } from "image-size";\n';

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

export async function patchVinextImageSize(root = projectRoot) {
  const vinextRoot = resolve(root, "node_modules", "vinext");
  const target = resolve(vinextRoot, bundledImageSizePath);
  const vinext = JSON.parse(
    await readFile(resolve(vinextRoot, "package.json"), "utf8"),
  );
  const imageSize = JSON.parse(
    await readFile(resolve(root, "node_modules", "image-size", "package.json"), "utf8"),
  );

  if (vinext.name !== "vinext" || vinext.version !== "1.0.1") {
    throw new Error("Review the bundled image-size workaround before changing vinext 1.0.1.");
  }
  if (imageSize.name !== "image-size" || imageSize.version !== "2.0.4") {
    throw new Error("The vinext image-size workaround requires the reviewed image-size 2.0.4 package.");
  }

  const content = await readFile(target, "utf8");
  if (content !== imageSizeFacade) {
    const sha256 = createHash("sha256").update(content).digest("hex");
    if (sha256 !== upstreamSha256) {
      throw new Error(
        `Refusing to patch an unexpected vinext bundled image-size file (SHA-256 ${sha256}).`,
      );
    }
  }

  // Resolve from the bundle's location, where the facade will actually run.
  // This also catches a nested package shadowing the intended root dependency.
  const resolvedPackage = createRequire(target).resolve("image-size");
  const expectedPackageRoot = resolve(root, "node_modules", "image-size");
  if (dirname(dirname(dirname(resolvedPackage))) !== expectedPackageRoot) {
    throw new Error("The vinext image-size facade would resolve an unexpected package location.");
  }

  if (content === imageSizeFacade) return { changed: false, target };
  await writeFile(target, imageSizeFacade, "utf8");
  return { changed: true, target };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { changed } = await patchVinextImageSize();
  console.log(changed
    ? "Patched vinext's bundled image-size with official image-size 2.0.4."
    : "vinext's bundled image-size already uses official image-size 2.0.4.");
}
