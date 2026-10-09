# Crow-GodMod3

A faithful static derivative of
[G0DM0D3](https://github.com/elder-plinius/G0DM0D3), rebranded with the
CrowClaw visual identity.

- Live site: [crow-godmod3.vercel.app](https://crow-godmod3.vercel.app)
- Corresponding source:
  [CrowLoki/Crow-GodMod3](https://github.com/CrowLoki/Crow-GodMod3)

## Project status

This repository is an ongoing project.

**CrowBot AI** is the site's standalone, anonymous AI choice. Visitors can also
connect their own **ChatGPT membership**, select a connected account, and choose
its available model and reasoning level. OpenRouter and Venice continue using
each visitor's own keys. See the
[connection guide](docs/LOCAL_MODELS.md#crowbot-ai-and-chatgpt-membership).
No owner membership or provider key supplies visitor membership requests.
OAuth sessions are encrypted in HttpOnly cookies, independently per account.
Membership usage counts against the account the visitor selected.

- **Continue here:** [CONTINUATION.md](CONTINUATION.md) records the verified
  source baseline, preserved work, production deployment, checks, and next
  steps. Read it before resuming development.
- **Phase 1:** the standalone derivative and CrowClaw identity are implemented;
  browser, provider, and device acceptance must be established separately.
- **Existing Phase 2 foundation:** local-runtime profiles and model pools,
  diagnostics, the optional Crow Free AI Gateway preset, modality switching,
  and the Crow Signal identity layer are already in the source through
  [PR #23](https://github.com/CrowLoki/Crow-GodMod3/pull/23).
  Dependency maintenance and modality/sidebar repairs are merged through
  [PR #24](https://github.com/CrowLoki/Crow-GodMod3/pull/24).
  Real gateway acceptance and the media-only discovery repair are recorded in
  [PR #25](https://github.com/CrowLoki/Crow-GodMod3/pull/25).
  Local Ollama gateway text acceptance is recorded in
  [PR #26](https://github.com/CrowLoki/Crow-GodMod3/pull/26).
  Further Phase 2 features require an explicit request.
- **CrowClaw:** keep Crow-GodMod3 independently usable while making it available
  as an optional CrowClaw plugin in a future phase.

As checked on **2 October 2026**, Vercel production is READY at source
`d0936cf528ff7eed23fe36aedc4e4cd898d6347f` from merged PR #26. The root page and
all 36 public files returned HTTP 200 and matched the source manifest; deployed
headers and CSP match, including `microphone=(self)`. The public browser loaded
the Crow-GodMod3 UI and research notice with telemetry off and no console
warnings or errors. This verifies deployment and initial rendering; research
terms were not accepted and no new hosted-provider acceptance is claimed.
Main CI passed, the maintained build passes 103 tests, and lint reports
0 errors / 8 warnings.

The optional gateway passed real browser text using installed Ollama
`qwen2.5:0.5b`, plus Edge TTS generation, decoding, and playback. No model download
or paid route was used. The media-only discovery repair accurately reports
available speech when no chat runtime is running. Pin a verified gateway text
model: its provider-wide capability metadata currently also lists embedding
models as chat candidates. Temporary services are restored after testing and
test media is preserved. LM Studio browser
chat remains blocked by unchanged CORS after automatic approval review rejected
the authorized temporary setting change. See [CONTINUATION.md](CONTINUATION.md)
for the exact deployment and runtime evidence, remaining policy prerequisite,
and capability limits. The physical donor prerequisite for the sibling
gateway's image, vendor chat, and ASR routes was not established in this pass.

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
its actual assets. See `CONTINUATION.md` for the dated audit, deployed-source
verification, browser checks, and remaining provider/device acceptance.

## Licence

This modified derivative remains under the GNU Affero General Public License
v3.0. See `LICENSE`, `public/ATTRIBUTION.md`, and the unmodified upstream
material under `vendor/godmod3/`. Original Crow Brand System assets are covered
by the separate notice in [`brand-system/LICENSE.md`](brand-system/LICENSE.md).
