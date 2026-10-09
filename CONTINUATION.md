# Crow-GodMod3 continuation

Reconciled **9 October 2026 (Australia/Sydney)**. This is the current entry point
for this project. Recheck Git and runtime state when resuming; the evidence
below is dated. Historical handoffs remain provenance, not current instructions.

## Scope and current checkpoint

### Current increment: independent public CrowBot AI and membership connections

Crow clarified on 9 October that this is a public website: visitors use their
own keys and memberships. Only standalone CrowBot AI is supplied without an
individual account. Crow then requested immediate website publication and stop;
the Windows-app request was withdrawn because it referred to another product.

CrowBot AI is a named model-picker choice backed by this project's own anonymous
implementation. Selected source modules were incorporated from the verified
Crow-owned provider revision f12ffe72e6877c055641da9ba965e8f82bbe34ae;
lib/crowbot/PROVENANCE.json records all 18 source-file hashes. There is no runtime
dependency on another repository, running app, owner account or provider key.
The protected upstream G0DM0D3 snapshot remains unchanged.

ChatGPT uses the legitimate OpenAI device-code flow observed in Hermes: explicit
account authorization, per-account model discovery, selectable reasoning, and
the Codex OAuth transport. Each visitor/account has separate AES-GCM encrypted
HttpOnly cookies, and switching selects only a connected account belonging to
that browser session. No owner membership or API key is a visitor fallback.
Inference uses the selected account; the native Codex image endpoint supplies
image generation. OpenRouter/Venice retain each visitor's own existing keys.
The session-encryption variable is sensitive Vercel configuration, never a
provider credential or source-controlled secret. Generic token/sampling controls
unsupported by the subscription route are not sent to it.

Fresh checks: 105 tests passed; lint passed with 0 errors and 11 warnings.
Real standalone anonymous text returned a completed answer, then actual Chrome
rendered a real answer through CrowBot AI. Account-session tampering, cross-account
cookie substitution, foreign origins, and absence of owner fallback have tests.
OpenAI device-code creation and the application's real sign-in UI worked.

Membership end-to-end acceptance is incomplete: the separate account selected
in Edge reached OpenAI's add-phone prerequisite. Crow's current number cannot
complete that check; do not bypass verification or claim the free/monthly usage
pool was tested. A prior local prototype verified seven Pro catalogue entries
and a Luna native shell call, but that cross-project prototype was removed and
does not prove the independent published membership route. The web implementation
exposes web search and native image generation; full local shell/MCP execution
is not implemented in the hosted website.

Production delivery is the merged revision of this increment. Read /api/status
for the current deployed source SHA and membership-configuration status, then
compare it with current main. The attached delivery PR and this chat's deployment
result carry live acceptance; the 2 October deployment table below is historical.
No new phone number, paid route, desktop installation, or sibling source/config
change occurred. Stop after publication as Crow requested.

