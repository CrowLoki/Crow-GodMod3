import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../scripts/crow-modality.js", import.meta.url), "utf8");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function settle() {
  for (let index = 0; index < 8; index++) await new Promise(setImmediate);
}

function harness(options = {}) {
  const logs = [];
  const requests = [];
  const recorders = [];
  const conversation = { messages: [] };
  const tracks = [{ stops: 0, stop() { this.stops++; } }, { stops: 0, stop() { this.stops++; } }];
  const stream = { getTracks: () => tracks };
  let captures = 0;
  let contextsClosed = 0;
  const classes = new Set();
  const input = { value: "", placeholder: "", dataset: {}, focus() {} };
  const elements = {
    messageInput: input,
    modalityLabel: { textContent: "" },
    modalityDir: { textContent: "" },
    modalitySwitcherBtn: { classList: { toggle(name, active) {
      if (active) classes.add(name);
      else classes.delete(name);
    } } },
  };
  class MediaRecorder {
    constructor(media) {
      assert.equal(media, stream);
      if (options.constructorError) throw new Error("Recorder construction failed");
      this.state = "inactive";
      this.mimeType = options.mimeType ?? "audio/webm;codecs=opus";
      recorders.push(this);
    }
    start() {
      if (options.startError) throw new Error("Recorder start failed");
      this.state = "recording";
    }
    stop() {
      if (this.state === "inactive") throw new Error("InvalidStateError");
      this.state = "inactive";
      queueMicrotask(() => {
        this.ondataavailable?.({ data: new Blob(options.empty ? [] : ["recorded audio"], { type: options.chunkType ?? this.mimeType }) });
        this.onstop?.();
      });
    }
  }
  class AudioContext {
    async decodeAudioData() {
      if (options.decodeGate) await options.decodeGate.promise;
      if (options.decodeError) throw new Error("Audio decoding failed");
      const channels = options.channels ?? [new Float32Array([0, 0.5, -0.5, 1])];
      return {
        sampleRate: 16000,
        numberOfChannels: channels.length,
        length: channels[0]?.length ?? 0,
        getChannelData: (index) => channels[index],
      };
    }
    async close() { contextsClosed++; }
  }
  const context = vm.createContext({
    Blob,
    URL,
    AbortController,
    btoa: (value) => Buffer.from(value, "binary").toString("base64"),
    window: { AudioContext },
    document: { readyState: "complete", addEventListener() {}, getElementById: (id) => elements[id] ?? null },
    navigator: { mediaDevices: { async getUserMedia(constraints) {
      assert.equal(JSON.stringify(constraints), '{"audio":true}');
      captures++;
      if (options.permissionError) throw new Error("Permission denied");
      if (options.permissionGate) await options.permissionGate.promise;
      return stream;
    } } },
    MediaRecorder,
    isStreaming: false,
    state: { localRuntime: "crowfree", localBaseUrl: "http://127.0.0.1:8766/v1", localEnabled: true, currentId: "chat" },
    LOCAL_RUNTIME_PRESETS: { crowfree: { label: "Crow Gateway", baseUrl: "http://127.0.0.1:8766/v1" }, custom: { label: "Custom", baseUrl: "http://localhost:5000/v1" } },
    _localApiKeysByRuntime: { crowfree: "first-key", custom: "second-key" },
    _localModelCapsByRuntime: {},
    normalizeLocalRuntime: (runtime) => runtime,
    normalizeLocalBaseUrl: (baseUrl) => baseUrl,
    getLocalRuntimeProfile(runtime) { return { baseUrl: context.LOCAL_RUNTIME_PRESETS[runtime].baseUrl }; },
    findLocalModelWithCapability(runtime, capability) {
      return Object.entries(context._localModelCapsByRuntime[runtime] ?? {}).find(([, caps]) => caps.includes(capability))?.[0] ?? "";
    },
    logRuntimeDiagnostic: (message, level) => logs.push({ message, level }),
    updateSendButton() {},
    autoResize() {},
    openSettings() {},
    getCurrentConv: () => conversation,
    removeAttachedImage() {},
    updatePromptsTriedUI() {},
    saveState() {},
    render() {},
    showTyping() {},
    hideTyping() {},
    async fetch(url, request) {
      requests.push({ url, ...request, body: JSON.parse(request.body) });
      if (options.fetchGate) {
        if (options.abortableFetch) {
          await Promise.race([
            options.fetchGate.promise,
            new Promise((resolve, reject) => request.signal?.addEventListener("abort", () => reject(new Error("Request aborted")), { once: true })),
          ]);
        } else await options.fetchGate.promise;
      }
      return options.response ?? new Response(JSON.stringify({ text: "hello crow" }), { headers: { "Content-Type": "application/json" } });
    },
    escapeHtml: (value) => value,
  });
  vm.runInContext(source, context);
  return { context, input, logs, tracks, requests, recorders, conversation, options, classes, elements,
    get captures() { return captures; }, get contextsClosed() { return contextsClosed; } };
}

