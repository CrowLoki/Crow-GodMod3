// The recovered anonymous speech-recognition path, mirroring
// src/stickermate/legacy_asr.py: one signed bootstrap for a short-lived
// signed socket URL (held only in memory), then 16 kHz mono signed-16-bit
// PCM streamed in the recovered frame shape and the transcript read back.
// Buffered transcription has one total deadline; live capture has separate
// preparation, capture and recognition budgets. Neither path retries.

import { bytesToBase64, isPlainObject, nowMs, sleep } from "../util.js";
import { signedPost } from "./signature.js";
import { openBoundedSocket } from "./ws.js";
import { abortable, abortError } from "./cancellation.js";

export const ASR_AUTH_ENDPOINT = "https://miaoxue.api.open.ocrmath.com/mx/voiceDictate/getAuthorizedUrl";
export const IFLYTEK_ASR_HOST = "iat-api.xfyun.cn";
export const IFLYTEK_ASR_PATH = "/v2/iat";
export const PCM_CHUNK_BYTES = 1280;
export const MAX_PCM_BYTES = 320000;
export const MAX_ASR_RESPONSE_FRAMES = 512;
export const MAX_CAPTURE_AUDIO_SECONDS = 60;
export const MAX_CAPTURE_TIMEOUT_MS = 90000;
export const MAX_CAPTURE_ASR_FRAMES = 1501;

export class LegacyASRError extends Error {
  constructor(message) {
    super(message);
    this.name = "LegacyASRError";
  }
}

/** Only the original typed ASR daily-quota result earns this classification. */
export function isAsrDailyLimitError(error) {
  const seen = new Set();
  let current = error;
  for (let depth = 0; depth < 8 && current instanceof Error && !seen.has(current); depth++) {
    seen.add(current);
    if (current instanceof LegacyASRError && Number.isInteger(current.upstreamCode) && current.upstreamCode === 11201) return true;
    // Follow only a retained cause value, never messages, copied metadata or
    // an accessor that can manufacture an unbounded/error-producing chain.
    current = Object.getOwnPropertyDescriptor(current, "cause")?.value;
  }
  return false;
}

/** Immutable local allowances for one complete buffer, not service quotas. */
export function asrResourceLimits({ maxAudioSeconds = 10, timeoutMs = 30000 } = {}) {
  if (typeof maxAudioSeconds !== "number" || !Number.isFinite(maxAudioSeconds)
      || maxAudioSeconds < 1 / 16000 || maxAudioSeconds > MAX_CAPTURE_AUDIO_SECONDS) {
    throw new RangeError("maxAudioSeconds must fit its finite local resource budget");
  }
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs)
      || timeoutMs < 1000 || timeoutMs > MAX_CAPTURE_TIMEOUT_MS) {
    throw new RangeError("timeout must be between 1 and 90 seconds");
  }
  const maxPcmBytes = Math.floor(maxAudioSeconds * 16000) * 2;
  const maxSentFrames = Math.ceil(maxPcmBytes / PCM_CHUNK_BYTES) + 1;
  return Object.freeze({ maxAudioSeconds, timeoutMs, maxPcmBytes, maxSentFrames,
    maxReceivedFrames: Math.min(MAX_CAPTURE_ASR_FRAMES, Math.max(MAX_ASR_RESPONSE_FRAMES, maxSentFrames)),
    localResourceBudget: true,
  });
}

/** Fixed scalar diagnostics only; never include PCM, text, signed URLs or messages. */
export function asrFailureMetadata(error) {
  const result = {};
  if (["bootstrap", "connect", "upload", "receive"].includes(error?.asrPhase)) result.asrPhase = error.asrPhase;
  for (const [field, lower, upper] of [
    ["sentFrames", 0, MAX_CAPTURE_ASR_FRAMES], ["receivedFrames", 0, MAX_CAPTURE_ASR_FRAMES],
    ["upstreamCode", -(2 ** 31), 2 ** 31 - 1],
  ]) {
    const value = error?.[field];
    if (Number.isInteger(value) && value >= lower && value <= upper) result[field] = value;
  }
  try {
    if (error?.resourceLimits?.localResourceBudget === true) {
      result.resourceLimits = asrResourceLimits(error.resourceLimits);
    }
  } catch { /* Unrecognized external metadata is omitted. */ }
  return result;
}