This continuation reconciled the existing work, upgraded the dependency tree,
and repaired defects in the existing modality and local-runtime UI. That work
is published and merged through PR #24, with the real-runtime acceptance
follow-up delivered through [PR #25](https://github.com/CrowLoki/Crow-GodMod3/pull/25).
The local text acceptance record is merged through
[PR #26](https://github.com/CrowLoki/Crow-GodMod3/pull/26). The exact merged source
`d0936cf528ff7eed23fe36aedc4e4cd898d6347f` is now deployed to Vercel production
and passed the public-file and browser checks below. This adds no new Phase 2
feature set. Crow-GodMod3 remains independently deployable, and no
sibling-project source/configuration files were edited.

Crow explicitly authorized source publication, merge, Vercel deployment,
temporary LM Studio CORS changes, and the selected free-gateway tests. That
authorization persists; do not request it again. Deployment is complete. The
LM Studio policy limitation and remaining provider/device acceptance are
detailed below.

| Item | Verified state |
| --- | --- |
| Canonical checkout | `C:\Users\djdar\Documents\Crow-GodMod3` |
| Repository | `https://github.com/CrowLoki/Crow-GodMod3.git` |
| Resume branch | `main`; fetch and verify its current HEAD before continuing. The media-only discovery repair was delivered from `codex/runtime-acceptance-followup`. |
| Starting source baseline | `b3bf2efff92718ef0503e28241c8bc4a79d442fa` |
| Verified product-code baseline | `4c9d7a66e4949b2e2293b36a13acd9c9b98c60cb` from merged PR #25; later acceptance-evidence updates change documentation only |
| Deployed source | `d0936cf528ff7eed23fe36aedc4e4cd898d6347f` from merged PR #26; fetch and verify current `main` before resuming later documentation updates |
| Baseline integration | [PR #24](https://github.com/CrowLoki/Crow-GodMod3/pull/24), merged as `afed312` from head `2585f29` |
| Runtime acceptance follow-up | [PR #25](https://github.com/CrowLoki/Crow-GodMod3/pull/25), merged as `4c9d7a6` from head `083344d`; implementation commit `81753eef00fd0081c3410135b3c14cee40ae6143` |
| Local text acceptance record | [PR #26](https://github.com/CrowLoki/Crow-GodMod3/pull/26), merged as `d0936cf`, records real Ollama gateway backend/browser text acceptance and restored temporary services |
| CI | [PR #26 main run 36961423399](https://github.com/CrowLoki/Crow-GodMod3/actions/runs/36961423399) passed. [PR #25 run 36960731285](https://github.com/CrowLoki/Crow-GodMod3/actions/runs/36960731285), [its main run 36960816916](https://github.com/CrowLoki/Crow-GodMod3/actions/runs/36960816916), and PR #24 checks also passed |
| Production deployment | `dpl_BajjdbZxYgLXAEnZfi2WRpXAxkGb`, READY, with the production alias and exact `d0936cf` source confirmed by deployment details |
| Earlier open PR / issue query | None returned before PR #24 was opened; PRs #24, #25, and #26 have since been merged |
| Entry state for this deployment-evidence update | Clean working tree on synchronized `main` at `d0936cf` |
| Continuation delivery | Maintenance checkpoint `a10f2fb125c8e47e6f087b758846369875cd6bc2` and sidebar repair are in PR #24; PR #25 fixes media-only discovery; PR #26 records local text acceptance. This deployment-evidence refresh changes only `CONTINUATION.md` and `README.md`. |

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
  from the starting `b3bf2ef` source baseline is
  `Crow-GodMod3 KIMI-K3-HANDOFF-2026-08-17.md`.
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
- Real gateway acceptance found and fixed a media-only discovery defect. A
  reachable speech-only gateway now reports its advertised speech capability
  while keeping chat unavailable; catalog-only inventories stay out of chat.
  Empty or malformed inventories still fail. Missing image/ASR routes are
  labelled as unadvertised, rather than telling users to restart the gateway.
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
| Integrated `npm test` | Latest follow-up build and all 103 tests passed; 0 failed, skipped, or cancelled. PR #24 had 99 tests; the earlier a10f2fb checkpoint had 94. |
| `npm run lint` | Exit 0; 0 errors, 8 warnings in injected modality functions and generated Worker declarations |
| Real Worker runtime checks | 4 assertions/subtests passed independently before the final build |
| Modality regressions | 42 tests passed independently, including cancellation, permission failure, cleanup, frozen credentials, URL handling, and gateway limits |
| Provider-status regressions | All 7 behavioral tests passed, including valid media-only/catalog-only inventories and empty/malformed responses; media-only and catalog-only regressions failed before the fix |
| Local browser media | Chromium loaded the generated image and played returned audio; browser-intercepted gateway fixtures, not live provider generation |
| Browser microphone | Fake microphone recorded and produced PCM sent to the simulated transcription endpoint; transcript appeared for review without autosending |
| Browser microphone failure / cancellation | With browser permission set to denied, Chromium reported `Not supported`; the app recovered to text mode without a request. Main Stop cancelled a held speech response, restored the composer, and rejected its late result. Unit tests separately cover a rejected permission request. |
| Responsive browser layout | No horizontal overflow at 1440, 390, or 320 pixels; phone modality menu stays within the viewport and generated image fits |
| Responsive sidebar continuation | Five new behavioral regressions fail against a10f2fb and pass after repair. Actual browser verified desktop-to-phone collapse, close button, backdrop, Escape, focus restoration, and restoration of both open/closed desktop preferences across 1440/390/320 pixel transitions. |
| Earlier LM Studio backend test | Real loopback `/v1/chat/completions` returned HTTP 200 with text from `llama-3.2-1b-instruct`; this does not establish browser acceptance or a currently loaded model |
| LM Studio browser access | Failed CORS. The authorized temporary configuration change was rejected by automatic approval review before execution; original settings and unloaded inventory remain unchanged |
| Optional gateway live discovery | Started for the authorized test from the separate project's `05d517a` source; advertised only `edge-tts:neural-voices`, with `tts` and `voice_catalog` capabilities |
| Optional gateway live speech | Real Edge TTS request returned HTTP 200, `audio/mpeg`, 27648 bytes, using `en-AU-WilliamNeural`; a separate real browser request then decoded and played all 4.104 seconds, reaching `ended=true`, `readyState=4`, with no media error |
| Post-fix gateway browser acceptance | Real discovery reports reachable/no chat/speech output advertised; the chat warning remains accurate. A new speech request decoded and played all 2.352 seconds to `ended=true`, `readyState=4`, with no media error |
| Gateway local text backend | Installed Ollama 0.32.15 was temporarily started with existing `qwen2.5:0.5b`; no download. Exact gateway route `ollama:qwen2.5:0.5b` returned HTTP 200 JSON and valid SSE with a final stop and `[DONE]`. The separate streaming probe produced a model refusal to a benign prompt; transport success is not a model-quality guarantee. |
| Gateway local text browser | Actual Crow-GodMod3 at `127.0.0.1:4318`, local-only mode, and an explicit `ollama:qwen2.5:0.5b` pin displayed: "Yes, this local text connection works. Please provide the text for me to analyze." The composer returned to ready without an error. |
| Gateway image / vendor chat / ASR | Donor-gated image, vendor chat, and ASR routes were not invoked because the physical donor prerequisite in the sibling project's `AGENTS.md:6` was not established |
| Temporary gateway cleanup | Original stopped state restored: owned PID 37128 identity verified before stopping, process absent, no listener on 8766, and `/health` refuses connections. Test outputs/media and pre-existing sibling documentation edits preserved. |
| Temporary local-text services cleanup | Original stopped state restored after browser acceptance: gateway PID 46372, Ollama PID 40604, and its runner PID 26436 identities verified and processes stopped; ports 8766/11434 closed and HTTP probes refused. Selected model blobs retain their recorded sizes; outputs and original sibling edits preserved. |
| Production deployment acceptance | `output/deployment-acceptance-20261002.json` reports `accepted: true`: root plus all 36 public files returned HTTP 200 and matched deployed `d0936cf` source; all 37 resources accepted |
| Production HTML and headers | Root and direct HTML are 926752 bytes, SHA-256 `6664023a66432e2f1cd932203edb37ea7ede6c3e6e6f9fb5a5b1e792d7c915cb`; security headers and CSP match, including `microphone=(self)` |
| Production browser | Public page loaded the Crow-GodMod3 UI and research notice with telemetry off and no console warnings/errors. Research terms were not accepted and no new hosted-provider acceptance is claimed |

The earlier fixture and local gateway browser checks use actual generated
public files served on loopback with the source Vercel headers. Their
screenshots/logs are local ignored files under `output/playwright/`. Fixture
results establish app behavior; the separately identified live gateway tests
establish only their selected provider paths, not physical hardware acceptance.
The production browser check is a distinct observation of the public site.
The optional gateway was tested from its own checkout; no sibling source or
configuration files were changed. The gateway's current CORS allows loopback
page origins; the hosted Vercel origin is not currently allowed. Its dry-run
flag is not a network firewall and was not used to activate remote adapters.
The live speech result above is separate from the earlier browser fixtures.
The live browser speech evidence is saved locally in
`output/gateway-browser-acceptance-20261002.json`. These checks do not verify
physical speaker output or microphone input. Temporary-process cleanup is
recorded separately above.

Local text acceptance is saved in
`output/gateway-text-browser-acceptance-20261002.json`; the gateway checkout
has backend evidence in `output/crow-godmod3-ollama-text-20261002/`. The installed
small model was verified before starting temporary loopback services. No models
were downloaded, no persistent settings changed, and no paid routes were used.
The temporary process environment disabled Ollama cloud inference and pruning.

The sibling gateway currently copies provider-wide `chat` and `embedding`
capabilities to every Ollama model row (`src/providers/ollama.py:128` and
`src/gateway/app.py:209` in that project). Discovery therefore includes embedding
models as candidates. The verified text model was explicitly pinned; the
19-model inventory is not 19-model acceptance. Resolve that metadata limitation
in its owning project before relying on an unrestricted automatic gateway pool.
No sibling source was edited or embedding model invoked during these tests.

Production is [crow-godmod3.vercel.app](https://crow-godmod3.vercel.app).
The [deployment dashboard](https://vercel.com/djdarren2056-gmailcoms-projects/crow-godmod3/BajjdbZxYgLXAEnZfi2WRpXAxkGb)
and deployment-details response identify the READY production deployment and
exact `d0936cf528ff7eed23fe36aedc4e4cd898d6347f` source. The acceptance manifest is
`output/deployment-acceptance-20261002.json`; the deployment dashboard screenshot
is `output/vercel-production-20261002.jpg`. These evidence files remain local
ignored output, while this record preserves their outcome.

All 37 checked resources matched the source manifest. Eight text files match
their Git LF blobs rather than the Windows checkout's CRLF bytes; those line
ending differences are not deployment drift. The public root and direct
`/crow-godmod3.html` have the matching size/hash recorded above. AGPL attribution,
licence, and public corresponding source were also checked. This closes the
earlier `ad737d6` page-content drift. It establishes deployed content, headers,
and initial browser rendering, not fresh hosted inference, research-term
consent, physical microphone capture, or physical speaker output.

The retained upstream sidebar resize limitation is now repaired through the
maintained build layer. Mobile drawer state stays separate from the desktop
preference; crossing the 768px breakpoint closes the mobile drawer. Its close
button, backdrop, and Escape dismiss it and restore focus. Hidden sidebar
controls are inert. The upstream snapshot remains unchanged.

## Current live-action status and blockers

Rechecked after the successful authorized production deployment on
2 October 2026:

- PR #24 is merged at `afed312`, PR #25 at `4c9d7a6`, and PR #26 at `d0936cf`.
  Source delivery and CI passed; READY production deployment
  `dpl_BajjdbZxYgLXAEnZfi2WRpXAxkGb` now serves exact `d0936cf` content at the
  production alias. The public-file and browser evidence above independently
  verifies the deployment; it is not inferred from the merge.
- There is no current Vercel authentication blocker. The plugin already had
  authenticated read access, while its deploy and build-log methods were
  unavailable and its project-detail schema was broken. Separate Google
  dashboard sign-in completed. The GitHub source repository has been connected
  since 29 July; why the earlier pushes/merges did not deploy automatically was
  not established.
  Earlier cached CLI token and dashboard sign-in failures are historical, not
  current prerequisites. Do not repeat unavailable methods or infer a broken
  GitHub connection. No authentication secrets are recorded here.
- The temporary LM Studio CORS change is already authorized by Crow, but
  automatic approval review rejected the action before execution with the
  generic reason `blocked by policy`. No more specific reason was provided.
  No backup was created and no configuration change, restart, or retry through
  another mechanism occurred. Do not bypass that rejection. LM Studio remains
  bound to `127.0.0.1:1234`, with `cors: false`, JIT loading enabled, and the same
  19 installed entries (12 language models, 7 embedding models), all unloaded.
  Its missing CORS response and HTTP 400 chat preflight leave browser chat
  acceptance unresolved. No same-origin proxy was added.
- The optional gateway test is already authorized and was started from
  `05d517a5937876d935d65fc7d82a4e84956fe4c1` in its separate checkout, preserving
  its pre-existing documentation changes. Live discovery and Edge TTS speech
  succeeded as recorded above. A later temporary start of installed Ollama
  established backend and actual browser text acceptance using the existing
  `qwen2.5:0.5b` model. Image, vendor chat, and ASR were not called: the physical donor
  prerequisite in that project's `AGENTS.md:6` was not established. No sibling source or
  configuration was edited. Real browser speech playback passed before and
  after the media-only discovery repair. Process cleanup is recorded above.

## Outstanding work and continuation order

1. **Real local-provider browser acceptance:** LM Studio CORS remains unchanged
   because automatic approval review rejected the authorized mutation. Resolve
   that policy limitation through the permitted workflow before performing the
   controlled change; do not retry through another mechanism to bypass it. If
   a later permitted test changes settings, restore their original values and
   verify restoration. Backend HTTP 200 alone is not browser acceptance.
2. **Remaining gateway capabilities:** local Ollama text and Edge TTS speech
   passed backend and browser acceptance in this pass. Donor-gated image,
   vendor chat, and ASR require the sibling project's physical donor prerequisite,
   which was not established in this pass.
   The provider-wide Ollama capability metadata also needs correction in its
   owning project before broad automatic model selection. Do not infer
   current availability from hardcoded routes or prior fixtures. Preserve the
   separate project's ownership and existing no-paid-route scope.
3. **Further features:** no new Phase 2 feature set or CrowClaw plugin design
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
git ls-remote --heads origin main codex/runtime-acceptance-followup
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
