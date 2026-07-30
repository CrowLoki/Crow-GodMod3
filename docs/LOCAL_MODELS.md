# Connect Crow-GodMod3 to local models

Crow-GodMod3 can connect directly from the browser to an OpenAI-compatible
server running on the same computer. The connection is restricted to
`localhost` and `127.0.0.1`.

Supported presets:

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
   by the runtime's `/models` endpoint.
6. Enable **Local-only mode** if all model inference should stay on the local
   runtime instead of using OpenRouter or Venice.

Multiple model IDs can race together. The first discovered/configured ID also
handles helper and judge calls, so put the strongest local model first.

## Browser permission and CORS

The hosted app runs at `https://crow-godmod3.vercel.app`. The local runtime
must allow that exact origin through CORS.

Chrome and Chromium-based browsers may separately ask whether the site can
access devices or services on your local network. Choose **Allow**. Crow-GodMod3
cannot bypass a denied browser permission.

If you self-host the interface, replace the production origin in the examples
below with the origin shown in the Local Model Runtimes settings panel.

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
- uses the first local model for classification, judging, coaching, accuracy
  checks, and Liquid refinement;
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
- **Slow races or out-of-memory errors:** use fewer model IDs, reduce Max
  Tokens, or disable additional coaching and Liquid refinement passes.