/** Obtain and validate one ephemeral signed socket URL without persisting it. */
export async function fetchAsrAuthorization({ timeoutMs = 10000, fetchImpl = fetch, timestampMs = null, signal } = {}) {
  const timeout = Number(timeoutMs);
  if (!(timeout > 0 && timeout <= 30000)) throw new RangeError("timeout must be greater than zero and at most 30 seconds");
  let document;
  try {
    document = await signedPost(ASR_AUTH_ENDPOINT, {}, { timeoutMs: Math.max(1000, timeout), timestampMs,
      fetchImpl: (input, options) => fetchImpl(input, { ...options,
        ...(signal ? { signal: AbortSignal.any([signal, options.signal].filter(Boolean)) } : {}),
      }),
    });
  } catch {
    throw new LegacyASRError("ASR authorization bootstrap failed");
  }
  if (document.errno !== 0) throw new LegacyASRError("ASR authorization bootstrap failed");
  const data = document.data;
  if (!isPlainObject(data)) throw new LegacyASRError("ASR authorization data must be an object");
  const appId = String(data.appId ?? "");
  const authUrl = String(data.authUrl ?? "");
  let parsed;
  try {
    parsed = new URL(authUrl);
  } catch {
    throw new LegacyASRError("ASR authorization returned an unexpected host or path");
  }
  if (!appId || parsed.protocol !== "wss:" || parsed.hostname !== IFLYTEK_ASR_HOST || parsed.pathname !== IFLYTEK_ASR_PATH) {
    throw new LegacyASRError("ASR authorization returned an unexpected host or path");
  }
  for (const field of ["authorization", "date", "host"]) {
    if (!parsed.searchParams.has(field)) throw new LegacyASRError("ASR authorization URL lacks required signed fields");
  }
  return { appId, authUrl, serviceHost: IFLYTEK_ASR_HOST };
}

// English uses the documented business fields admitted by the recovered
// anonymous route. Select a language once; never retry with another language.
export const ASR_LANGUAGES = Object.freeze({
  zh: "zh_cn", cmn: "zh_cn", yue: "zh_cn", en: "en_us",
});
/** Select admitted English or the recovered default before one request. */
export function asrLanguage(requested) {
  const tag = String(requested || "").trim().toLowerCase().replace(/_/g, "-");
  if (!tag) return "zh_cn";
  return ASR_LANGUAGES[tag] || ASR_LANGUAGES[tag.split("-")[0]] || "zh_cn";
}

/** The recovered frame shape with IAT start/continue/end status. */
export function buildAsrFrame(pcm, { appId, status, language = "zh_cn" }) {
  if (!Number.isInteger(status) || ![0, 1, 2].includes(status)) throw new RangeError("ASR frames require integer status 0, 1, or 2");
  const spoken = String(language || "zh_cn");
  return {
    common: { app_id: String(appId) },
    business: {
      language: spoken,
      domain: "iat",
      ...(["zh_cn", "en_us"].includes(spoken) ? { accent: "mandarin" } : {}),
      ...(spoken !== "en_us" ? { dwa: "wpgs" } : {}),
      vad_eos: 10000,
    },
    data: {
      status,
      format: "audio/L16;rate=16000",
      encoding: "raw",
      audio: bytesToBase64(pcm),
    },
  };
}

export function wordsFromResult(document) {
  const data = document?.data;
  const result = isPlainObject(data) ? data.result : null;
  const groups = isPlainObject(result) ? result.ws : null;
  if (!Array.isArray(groups)) return "";
  const words = [];
  for (const group of groups) {
    const choices = isPlainObject(group) ? group.cw : null;
    if (Array.isArray(choices) && choices.length && isPlainObject(choices[0])) {
      const word = choices[0].w;
      if (typeof word === "string") words.push(word);
    }
  }
  return words.join("");
}

function defaultConnector(url, { timeoutMs, signal }) {
  return openBoundedSocket(url, { timeoutMs, signal });
}