test("hosting permits first-party microphone while keeping camera blocked", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const policy = config.headers.flatMap((entry) => entry.headers).find((header) => header.key === "Permissions-Policy").value;
  assert.match(policy, /(?:^|, )microphone=\(self\)(?:,|$)/);
  assert.match(policy, /(?:^|, )camera=\(\)(?:,|$)/);
});

test("explicit discovery without ASR overrides configured gateway defaults", async () => {
  const app = harness();
  app.context._localModelCapsByRuntime.crowfree = { "chat:only": ["chat"] };
  await app.context.crowStartRecording();
  assert.equal(app.captures, 0);
  assert.match(app.logs.at(-1).message, /no transcription route/);
});

test("does not request a microphone when local runtime is disabled, busy, unsupported, or has no route", async (t) => {
  for (const reason of ["disabled", "busy", "unsupported", "no-route"]) {
    await t.test(reason, async () => {
      const app = harness();
      if (reason === "disabled") app.context.state.localEnabled = false;
      if (reason === "busy") app.context.isStreaming = true;
      if (reason === "unsupported") app.context.navigator.mediaDevices = undefined;
      if (reason === "no-route") app.context.state.localRuntime = "custom";
      await app.context.crowStartRecording();
      assert.equal(app.captures, 0);
      assert.equal(app.context.isStreaming, reason === "busy");
    });
  }
});

test("denied permission reports a microphone error and leaves composer usable", async () => {
  const app = harness({ permissionError: true });
  await app.context.crowStartRecording();
  assert.match(app.logs.at(-1).message, /Microphone error: Permission denied/);
  assert.equal(app.context.isStreaming, false);
  assert.equal(app.classes.has("recording"), false);
  assert.equal(app.requests.length, 0);
});

test("permission-pending repeat clicks open one stream and prevent overlapping sends", async () => {
  const gate = deferred();
  const app = harness({ permissionGate: gate });
  const first = app.context.crowStartRecording();
  const second = app.context.crowStartRecording();
  assert.equal(app.captures, 1);
  assert.equal(app.context.isStreaming, true);
  gate.resolve();
  await Promise.all([first, second]);
  assert.equal(app.recorders.length, 1);
  app.context.crowStopRecording();
  await settle();
});

test("recorder setup failure closes every granted track and allows another attempt", async (t) => {
  for (const failure of ["constructorError", "startError"]) {
    await t.test(failure, async () => {
      const app = harness({ [failure]: true });
      await app.context.crowStartRecording();
      assert.deepEqual(app.tracks.map((track) => track.stops), [1, 1]);
      assert.equal(app.context.isStreaming, false);
      assert.equal(app.classes.has("recording"), false);
      app.options[failure] = false;
      await app.context.crowStartRecording();
      assert.equal(app.captures, 2);
      app.context.crowStopRecording();
      await settle();
    });
  }
});

