# Connect Crow-GodMod3 to local models

Crow-GodMod3 can connect directly from the browser to an OpenAI-compatible
server running on the same computer. The connection is restricted to
`localhost` and `127.0.0.1`.

Supported presets:

- Crow Free AI Gateway — `http://127.0.0.1:8766/v1`
- Ollama — `http://localhost:11434/v1`
- LM Studio — `http://localhost:1234/v1`
- Docker Model Runner — `http://localhost:12434/engines/v1`
- vLLM — `http://localhost:8000/v1`
- llama.cpp — `http://localhost:8080/v1`
- Custom OpenAI-compatible loopback server

## Connect from Crow-GodMod3

1. Start the runtime and load, pull, or serve at least one chat-capable model.
2. Open **Settings → API Keys → Local Model Runtimes**.
3. Select the runtime preset. You can edit its base URL if you use a different
   port.
4. Add the optional bearer token only when the local server requires one.
5. Click **Test & Discover Models**. Crow-GodMod3 reads the exact IDs returned
   by the runtime and excludes models that are explicitly identified as
   embedding, reranking, or catalogue-only routes. LM Studio uses its native capability metadata;
   other OpenAI-compatible runtimes retain unknown IDs so unusual chat models
   are not guessed away.
6. Enable **Local-only mode** to send model requests through the selected
   loopback runtime instead of calling OpenRouter or Venice directly.
   A gateway can forward those requests to remote providers. For on-device
   inference, select a model actually served on your own hardware and verify
   the runtime's routing.

The full discovered inventory remains available in the model controls. Under
**Settings → Strategies → Local models per question, by mode**, ULTRAPLINIAN,
PARSELTONGUE, and CLASSIC each have an independent pool. Every pool defaults to
the first local model. Users can tick any number of models, including the full
discovered inventory; Crow-GodMod3 applies no fixed model-count limit. The
runtime and the user's hardware determine how much work is practical.

## CrowBot AI and ChatGPT membership

Select **CrowBot AI** in the header to use the site's own standalone anonymous
AI. No membership, API key, sibling project or local provider app is required.

To use your own subscription, choose **Sign in with ChatGPT**. Open the official
OpenAI verification link, select your account, and enter the displayed device
code. The website then loads that account's available models. Choose a model in
the header and its supported reasoning level. Connect another account from
Settings, then use the account selector to switch; its own permissions and usage
limits apply. There is no automatic account switching or owner-funded fallback.

OAuth tokens remain encrypted in HttpOnly cookies and never enter JavaScript,
localStorage, Git or the static page. Explicit **Renew selected connection**
renews that account. If OpenAI requests phone/security verification, complete
the legitimate provider step; another login or email does not establish bypass.

Membership chat uses the Codex OAuth Responses transport with web search. Image
output uses the native Codex images endpoint, matching the mechanism established
in Hermes. Image access remains subject to that account's actual entitlement.
Hosted shell/MCP execution is not exposed by this website. Existing local
runtimes remain separately available below. Generic sampling/token controls
unsupported by the membership transport are omitted.

Deployment uses the sensitive CROW_GODMOD3_SESSION_SECRET variable to encrypt
visitor sessions. It is application configuration, not an owner provider key.
For local development, run node scripts/site-server.mjs and visit
http://127.0.0.1:8767/. Its local encryption key is ignored output, not public
content. Public /api/status reports the deployed revision and configuration.

Each runtime preset keeps its own remembered model inventory and its own three
per-mode pools. Only the currently selected runtime can execute local requests;
models from the other saved runtimes are not mixed into the race. Switching to
another runtime does not clear or merge the current profile. Switching back
restores that runtime's discovered inventory and its ULTRAPLINIAN,
PARSELTONGUE, and CLASSIC selections.

Optional runtime credentials remain in encrypted browser storage on the device
where they were entered. Crow-GodMod3 backups exclude those credentials. After
restoring elsewhere, enter any required local API keys on that browser/device.

With the header picker set to **Automatic**:

- ULTRAPLINIAN adds its selected local pool to its configured OpenRouter and
  Venice speed tier.
- PARSELTONGUE keeps its selected 11, 22, or 33 text techniques and runs those
  techniques across every model in its selected local pool.
- Crow-GodMod3 CLASSIC keeps its enabled prompt-strategy count and runs those
  strategies across every model in its selected local pool. FAST keeps its
  direct streaming path when there is exactly one target; with multiple
  targets it joins the scored prompt/model matrix so none of the selected
  models is silently omitted.

When a cloud provider is also configured, each mode preserves its native cloud
target or tier alongside its local pool. Pinning one provider-qualified model
in the header overrides that mode's Automatic pool and runs exactly that model.

Within each mode's selected pool, put the preferred helper model first. The app
freezes that pool when a question starts; its first selected model handles
automatic helper and judge calls while every selected model still participates
in that mode's main matrix.