/** One prepared live recognizer. Audio is forwarded as it arrives, never replayed. */
export async function openLiveTranscription({
  language = '', timeoutMs = 20000, signal,
  authFetcher = fetchAsrAuthorization, connector = defaultConnector, clock = nowMs,
} = {}) {
  const timeout = Number(timeoutMs);
  if (!(timeout > 0 && timeout <= 30000)) throw new RangeError('Invalid recognition preparation deadline');
  const started = clock();
  const prepareDeadline = started + timeout;
  const remaining = cap => {
    const value = Math.min(cap, prepareDeadline - clock());
    if (value <= 0 || signal?.aborted) throw abortError();
    return value;
  };
  const authorization = await abortable(authFetcher({ timeoutMs: remaining(10000), signal }), signal);
  if (authorization.serviceHost !== IFLYTEK_ASR_HOST) throw new LegacyASRError('ASR authorization host changed unexpectedly');
  const opening = Promise.resolve(connector(authorization.authUrl, { timeoutMs: remaining(15000), signal }));
  opening.then(value => { if (signal?.aborted) value.close(); }, () => {});
  const socket = await abortable(opening, signal);
  try { remaining(Infinity); } catch (error) { socket.close(); throw error; }
  const controller = new AbortController();
  let finished = false, bytes = 0, sentFrames = 0, closed = false, deadlineTimer;
  const captureDeadline = clock() + 15000;
  const receiveCeiling = captureDeadline + 20000;
  let receiveDeadline = receiveCeiling;
  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(deadlineTimer);
    controller.abort();
    signal?.removeEventListener('abort', close);
    socket.close();
  };
  // A read may already be pending when finish shortens its budget. The owned
  // timer closes that same read, without starting another reader or renewing it.
  deadlineTimer = setTimeout(close, Math.max(0, captureDeadline - clock()));
  signal?.addEventListener('abort', close, { once: true });
  if (signal?.aborted) close();
  const result = (async () => {
    let committed = '', replacing = '';
    try {
      for (let count = 0; count < MAX_ASR_RESPONSE_FRAMES; count++) {
        const left = receiveDeadline - clock();
        if (left <= 0) throw new LegacyASRError('ASR receive deadline exceeded');
        const raw = await abortable(socket.recvMessage(left), controller.signal);
        if (clock() >= receiveDeadline) throw new LegacyASRError('ASR receive deadline exceeded');
        if (raw === null) throw new LegacyASRError('ASR closed before final recognition');
        const document = JSON.parse(raw);
        if (!isPlainObject(document) || document.code !== 0) throw new LegacyASRError('ASR recognition failed');
        const text = wordsFromResult(document);
        const pgs = document.data?.result?.pgs;
        if (pgs) {
          if (pgs === 'apd') committed = replacing || committed;
          replacing = committed + text;
        } else committed += text;
        if (document.data?.status === 2) {
          if (!finished) throw new LegacyASRError('ASR ended before recording finished');
          return { transcript: replacing || committed, sentFrames, receivedFrames: count + 1 };
        }
      }
      throw new LegacyASRError('ASR response frame bound exceeded');
    } finally { close(); }
  })();
  // Read-ahead can fail before the caller finishes capturing. Its owner also
  // observes result immediately; this handler protects other direct callers.
  result.catch(() => {});
  return {
    result, close,
    writePcm(pcm) {
      if (closed || finished || controller.signal.aborted) throw abortError();
      if (clock() >= captureDeadline) { close(); throw new LegacyASRError('ASR capture deadline exceeded'); }
      if (!(pcm instanceof Uint8Array) || !pcm.length || pcm.length % 2 || pcm.length > PCM_CHUNK_BYTES
          || bytes + pcm.length > MAX_PCM_BYTES) throw new RangeError('Invalid live PCM frame');
      socket.sendText(JSON.stringify(buildAsrFrame(pcm, { appId: authorization.appId,
        status: sentFrames === 0 ? 0 : 1, language: asrLanguage(language) })));
      bytes += pcm.length;
      sentFrames++;
    },
    finish() {
      if (closed || finished || !bytes) throw new RangeError('Recording cannot finish');
      if (clock() >= captureDeadline) { close(); throw new LegacyASRError('ASR capture deadline exceeded'); }
      finished = true;
      receiveDeadline = Math.min(receiveCeiling, clock() + 20000);
      clearTimeout(deadlineTimer);
      deadlineTimer = setTimeout(close, Math.max(0, receiveDeadline - clock()));
      socket.sendText(JSON.stringify(buildAsrFrame(new Uint8Array(), {
        appId: authorization.appId, status: 2, language: asrLanguage(language),
      })));
      sentFrames++;
      return result;
    },
  };
}