test("granted recording transcribes PCM to the originally selected route and transport", async () => {
  const gate = deferred();
  const app = harness({ decodeGate: gate, mimeType: "audio/mp4" });
  app.input.value = "Keep this draft  ";
  app.context._localModelCapsByRuntime.crowfree = { "asr:chosen": ["asr"] };
  await app.context.crowStartRecording();
  assert.equal(app.context.isStreaming, true);
  assert.equal(app.elements.modalityLabel.textContent, "STOP");
  app.context.crowStopRecording();
  await settle();
  app.context.state.localRuntime = "custom";
  app.context.LOCAL_RUNTIME_PRESETS.crowfree.baseUrl = "http://localhost:9999/v1";
  app.context._localApiKeysByRuntime.crowfree = "changed-key";
  gate.resolve();
  await settle();
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0].url, "http://127.0.0.1:8766/v1/audio/transcriptions");
  assert.equal(app.requests[0].headers.Authorization, "Bearer first-key");
  assert.equal(app.requests[0].body.model, "asr:chosen");
  assert.equal(typeof app.requests[0].body.audio, "string");
  assert.equal(app.input.value, "Keep this draft hello crow");
  assert.deepEqual(app.tracks.map((track) => track.stops), [1, 1]);
  assert.equal(app.contextsClosed, 1);
  assert.equal(app.context.isStreaming, false);
  assert.equal(app.input.dataset.crowBusy, undefined);
  assert.equal(app.elements.modalityLabel.textContent, "TEXT");
});

test("repeated stop clicks are harmless while the stop event is pending", async () => {
  const app = harness();
  await app.context.crowStartRecording();
  app.context.crowStopRecording();
  assert.doesNotThrow(() => app.context.crowStopRecording());
  await settle();
  assert.equal(app.requests.length, 1);
});

test("recorder error closes capture and never submits partial audio", async () => {
  const app = harness();
  await app.context.crowStartRecording();
  const recorder = app.recorders[0];
  recorder.onerror?.({ error: new Error("Recording device disconnected") });
  if (recorder.state !== "inactive") recorder.stop();
  await settle();
  assert.equal(app.requests.length, 0);
  assert.deepEqual(app.tracks.map((track) => track.stops), [1, 1]);
  assert.equal(app.context.isStreaming, false);
  assert.equal(app.elements.modalityLabel.textContent, "TEXT");
  assert.ok(app.logs.some(({ message }) => message.includes("Recording device disconnected")));
});

test("recording uses emitted chunk MIME type when recorder leaves it unspecified", async () => {
  const app = harness({ mimeType: "", chunkType: "audio/mp4" });
  let capturedType;
  app.context.crowEncodePcm16Base64 = async (blob) => { capturedType = blob.type; return "AA=="; };
  await app.context.crowStartRecording();
  app.context.crowStopRecording();
  await settle();
  assert.equal(capturedType, "audio/mp4");
});

test("empty recordings release tracks without posting a transcription", async () => {
  const app = harness({ empty: true });
  await app.context.crowStartRecording();
  app.context.crowStopRecording();
  await settle();
  assert.equal(app.requests.length, 0);
  assert.deepEqual(app.tracks.map((track) => track.stops), [1, 1]);
  assert.equal(app.context.isStreaming, false);
});

test("transcription failures preserve the draft and clear busy state", async (t) => {
  const cases = [
    ["HTTP failure", () => ({ response: new Response("ASR unavailable", { status: 503 }) }), /HTTP 503/],
    ["invalid JSON", () => ({ response: new Response("not JSON", { headers: { "Content-Type": "application/json" } }) }), /JSON/i],
    ["wrong response type", () => ({ response: new Response(JSON.stringify({ text: { words: "unsafe shape" } }), { headers: { "Content-Type": "application/json" } }) }), /no text/],
    ["decode failure", () => ({ decodeError: true }), /Audio decoding failed/],
  ];
  for (const [name, options, error] of cases) await t.test(name, async () => {
    const app = harness(options());
    app.input.value = "draft";
    await app.context.crowStartRecording();
    app.context.crowStopRecording();
    await settle();
    assert.equal(app.input.value, "draft");
    assert.equal(app.context.isStreaming, false);
    assert.equal(app.input.dataset.crowBusy, undefined);
    assert.ok(app.logs.some(({ message }) => error.test(message)));
    assert.deepEqual(app.tracks.map((track) => track.stops), [1, 1]);
  });
});