## Browser permission and CORS

The hosted app runs at `https://crow-godmod3.vercel.app`. The local runtime
must allow that exact origin through CORS.

Chrome and Chromium-based browsers may separately ask whether the site can
access devices or services on your local network. Choose **Allow**. Crow-GodMod3
cannot bypass a denied browser permission.

If you self-host the interface, replace the production origin in the examples
below with the origin shown in the Local Model Runtimes settings panel.

## Crow Free AI Gateway

The Crow Free AI Gateway preset connects to the separate
`Crow's Free AI Model Access` project through one loopback OpenAI-compatible
server. The existing integration is designed for local Ollama models plus
anonymous provider routes for chat, image generation, text-to-speech, and
speech transcription. Provider availability and actual inference must be
verified against the running gateway; a saved preset or successful discovery
alone does not establish that a route currently works. The gateway is optional
and remains independently owned by that project.

1. Start the gateway from that project with
   `scripts\start_vendor_compat_gateway.cmd` (vendor routes included) or
   `scripts\start_local_text_ai.cmd` (local Ollama only).
2. Select **Crow Free AI Gateway** in Crow-GodMod3 and click
   **Test & Discover Models**. No API key is required.
3. Discovered chat models appear as `provider:model-id` (for example
   `ollama:crow-4b:latest` or `miaoxue-chat:glm-4-flash-250414`). Image,
   speech, and transcription routes are kept out of the chat inventory and
   are used by the modality switcher instead.

The gateway allows browser calls from any loopback origin, so a locally
served Crow-GodMod3 can reach it without extra CORS setup. The hosted app at
`https://crow-godmod3.vercel.app` is not a loopback origin; use a local copy
of the app when working with the gateway.

### Modality switcher (text / image / audio / video, in and out)

The modality switcher sits in the chat header next to the strategy mode
menu and states what each tool does:

- **TEXT · IN·OUT** — normal chat with the selected provider and model.
- **IMAGE · OUT** — the composer prompt is sent to the runtime's
  `/images/generations` route; the generated image renders inline in the
  conversation. On the Crow gateway this uses `miaoxue-image:default`.
- **IMAGE · IN** — attaches an image for vision chat (the existing upload
  flow).
- **AUDIO · OUT** — the composer text is sent to the runtime's
  `/audio/speech` route; the spoken audio renders as an inline player. On
  the Crow gateway this uses a discovered speech route, such as
  `edge-tts:neural-voices`; the exact route is shown before sending.
- **AUDIO · IN** — records from the microphone, converts the audio to
  16 kHz mono PCM in the browser, and sends it to the runtime's
  `/audio/transcriptions` route; the transcript lands in the composer for
  review before sending. On the Crow gateway this uses
  `iflytek-asr:default`.
- **VIDEO · OUT** — shown but unavailable: no configured provider offers a
  video route yet.

Each option shows the exact model route it will use once discovered. Before
discovery, preset fallback routes are labelled as configured and unverified.
After discovery, the returned capabilities determine which routes are available.
Modalities only run on the selected local runtime; cloud providers are
never called directly by the modality layer. The selected runtime can itself
forward requests to a remote provider.

The gateway currently limits image and speech prompts to 500 characters.
Its `iflytek-asr:default` route accepts at most 10 seconds of signed 16-bit,
16 kHz mono PCM. Crow-GodMod3 checks these limits before sending; oversized
image or speech prompts stay in the composer. Click the recording **STOP**
control to finish and transcribe, or the main send/stop button to cancel.
Transcripts remain in the composer for review before sending.

The source hosting policy now permits microphone requests from the app's own
origin (`microphone=(self)`); browser permission is still required. Granted
capture was checked in Chromium with a fake microphone. A browser set to deny
permission returned `Not supported`, and the app recovered without sending;
unit tests also cover a rejected permission request. Gateway response handling
was checked with simulated responses. Those checks do not establish real
provider or hardware acceptance.

As checked on **2 October 2026**, the published Vercel page is older than this
source, lacks the modality switcher, and still sends `microphone=()`.
Deployment and live provider acceptance remain outstanding. See
`CONTINUATION.md` in the source repository for the current checkpoint.

## LM Studio

1. Load a model in LM Studio.
2. Open **Developer**, start the local server, and enable **CORS** in Server
   Settings.
3. Alternatively, start it from a terminal:

   ```powershell
   lms server start --cors
   ```

4. Select **LM Studio** in Crow-GodMod3 and discover models.

LM Studio authentication is off by default. If you enable it, paste the LM
Studio API token into the optional API Key field.

