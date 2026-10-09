// The recovered anonymous single-voice text-to-speech socket, mirroring
// src/stickermate/legacy_tts.py: one connect, one JSON string of text, one
// text reply carrying an audio URL, no retry. The route has no speaker field.

import { openBoundedSocket, safeFailureDetails } from "./ws.js";
import { prepareConnection } from "./cancellation.js";

export const LEGACY_TTS_ENDPOINT = "wss://miaoxue.api.open.ocrmath.com/mx/textToSpeech";
export const LEGACY_TTS_ORIGIN = "https://miaoxue.api.open.ocrmath.com";
// Local transport/resource budget for the serialized UTF-8 JSON string.
// The recovered original caller does not establish an upstream text maximum.
export const MAX_TTS_PAYLOAD_BYTES = 1_048_576;
export const MAX_TTS_TIMEOUT_MS = 7_200_000; // finite local operation budget only
export const MAX_AUDIO_SOURCE_CHARS = 4096;
const TTS_FAILURE_PHASES = new Set(["connect", "send", "receive", "response"]);
const TTS_RESPONSE_REASONS = new Set(["read_eof", "non_text_response", "empty_response", "response_size", "invalid_url"]);
const TTS_TRANSPORT_PHASES = new Set(["handshake", "handshake_timeout", "receive", "receive_timeout"]);

/** Only fixed scalar diagnostics cross the private TTS error boundary. */
export function ttsFailureMetadata(error) {
  const phase = TTS_FAILURE_PHASES.has(error?.phase) ? error.phase : null;
  const transport = safeFailureDetails(error);
  const failurePhase = TTS_TRANSPORT_PHASES.has(transport.failurePhase) ? transport.failurePhase : null;
  return {
    phase,
    reason: phase === "response" && TTS_RESPONSE_REASONS.has(error?.reason) ? error.reason : null,
    sentFrames: error?.sentFrames === 1 ? 1 : 0,
    receivedFrames: error?.receivedFrames === 1 ? 1 : 0,
    failurePhase,
    upstreamHttpStatus: failurePhase === "handshake" ? transport.upstreamHttpStatus : null,
  };
}

export class LegacyTTSError extends Error {
  constructor(message, failure = {}) {
    super(message);
    this.name = "LegacyTTSError";
    Object.assign(this, ttsFailureMetadata(failure));
  }
}

/** The exact one-JSON-string body the recovered client sends. */
export function buildTtsPayload(text) {
  const content = String(text);
  if (!content.trim()) throw new RangeError("TTS text must not be empty");
  const payload = JSON.stringify(content);
  if (new TextEncoder().encode(payload).byteLength > MAX_TTS_PAYLOAD_BYTES) {
    throw new RangeError(`TTS payload must not exceed the local ${MAX_TTS_PAYLOAD_BYTES}-byte transport budget`);
  }
  return payload;
}

function defaultConnector(url, { origin, timeoutMs, signal }) {
  return openBoundedSocket(url, { origin, timeoutMs, signal });
}

export function prepareFixedSpeech({ timeoutMs = 10000, signal, connector = defaultConnector } = {}) {
  return prepareConnection(owned => connector(LEGACY_TTS_ENDPOINT, {
    origin: LEGACY_TTS_ORIGIN, timeoutMs: Math.min(10000, timeoutMs), signal: owned,
  }), signal);
}

function parseAudioSource(response, counts) {
  const failure = reason => ({ phase: "response", reason, ...counts });
  if (typeof response !== "string") {
    throw new LegacyTTSError("legacy TTS did not return a text URL", failure(response === null ? "read_eof" : "non_text_response"));
  }
  const audioSource = response.trim();
  if (!audioSource || audioSource.length > MAX_AUDIO_SOURCE_CHARS) {
    throw new LegacyTTSError("legacy TTS returned an invalid audio-source length", failure(!audioSource ? "empty_response" : "response_size"));
  }
  let parsed;
  try {
    parsed = new URL(audioSource);
  } catch {
    throw new LegacyTTSError("legacy TTS did not return a usable audio URL", failure("invalid_url"));
  }
  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !parsed.host) {
    throw new LegacyTTSError("legacy TTS did not return a usable audio URL", failure("invalid_url"));
  }
  return audioSource;
}

/** Send one bounded TTS request and return the audio URL it yields. */
export async function legacyTtsOnce(text, { timeoutMs = 20000, connector = defaultConnector, signal, prepared } = {}) {
  const timeout = Number(timeoutMs);
  if (!(timeout >= 1000 && timeout <= MAX_TTS_TIMEOUT_MS)) throw new RangeError("TTS timeout must fit the local 1 to 7200 second operation budget");
  const payload = buildTtsPayload(text);
  const deadline = Date.now() + timeout;

  let socket;
  try {
    socket = prepared ? await prepared.take() : await connector(LEGACY_TTS_ENDPOINT, { origin: LEGACY_TTS_ORIGIN, timeoutMs: Math.min(10000, timeout), signal });
  } catch (error) {
    throw new LegacyTTSError("legacy TTS connection failed; request was not retried", {
      phase: "connect", ...safeFailureDetails(error, "handshake"),
    });
  }
  let response;
  let phase = "send", sentFrames = 0, receivedFrames = 0, failure;
  try {
    if (signal?.aborted || Date.now() >= deadline) throw new Error("Speech deadline exceeded");
    socket.sendText(payload);
    sentFrames = 1;
    phase = "receive";
    response = await socket.recvMessage(deadline - Date.now());
    receivedFrames = response === null ? 0 : 1;
    phase = "response";
  } catch (error) {
    failure = new LegacyTTSError("legacy TTS failed; request was not retried", {
      phase, sentFrames, receivedFrames,
      ...safeFailureDetails(error, phase === "receive" ? "receive" : null),
    });
  } finally {
    try { socket.close(); } catch (error) {
      failure ??= new LegacyTTSError("legacy TTS failed; request was not retried", {
        phase, sentFrames, receivedFrames, ...safeFailureDetails(error),
      });
    }
  }
  if (failure) throw failure;
  return {
    anonymous: true,
    audioSource: parseAudioSource(response, { sentFrames, receivedFrames }),
    sentFrames: 1,
    receivedFrames: 1,
  };
}