/** Transcribe one bounded 16 kHz mono signed-16-bit PCM buffer. */
export async function transcribePcmOnce(pcm, {
  language = "",
  timeoutMs = 30000,
  maxAudioSeconds = 10,
  authFetcher = fetchAsrAuthorization,
  connector = defaultConnector,
  sleeper = sleep,
  clock = nowMs,
} = {}) {
  const limits = asrResourceLimits({ maxAudioSeconds, timeoutMs });
  const spokenLanguage = asrLanguage(language);
  if (!(pcm instanceof Uint8Array) || !pcm.byteLength) throw new RangeError("PCM input must be non-empty bytes");
  if (pcm.byteLength % 2) throw new RangeError("PCM input must contain complete signed-16-bit samples");
  if (pcm.byteLength > limits.maxPcmBytes) throw new RangeError(`PCM input must not exceed ${limits.maxPcmBytes} bytes`);

  const deadline = clock() + limits.timeoutMs;
  const remainingTimeout = () => {
    const remaining = deadline - clock();
    if (remaining <= 0) throw new LegacyASRError("ASR exceeded its total timeout");
    return remaining;
  };

  let socket;
  let sentFrames = 0;
  let receivedFrames = 0;
  let committed = "";
  let replacing = "";
  let phase = "bootstrap";
  try {
    const authorization = await authFetcher({ timeoutMs: Math.min(10000, remainingTimeout()) });
    const { appId, authUrl } = authorization;
    if (authorization.serviceHost !== IFLYTEK_ASR_HOST) throw new LegacyASRError("ASR authorization host changed unexpectedly");
    phase = "connect";
    try {
      socket = await connector(authUrl, { timeoutMs: Math.min(15000, remainingTimeout()) });
    } catch (error) {
      if (error instanceof LegacyASRError) throw error;
      throw new LegacyASRError("ASR connection failed; request was not retried");
    }
    const acceptResponse = (raw, uploadComplete) => {
      if (raw === null) throw new LegacyASRError("ASR closed before its final frame");
      remainingTimeout();
      receivedFrames += 1;
      let document;
      try {
        document = JSON.parse(raw);
      } catch {
        throw new LegacyASRError("ASR returned malformed JSON");
      }
      if (!isPlainObject(document) || document.code !== 0) {
        const code = isPlainObject(document) && Number.isInteger(document.code)
          && document.code >= -(2 ** 31) && document.code <= 2 ** 31 - 1 ? document.code : null;
        const error = new LegacyASRError(`ASR returned error code ${code ?? "<invalid>"}`);
        if (code !== null) error.upstreamCode = code;
        throw error;
      }
      const text = wordsFromResult(document);
      const data = document.data;
      const result = isPlainObject(data) ? data.result : null;
      const pgs = isPlainObject(result) ? result.pgs : null;
      if (pgs) {
        if (pgs === "apd") committed = replacing || committed;
        replacing = committed + text;
      } else {
        committed += text;
      }
      if (isPlainObject(data) && data.status === 2) {
        if (!uploadComplete) throw new LegacyASRError("ASR ended before the complete PCM upload");
        return true;
      }
      return false;
    };
    const drainBufferedResponses = async () => {
      // Consume only the snapshot already owned by BoundedSocket. Short default
      // calls retain their original upload-then-read order. No diagnostic read,
      // second reader, new wire field or renewed deadline is introduced.
      if (limits.maxAudioSeconds <= 10 || !Array.isArray(socket.queue)) return;
      const pending = socket.queue.length;
      for (let count = 0; count < pending; count++) {
        if (receivedFrames >= limits.maxReceivedFrames) throw new LegacyASRError("ASR exceeded its response-frame limit");
        acceptResponse(await socket.recvMessage(remainingTimeout()), false);
      }
    };
    const send = (document) => socket.sendText(JSON.stringify(document));
    phase = "upload";
    for (let offset = 0; offset < pcm.byteLength; offset += PCM_CHUNK_BYTES) {
      remainingTimeout();
      send(buildAsrFrame(pcm.subarray(offset, offset + PCM_CHUNK_BYTES), { appId, status: offset === 0 ? 0 : 1, language: spokenLanguage }));
      sentFrames += 1;
      await drainBufferedResponses();
      await sleeper(Math.min(40, remainingTimeout()));
      await drainBufferedResponses();
    }
    remainingTimeout();
    send(buildAsrFrame(new Uint8Array(0), { appId, status: 2, language: spokenLanguage }));
    sentFrames += 1;

    phase = "receive";
    while (receivedFrames < limits.maxReceivedFrames) {
      const raw = await socket.recvMessage(remainingTimeout());
      if (acceptResponse(raw, true)) {
        return {
          transcript: replacing || committed,
          sentFrames,
          receivedFrames,
          resourceLimits: limits,
        };
      }
    }
    throw new LegacyASRError("ASR exceeded its response-frame limit");
  } catch (error) {
    const failure = error instanceof LegacyASRError ? error : new LegacyASRError("ASR failed; request was not retried");
    Object.assign(failure, { asrPhase: phase, sentFrames, receivedFrames,
      resourceLimits: limits, partialTranscript: replacing || committed,
    });
    throw failure;
  } finally {
    socket?.close();
  }
}