Crow-GodMod3 defaults **LM Studio reasoning** to **Final answers only**. This
asks models whose discovered capabilities allow reasoning to be disabled to
return visible final text instead of using the entire Max Tokens budget on
hidden reasoning. Models that require reasoning are left at their supported
setting. Select **Use each model's default reasoning** when you deliberately
want native reasoning mode. This control is sent only to LM Studio; other local
runtime presets are left unchanged.

Official documentation:
[OpenAI compatibility](https://lmstudio.ai/docs/developer/openai-compat) and
[`lms server start`](https://lmstudio.ai/docs/cli/serve/server-start).

## Docker Model Runner

Docker Model Runner uses `/engines/v1`, not the usual root `/v1` path.

1. In Docker Desktop, enable **Docker Model Runner** and
   **host-side TCP support** on port `12434`.
2. Add `https://crow-godmod3.vercel.app` under
   **Settings → AI → CORS Allowed Origins**.
3. Or configure it from the Docker Desktop CLI:

   ```powershell
   docker desktop enable model-runner --tcp 12434 --cors https://crow-godmod3.vercel.app
   docker model pull ai/smollm2
   ```

4. Select **Docker Model Runner** in Crow-GodMod3 and discover models.

Docker Model Runner does not require an API key and ignores the Authorization
header, so leave the optional key blank.

Official documentation:
[Model Runner setup](https://docs.docker.com/ai/model-runner/get-started/) and
[API reference](https://docs.docker.com/ai/model-runner/api-reference/).

## vLLM

From the Linux or WSL environment where vLLM is installed, serve a chat-capable
model on loopback. This example gives it a stable API model ID and restricts
browser access to the live Crow-GodMod3 origin:

```bash
vllm serve Qwen/Qwen2.5-1.5B-Instruct \
  --host 127.0.0.1 \
  --port 8000 \
  --served-model-name qwen-local \
  --allowed-origins '["https://crow-godmod3.vercel.app"]'
```

Select **vLLM** and discover models. If the server was started with
`--api-key`, enter the same value in Crow-GodMod3. Models without a tokenizer
chat template need vLLM's `--chat-template` option.

Official documentation:
[OpenAI-compatible server](https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/)
and [`vllm serve`](https://docs.vllm.ai/en/latest/cli/serve/).

## llama.cpp

Start `llama-server` with a chat-capable GGUF model:

```powershell
llama-server `
  -m C:\models\model.gguf `
  --alias local-model `
  --host 127.0.0.1 `
  --port 8080 `
  --cors-origins https://crow-godmod3.vercel.app
```

Select **llama.cpp** and discover models. `--alias` keeps the API model ID
stable instead of exposing the model-file path. If you start the server with
`--api-key`, enter that value in Crow-GodMod3.

Official documentation:
[`llama-server`](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md).

## Ollama

1. Pull and start a model:

   ```powershell
   ollama pull qwen3:8b
   ollama serve
   ```

2. Configure Ollama's allowed origins to include
   `https://crow-godmod3.vercel.app`, then restart it.
3. Select **Ollama** and discover models.

## Custom OpenAI-compatible server

Choose **Custom OpenAI-compatible** and enter a loopback base URL. The server
must expose:

- `GET <base-url>/models` returning
  `{ "data": [{ "id": "model-id" }] }`
- `POST <base-url>/chat/completions` using OpenAI chat-completion request and
  response formats

An optional API key is sent as `Authorization: Bearer <key>`.

## Local-only behavior

Local-only mode:

- excludes OpenRouter and Venice from ULTRAPLINIAN races;
- uses lightweight local checks for classification/refusal detection and the
  first selected model in the active mode's frozen pool for remaining judge,
  coaching, accuracy, and Liquid calls;
- routes through the selected loopback runtime, which may itself proxy remote
  services; it does not guarantee that model inference stays on the device;
- keeps conversations, settings, and keys in browser storage;
- does not stop ordinary page-hosting or browser traffic.

Crow-GodMod3 application telemetry is disabled in this build. Your selected
runtime may keep its own request logs.

## Troubleshooting

- **Failed to fetch:** start the runtime, verify its port, enable CORS for the
  exact page origin, and allow the browser's Local Network Access prompt.
- **HTTP 401/403:** the server requires a different bearer token.
- **HTTP 404:** restore the preset URL. Docker Model Runner specifically needs
  `http://localhost:12434/engines/v1`.
- **No model IDs:** query `<base-url>/models` directly and confirm it returns
  OpenAI-style `data[].id` values.
- **Chat errors after discovery:** model discovery does not prove that the
  selected model has a valid chat template. Load a chat/instruct model or
  configure the runtime's chat-template option.
- **No final text after internal reasoning:** increase Model Max Tokens or, for
  LM Studio, choose **Final answers only**. Crow-GodMod3 reports this separately
  from API-key, connection, and account failures.
- **Slow races or out-of-memory errors:** use fewer model IDs, reduce Max
  Tokens, or disable additional coaching and Liquid refinement passes.
