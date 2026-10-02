# Crow-GodMod3

A faithful static derivative of
[G0DM0D3](https://github.com/elder-plinius/G0DM0D3), rebranded with the
CrowClaw visual identity.

- Live site: [crow-godmod3.vercel.app](https://crow-godmod3.vercel.app)
- Corresponding source:
  [CrowLoki/Crow-GodMod3](https://github.com/CrowLoki/Crow-GodMod3)

## Project status

This repository is an ongoing project.

- **Continue here:** [CONTINUATION.md](CONTINUATION.md) records the verified
  source baseline, preserved work, deployment differences, checks, and next
  steps. Read it before resuming development.
- **Phase 1:** the standalone derivative and CrowClaw identity are implemented;
  browser, provider, and device acceptance must be established separately.
- **Existing Phase 2 foundation:** local-runtime profiles and model pools,
  diagnostics, the optional Crow Free AI Gateway preset, modality switching,
  and the Crow Signal identity layer are already in the source through
  [PR #23](https://github.com/CrowLoki/Crow-GodMod3/pull/23).
  Dependency maintenance and modality/sidebar repairs are merged through
  [PR #24](https://github.com/CrowLoki/Crow-GodMod3/pull/24).
  Further Phase 2 features require an explicit request.
- **CrowClaw:** keep Crow-GodMod3 independently usable while making it available
  as an optional CrowClaw plugin in a future phase.

As checked on **2 October 2026**, the public site's HTML still matches the
older `ad737d6` source revision. PR #24 merged at `afed312`, including the later
gateway, modality, identity, dependency, and sidebar work. PR and main CI passed;
the maintained build passes 103 tests and lint reports 0 errors / 8 warnings.
Vercel deployment is already authorized but awaits authenticated access through
its two-factor sign-in step. No new deployment was observed after push/merge.

The optional gateway returned real Edge TTS audio, and browser generation,
decoding, and playback passed. The media-only discovery follow-up accurately
reports available speech while keeping chat unavailable. The gateway's original
stopped state is restored and its test media is preserved. LM Studio browser
chat remains blocked by unchanged CORS after automatic approval review rejected
the authorized temporary setting change. See [CONTINUATION.md](CONTINUATION.md)
for the exact evidence, remaining access requirements, and capability limits.

## Provenance

- The live site was mirrored with HTTrack and compared with its public source.
- `vendor/godmod3/index.html` is the unmodified upstream snapshot from commit
  `f6301765fb90eb7b336bdf365319cd2fe44b1187`.
- `scripts/build-crow-static.mjs` applies the deterministic Crow-GodMod3 brand,
  palette, privacy, and attribution layer.
- The generated application is served directly at `/` from
  `public/crow-godmod3.html`; there is no iframe or imitation shell.
- Application telemetry is disabled. Provider requests still go to the
  provider or local endpoint configured by the user.
- Local runtime presets connect directly to Ollama, LM Studio, Docker Model
  Runner, vLLM, llama.cpp, Crow Free AI Gateway, or another OpenAI-compatible
  loopback server. A gateway may forward requests to remote providers; a
  loopback connection alone does not guarantee on-device inference. See the
  [local-model setup guide](docs/LOCAL_MODELS.md).

## CrowClaw styling

CrowClaw styling is applied directly to the standalone Crow-GodMod3
application. The current build contains only the web assets the application
uses: Crow Bitfeather and Crow Signal fonts, the five 32px Crow Talon cursor
roles, Crow-GodMod3 icons and imagery, and the shared colour tokens.

The site does not publish a theme-pack catalogue or downloadable Windows
installer packages. The upstream snapshot remains unchanged.

## Development

```powershell
npm ci
npm run dev
```

Build and test:

```powershell
npm run lint
npm test
npm run generate:static
git diff --exit-code -- public/crow-godmod3.html
```

The generator also publishes `docs/LOCAL_MODELS.md` as
`public/LOCAL_MODELS.md`. Keep both in sync after guide edits. Dependencies
remain pinned in `package-lock.json`. `npm ci` applies a guarded compatibility
patch that routes vinext 1.0.1's bundled image parser to the separately pinned
`image-size` 2.0.4; builds verify the patch again. The patch refuses unexpected
versions or bundled source instead of silently changing an unknown release.
Runtime tests use Miniflare/workerd to execute the generated Worker and serve
its actual assets. See `CONTINUATION.md` for the dated audit, browser checks,
and remaining live-provider and deployment acceptance.

## Licence

This modified derivative remains under the GNU Affero General Public License
v3.0. See `LICENSE`, `public/ATTRIBUTION.md`, and the unmodified upstream
material under `vendor/godmod3/`. Original Crow Brand System assets are covered
by the separate notice in [`brand-system/LICENSE.md`](brand-system/LICENSE.md).