test("PCM encoding downmixes channels, clips samples, and closes Web Audio", async () => {
  const app = harness({ channels: [new Float32Array([1, -1, 2, -2]), new Float32Array([-1, -1, 2, -2])] });
  const audio = await app.context.crowEncodePcm16Base64(new Blob(["audio"]));
  const bytes = Buffer.from(audio, "base64");
  assert.deepEqual([0, 2, 4, 6].map((offset) => bytes.readInt16LE(offset)), [0, -32768, 32767, -32768]);
  assert.equal(app.contextsClosed, 1);
});

test("gateway speech resolves returned file URL against its original runtime origin", async () => {
  const gate = deferred();
  const app = harness({ fetchGate: gate, response: new Response(JSON.stringify({ audio_source: "/v1/audio/files/crow.mp3" })) });
  const work = app.context.crowSpeakText("hello crow");
  app.context.state.localRuntime = "custom";
  app.context.LOCAL_RUNTIME_PRESETS.crowfree.baseUrl = "http://localhost:9999/v1";
  gate.resolve();
  await work;
  assert.equal(app.requests[0].url, "http://127.0.0.1:8766/v1/audio/speech");
  assert.equal(app.conversation.messages.at(-1).generatedAudio.url, "http://127.0.0.1:8766/v1/audio/files/crow.mp3");
  assert.equal(app.context.isStreaming, false);
});

test("media responses reject malformed, credentialed, and executable URLs", async (t) => {
  for (const value of ["garbage", "//other.example/file.mp3", "javascript:alert(1)", "https://user:password@example.com/audio.mp3", "https://example.com/\"bad.mp3"]) {
    await t.test(value, async () => {
      const app = harness({ response: new Response(JSON.stringify({ audio_source: value })) });
      await app.context.crowSpeakText("hello crow");
      assert.equal(app.conversation.messages.at(-1).generatedAudio, undefined);
      assert.match(app.conversation.messages.at(-1).content, /no audio URL/);
    });
  }
});

test("gateway image and speech respect the existing 500-character contract without truncation", async (t) => {
  for (const method of ["crowGenerateImage", "crowSpeakText"]) {
    await t.test(method, async () => {
      const app = harness({ response: new Response(JSON.stringify({ audio_source: "https://example.com/audio.mp3", data: [{ url: "https://example.com/image.png" }] })) });
      await app.context[method]("x".repeat(500));
      assert.equal(app.requests.length, 1);
      assert.equal((app.requests[0].body.input ?? app.requests[0].body.prompt).length, 500);
      app.input.value = "x".repeat(501);
      await app.context[method](app.input.value);
      assert.equal(app.requests.length, 1);
      assert.equal(app.input.value.length, 501);
      assert.match(app.logs.at(-1).message, /500 characters/);
    });
  }
});

test("gateway character limits count Unicode characters like its Python validator", async () => {
  const app = harness({ response: new Response(JSON.stringify({ audio_source: "https://example.com/audio.mp3" })) });
  await app.context.crowSpeakText("🐦".repeat(500));
  assert.equal(app.requests.length, 1);
  assert.equal(Array.from(app.requests[0].body.input).length, 500);
});

test("iFlytek ASR rejects over ten seconds before sending PCM and preserves the draft", async () => {
  const app = harness({ channels: [new Float32Array(160001)] });
  app.input.value = "keep draft";
  await app.context.crowStartRecording();
  app.context.crowStopRecording();
  await settle();
  assert.equal(app.requests.length, 0);
  assert.equal(app.input.value, "keep draft");
  assert.ok(app.logs.some(({ message }) => /10 seconds/.test(message)));
  assert.equal(app.context.isStreaming, false);
});

