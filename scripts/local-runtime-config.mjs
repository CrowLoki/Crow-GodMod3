export const localRuntimePresets = Object.freeze({
  ollama: {
    label: "Ollama",
    baseUrl: "http://localhost:11434/v1",
    help:
      "Existing Ollama connection. Allow {origin} in OLLAMA_ORIGINS, restart Ollama, then discover its model IDs.",
    apiKeyPlaceholder: "Leave blank unless your Ollama gateway requires one",
  },
  lmstudio: {
    label: "LM Studio",
    baseUrl: "http://localhost:1234/v1",
    help:
      "Start the Developer server and enable CORS (or run lms server start --cors). Add a token only if LM Studio authentication is enabled.",
    apiKeyPlaceholder: "Optional LM Studio API token",
  },
  docker: {
    label: "Docker Model Runner",
    baseUrl: "http://localhost:12434/engines/v1",
    help:
      "Enable host-side TCP on port 12434 and allow {origin} in Docker Model Runner's CORS settings. Docker Model Runner does not require an API key.",
    apiKeyPlaceholder: "Not used by Docker Model Runner",
  },
  vllm: {
    label: "vLLM",
    baseUrl: "http://localhost:8000/v1",
    help:
      "Serve a chat-capable model on loopback. vLLM allows browser origins by default; enter the same key here if the server uses --api-key.",
    apiKeyPlaceholder: "Optional vLLM --api-key value",
  },
  llamacpp: {
    label: "llama.cpp",
    baseUrl: "http://localhost:8080/v1",
    help:
      "Start llama-server with a chat-capable GGUF model. Its OpenAI-compatible server uses port 8080 by default; --api-key is optional.",
    apiKeyPlaceholder: "Optional llama-server --api-key value",
  },
  custom: {
    label: "Custom OpenAI-compatible",
    baseUrl: "",
    help:
      "Enter a loopback URL exposing /models and /chat/completions in OpenAI format. Existing custom URLs are preserved.",
    apiKeyPlaceholder: "Optional bearer token for the custom server",
  },
});

export const localRuntimeIds = Object.freeze(
  Object.keys(localRuntimePresets),
);
