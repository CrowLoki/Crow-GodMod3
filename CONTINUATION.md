# Crow-GodMod3 continuation

Reconciled **2 October 2026 (Australia/Sydney)**. This is the current entry point
for this project. Recheck Git and runtime state when resuming; the evidence
below is dated. Historical handoffs remain provenance, not current instructions.

## Scope and current checkpoint

This continuation reconciled the existing work, upgraded the dependency tree,
and repaired defects in the existing modality and local-runtime UI. It adds no
new Phase 2 feature set. Crow-GodMod3 remains independently deployable; no
deployment or sibling-project edit was made.

| Item | Verified state |
| --- | --- |
| Canonical checkout | `C:\Users\djdar\Documents\Crow-GodMod3` |
| Repository | `https://github.com/CrowLoki/Crow-GodMod3.git` |
| Working branch | `codex/next-authorized-slice` |
| Starting source baseline | `b3bf2efff92718ef0503e28241c8bc4a79d442fa` |
| Remote state at checkpoint | Live `git ls-remote` returned that baseline SHA for `main` and `codex/next-authorized-slice`; local `main` and both tracking refs agree |
| Latest integration | [PR #23](https://github.com/CrowLoki/Crow-GodMod3/pull/23), merged 23 August 2026 |
| CI for main | [Run 32617251823](https://github.com/CrowLoki/Crow-GodMod3/actions/runs/32617251823), success for `b3bf2ef`; historical CI, supplemented by fresh local checks below |
| Open PRs / issues | None returned by live GitHub queries on 2 October 2026 |
| Entry state | Clean working tree before this reconciliation |
| Continuation delivery | Local commit on `codex/next-authorized-slice` contains this checkpoint, source, tests, and generated assets; use `git log -1` for its exact SHA. No push, merge, or deployment is included in this checkpoint. |

The current chat runs in the canonical Documents checkout. The older
`Crow-GodMod3 Project Continuation` chat
(`01a01da4-bd91-7293-aefb-a87d6e1d59fc`) still reports the `de82` worktree path.
Its previous app/task-repair detour is not a prerequisite to continuing here.
Do not repair application databases or replay old repair launchers as project
work. This pass did not alter chat metadata.

## Existing source to preserve

- Faithful standalone derivative, direct root-page serving, Crow identity,
  AGPL-3.0 notices, and packaged corresponding source.
- OpenRouter free-model allowlist, provider-qualified per-mode choices, local
  runtime discovery, unlimited user-selected model pools, independent runtime
  profiles, frozen request profiles, LM Studio reasoning handling, and runtime
  status/diagnostics.
- PR #23 integrated the already existing gateway/modality work (`806be66`),
  startup/discovery fix (`4796b11`), and Crow Signal identity (`e08d9cb`). These
  are landed work, not three unpushed commits waiting to be recovered.
- Text, image, and audio modality code is present. Video output is explicitly
  unavailable. Browser/provider/device acceptance is incomplete.

`vendor/godmod3/index.html` remains the protected upstream snapshot from
`f6301765fb90eb7b336bdf365319cd2fe44b1187`. Derivative edits belong in
`scripts/build-crow-static.mjs` and the maintained supporting scripts, followed
by regeneration. Its local SHA-256 at this checkpoint is
`0137c5c983ca795c2d65c4fec1dcc29cf373e37413d1bfa9db0554cb1d4aa06c`.
Application telemetry stays disabled. Preserve the exact product name and the
black, magenta, violet, cyan, and teal palette specified in `AGENTS.md`.

## Project boundaries

| Project | Relationship to Crow-GodMod3 |
| --- | --- |
| CrowClaw | Shared visual identity; any future integration is an optional plugin. No required application coupling or plugin implementation is established here. |
| Crow's Free AI Model Access | Owns the optional Crow Free AI Gateway. Crow-GodMod3 consumes its loopback API; its process, adapters, and provider acceptance belong to that separate project. |
| CrowBot, CrowBot-Free-Models, and other projects | Separate repositories and ongoing work. They were not reconciled or changed by this pass. |

## Preserved work reconciled

Preserve these objects; do not restore them wholesale or delete them during a
routine continuation:

- Stash `6c8506d6ca9dc7428eabc148e5fc377477f51ad1`, named
  `codex/workflow-repair-preservation-2026-08-23`, remains unapplied. It includes
  substantive edits directly to the protected vendor snapshot, matching build
  and generated-output changes, and removal of hosting/build configuration.
  The large vendor diff includes line-ending churn but is not only whitespace.
  PR #23 explicitly excluded this state. Its authorization and value are not
  established; any future proposal must be reviewed separately and implemented
  through the maintained build layer.
- Detached worktree `C:\Users\djdar\.codex\worktrees\de82\Crow-GodMod3`
  is clean at `749c641666d3a6a33c27647a2c95515c18b4953f`. Its only difference
  from the source baseline is `Crow-GodMod3 KIMI-K3-HANDOFF-2026-08-17.md`.
  It contains no additional product implementation. The stash's untracked
  parent contains the identical historical handoff blob
  `c59e5c2498a2b7f29f210eadba8fc995f34d06c6`.
- Older local topic tips are squash-merged equivalents, not missing work.
  `git cherry`, matching trees, ancestry, and GitHub PR state were checked:

| Branch under `codex/` | Topic tip | Landed PR / commit |
| --- | --- | --- |
| `openrouter-free-models` | `a6205d1` | #5 / `3ba940b` |
| `local-runtime-presets` | `fb46527` | #6 / `0bc62bc` |
| `per-mode-model-pickers` | `e2e0d91` | #7 / `fe44e1e` |
| `fix-local-ultra-timeout` | `9a63d99` | #8 / `3f35807` |
| `lm-studio-model-matrix` | `ee2b2aa` | #9 / `a6484a0` |

Closed Dependabot PRs #17-22 are historical proposals, not merged maintenance.
Re-evaluate against today's dependency tree instead of reopening or applying
those old changes blindly.

## Maintenance delivered in this continuation

- Updated the compatible application/toolchain pins and lockfile. A fresh
  `npm ci --no-fund` completed and the audit dropped from 24 findings
  (including 1 critical) to zero. No forced audit fix was used.
- vinext 1.0.1 still embeds image-size 2.0.2 outside npm's dependency graph.
  `scripts/patch-vinext-image-size.mjs` verifies the exact package versions and
  original file hash before redirecting that bundled module to pinned official
  image-size 2.0.4. Install and build hooks apply/verify the idempotent repair;
  unknown versions or source fail closed. The upstream third-party notice stays
  intact. Tests import the real bundled path and check malformed ICNS, HEIF,
  and JPEG XL inputs in bounded subprocesses. See
  [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) and
  [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq).
- Narrow overrides update drizzle-kit's older esbuild integration and satori's
  fflate dependency. A real temporary Drizzle schema generated SQLite DDL,
  and the overridden esbuild passed synchronous/asynchronous transforms.
  No project database or tracked migration changed.
- Worker tests now run the unmodified production bundle in Miniflare/workerd,
  including GET/HEAD, exact assets, query forwarding, and no outbound requests.
  Node cannot directly execute the upgraded bundle's `cloudflare:` imports.
- Microphone policy is `microphone=(self)`. Modality requests capture their
  runtime/credentials once, support cancellation, release microphone tracks,
  downmix to signed 16-bit mono PCM, and reject over-limit gateway input.
  Relative audio URLs resolve against the request's frozen gateway origin;
  the media CSP permits loopback image/audio playback.
- Discovery excludes catalogue-only routes from chat and uses discovered
  capabilities for modality availability. Gateway prompt limits are 500
  characters; the current iflytek ASR route allows 320000 PCM bytes / 10 seconds.
- The provider warning refreshes after discovery; status labels describe
  configured models honestly. Diagnostic errors are scoped to the runtime
  that produced them. Header groups wrap at narrow widths and media sizes fit
  their containers. Local-only copy explains that a gateway can call remote
  services.

## Fresh verification and its limits

Local checks use Node `v24.20.0` and npm `12.0.2`; CI uses Node 22.
The fresh install reapplied the guarded parser repair. npm reported blocked
optional install scripts under the workstation's existing policy; the tested
build and runtime binaries were usable without changing that global policy.

| Check | Result |
| --- | --- |
| `npm ci --no-fund` | Completed cleanly; audit 0 vulnerabilities |
| Integrated `npm test` | Build and all 94 tests passed; 0 failed, skipped, or cancelled |
| `npm run lint` | Exit 0; 0 errors, 8 warnings in injected modality functions and generated Worker declarations |
| Real Worker runtime checks | 4 assertions/subtests passed independently before the final build |
| Modality regressions | 42 tests passed independently, including cancellation, permission failure, cleanup, frozen credentials, URL handling, and gateway limits |
| Provider-status regressions | 3 new behavioral tests reproduced the old defects, then passed after regeneration |
| Local browser media | Chromium loaded the generated image and played returned audio; browser-intercepted gateway fixtures, not live provider generation |
| Browser microphone | Fake microphone recorded and produced PCM sent to the simulated transcription endpoint; transcript appeared for review without autosending |
| Browser microphone failure / cancellation | With browser permission set to denied, Chromium reported `Not supported`; the app recovered to text mode without a request. Main Stop cancelled a held speech response, restored the composer, and rejected its late result. Unit tests separately cover a rejected permission request. |
| Responsive browser layout | No horizontal overflow at 1440, 390, or 320 pixels; phone modality menu stays within the viewport and generated image fits |
| LM Studio backend | Real loopback `/v1/chat/completions` returned HTTP 200 with text from `llama-3.2-1b-instruct` |
| LM Studio browser access | Failed CORS: the live server returned no Access-Control-Allow-Origin for the page origin; configuration unchanged |
| Optional gateway / Ollama | Ports 8766 / 11434 refused connections; neither service started |
| Published page | HTTP 200; exact older `ad737d6` HTML, with microphone disabled; unchanged by this work |

Browser checks use the actual generated public files served on loopback with
the source Vercel headers. Screenshots/logs are local ignored files under
`output/playwright/`; they do not establish real provider/hardware acceptance.
The optional gateway source was read in its own checkout; no sibling files or
runtime configuration were changed. The gateway's current CORS allows loopback
page origins; the hosted Vercel origin is not currently allowed. Its dry-run
flag is not a network firewall and was not used to activate remote adapters.

The published body SHA-256 is
`77f10b15f911724f07949cd2d16654622725193ebab41c6977c9a34b91278259`.
This confirms page-content drift, independently of Git or CI status. A source
merge cannot by itself establish deployment or live-provider acceptance.

Known browser limitation retained from the upstream UI: shrinking an already
open desktop sidebar into a phone viewport can leave it covering the controls.
A fresh load at phone width collapses it correctly. The responsive checks above
used that normal phone startup state. Fixing resize/menu dismissal is a small
remaining UI task; it was not part of the header-overflow repair.

## Outstanding work and continuation order

1. **Resume the saved source checkpoint:** verify the local commit and clean
   working tree, then review/publish that branch through the normal source
   delivery workflow. Confirm hosting automation before any action that might
   deploy it. The Vercel project-detail connector returned incompatible schema
   errors, so its current Git deployment setting was not established. Do not
   reapply historical stashes or restart from the original 24-finding audit.
2. **Real local-provider browser acceptance:** LM Studio is reachable directly
   but needs an authorized CORS configuration change for browser chat. Recheck
   its actual state before altering it. A server-side response alone is not
   browser acceptance.
3. **Optional gateway acceptance:** when its owner authorizes starting the
   separate gateway and invoking selected providers, discover real capabilities
   and verify text/image/speech/transcription against those actual routes.
   Use a locally served app for its current CORS policy. The tests above prove
   app behavior against controlled responses, not current remote availability.
4. **Deployment when requested:** deploy the reviewed generated source, then
   verify the public HTML, headers, browser microphone permission, and actual
   provider paths. The current public page remains behind source.
5. **Further features:** no new Phase 2 feature set or CrowClaw plugin design
   was selected. Preserve standalone operation and optional project boundaries.

Cloudflare's retained scaffold has `observability.enabled: true` and a
placeholder D1 ID in `wrangler.jsonc`. That is hosting configuration, distinct
from disabled application telemetry; it is not evidence of an active approved
service. Do not deploy that scaffold or enable telemetry as part of routine
reconciliation.

## Resume commands

Read `AGENTS.md`, this file, and `docs/LOCAL_MODELS.md`, then establish current
state before editing:

```powershell
Set-Location C:\Users\djdar\Documents\Crow-GodMod3
git status --short --branch
git log -5 --oneline --decorate
git ls-remote --heads origin main codex/next-authorized-slice
git stash list
git worktree list
```

After the next implementation slice:

```powershell
npm run lint
npm test
npm run generate:static
git diff --exit-code -- public/crow-godmod3.html
git diff --check
```

For deliberate build-layer changes, review and include the regenerated HTML
before expecting the drift check to be clean. After guide changes, regenerate
and include `public/LOCAL_MODELS.md`. Update this checkpoint with the actual
new commit, fresh evidence, and remaining acceptance gaps at each safe point.