test("iFlytek ASR accepts exactly ten seconds of PCM", async () => {
  const app = harness({ channels: [new Float32Array(160000)] });
  await app.context.crowStartRecording();
  app.context.crowStopRecording();
  await settle();
  assert.equal(app.requests.length, 1);
  assert.equal(Buffer.from(app.requests[0].body.audio, "base64").length, 320000);
  assert.equal(app.input.value, "hello crow");
});

test("canceling pending permission releases the late stream without starting a recorder", async () => {
  const gate = deferred();
  const app = harness({ permissionGate: gate });
  const work = app.context.crowStartRecording();
  assert.equal(app.context.crowStopModalityRequest(), true);
  assert.equal(app.context.isStreaming, false);
  gate.resolve();
  await work;
  assert.equal(app.recorders.length, 0);
  assert.deepEqual(app.tracks.map((track) => track.stops), [1, 1]);
  assert.equal(app.requests.length, 0);
  assert.equal(app.context.crowStopModalityRequest(), false);
});

test("canceling during decoding prevents transcription and leaves a newer request busy", async () => {
  const decodeGate = deferred();
  const fetchGate = deferred();
  const app = harness({ decodeGate, fetchGate });
  await app.context.crowStartRecording();
  app.context.crowStopRecording();
  await settle();
  app.context.crowStopModalityRequest();
  assert.equal(app.input.dataset.crowBusy, undefined);
  const newer = app.context.crowSpeakText("new speech");
  decodeGate.resolve();
  await settle();
  assert.equal(app.context.isStreaming, true);
  assert.equal(app.requests.length, 1);
  assert.match(app.requests[0].url, /audio\/speech$/);
  app.context.crowStopModalityRequest();
  fetchGate.resolve();
  await newer;
  assert.equal(app.context.isStreaming, false);
});

test("canceling capture discards partial recording and stops every microphone track", async () => {
  const app = harness();
  await app.context.crowStartRecording();
  assert.equal(app.context.crowStopModalityRequest(), true);
  await settle();
  assert.deepEqual(app.tracks.map((track) => track.stops), [1, 1]);
  assert.equal(app.requests.length, 0);
  assert.equal(app.context.isStreaming, false);
});

test("canceling speech aborts the fetch and leaves composer usable", async () => {
  const app = harness({ fetchGate: deferred(), abortableFetch: true });
  const work = app.context.crowSpeakText("cancel this");
  assert.equal(app.context.crowStopModalityRequest(), true);
  await work;
  assert.equal(app.requests[0].signal.aborted, true);
  assert.equal(app.context.isStreaming, false);
  assert.equal(app.conversation.messages.some((message) => message.generatedAudio), false);
});

test("canceling an in-flight transcription aborts HTTP and preserves the draft", async () => {
  const app = harness({ fetchGate: deferred(), abortableFetch: true });
  app.input.value = "keep my draft";
  await app.context.crowStartRecording();
  app.context.crowStopRecording();
  await settle();
  assert.equal(app.requests.length, 1);
  assert.equal(app.context.crowStopModalityRequest(), true);
  await settle();
  assert.equal(app.requests[0].signal.aborted, true);
  assert.equal(app.input.value, "keep my draft");
  assert.equal(app.context.isStreaming, false);
  assert.equal(app.input.dataset.crowBusy, undefined);
});

test("late canceled media response cannot clear a newer recording", async () => {
  const gate = deferred();
  const app = harness({ fetchGate: gate, response: new Response(JSON.stringify({ audio_source: "/v1/audio/files/late.mp3" })) });
  const older = app.context.crowSpeakText("old speech");
  app.context.crowStopModalityRequest();
  await app.context.crowStartRecording();
  gate.resolve();
  await older;
  assert.equal(app.context.isStreaming, true);
  assert.equal(app.elements.modalityLabel.textContent, "STOP");
  assert.equal(app.conversation.messages.some((message) => message.generatedAudio), false);
  app.context.crowStopModalityRequest();
  await settle();
});
