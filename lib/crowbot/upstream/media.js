// Bounded speech, image, transcription, and catalogue capabilities for the
// hosted gateway, mirroring src/crowbot_gateway/media.py. Speech and image
// resolve a route's URL to real media bytes inside the Worker so no upstream
// URL ever reaches a customer; every call is single-shot and never retried.

import { readBounded } from "../util.js";
import { DEFAULT_EDGE_VOICE, edgeTtsOnce, fetchEdgeVoices } from "./edge_tts.js";
import { transcribePcmOnce } from "./legacy_asr.js";
import { generateImageOnce } from "./legacy_image.js";
import { legacyTtsOnce } from "./legacy_tts.js";
import { querySpeakerCatalog, queryVoiceLanguages } from "./voice_catalog.js";
import { abortable, abortError } from "./cancellation.js";

export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_REDIRECTS = 3;
export const EDGE_VOICE_CACHE_SECONDS = 86400;
export const SPEAKER_CATALOGUE_CACHE_SECONDS = 300;

// Hosts the recovered media routes actually hand back files from. The
// follow-up fetch is pinned so a hostile upstream reply cannot point the
// gateway at an arbitrary host.
export const ALLOWED_MEDIA_HOST_SUFFIXES = Object.freeze(["ocrmath.com", "yintb.com", "xfyun.cn", "friendai.cloud"]);

export class MediaError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "MediaError";
  }
}

export function hostAllowed(hostname, suffixes = ALLOWED_MEDIA_HOST_SUFFIXES) {
  const host = String(hostname || "").toLowerCase();
  return suffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

function validateMediaUrl(url, allowedHostSuffixes, message) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new MediaError(message);
  }
  if (parsed.protocol !== "https:" || !parsed.host) throw new MediaError(message);
  if (!hostAllowed(parsed.hostname, allowedHostSuffixes)) throw new MediaError(message);
  return parsed;
}

function cancelMediaBody(response) {
  try { void response?.body?.cancel().catch(() => {}); } catch { /* Already closed or owned by a reader. */ }
}

/** Fixed speech opts into complete buffering without changing other media lanes. */
async function fetchCompleteMediaBytes(url, { timeoutMs, maxBytes, fetchImpl, allowedHostSuffixes, signal: parentSignal }) {
  const timeout = Number(timeoutMs);
  if (!Number.isFinite(timeout) || timeout <= 0 || !Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new MediaError("invalid complete media resource bound");
  }
  let current = validateMediaUrl(url, allowedHostSuffixes, "media URL must be https on an allowed vendor host").href;
  const deadline = Date.now() + timeout, controller = new AbortController();
  const signal = parentSignal ? AbortSignal.any([parentSignal, controller.signal]) : controller.signal;
  const check = () => {
    if (signal.aborted || Date.now() >= deadline) throw abortError();
  };
  const timer = setTimeout(() => controller.abort(), Math.max(1, Math.ceil(timeout)));
  let response, reader, complete = false;
  try {
    for (let hop = 0; ; hop++) {
      check();
      const opening = Promise.resolve().then(() => {
        check();
        return fetchImpl(current, { method: "GET", redirect: "manual", signal });
      });
      // A transport that ignores cancellation may still return an owned body.
      opening.then(late => { if (signal.aborted || Date.now() >= deadline) cancelMediaBody(late); }, () => {});
      response = await abortable(opening, signal);
      check();
      if (response.redirected || (response.url && response.url !== current)) throw new MediaError("media response changed its route");
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        cancelMediaBody(response);
        response = null;
        if (hop >= MAX_REDIRECTS || !location) throw new MediaError("media redirect could not complete");
        const next = new URL(location, current);
        current = validateMediaUrl(next.href, allowedHostSuffixes, "media redirect left the allowed vendor hosts").href;
        continue;
      }
      break;
    }
    // A partial response cannot satisfy a whole-audio request.
    if (response.status !== 200) throw new MediaError("complete media requires HTTP 200");
    const lengthHeader = response.headers.get("content-length");
    let declaredLength = null;
    if (lengthHeader !== null) {
      if (!lengthHeader.length || /[^0-9]/.test(lengthHeader)) throw new MediaError("media has an invalid content length");
      declaredLength = Number(lengthHeader);
      if (!Number.isSafeInteger(declaredLength)) throw new MediaError("media has an invalid content length");
    }
    // Content-Length describes the coded representation. Fetch may expose
    // decoded bytes; only identity bodies can be compared with that header.
    const encoding = String(response.headers.get("content-encoding") || "").trim().toLowerCase();
    const expected = encoding === "" || encoding === "identity" ? declaredLength : null;
    if (expected !== null && expected > maxBytes) throw new MediaError("media exceeded the gateway size bound");
    reader = response.body?.getReader();
    if (!reader) throw new MediaError("media fetch returned no bytes");
    const chunks = []; let total = 0;
    for (;;) {
      check();
      const { done, value } = await abortable(reader.read(), signal);
      check();
      if (done) break;
      if (!(value instanceof Uint8Array) || total + value.byteLength > maxBytes) throw new MediaError("media exceeded the gateway size bound");
      if (expected !== null && total + value.byteLength > expected) throw new MediaError("media exceeded its declared length");
      if (value.byteLength) { chunks.push(value); total += value.byteLength; }
    }
    if (!total || expected !== null && total !== expected) throw new MediaError("media did not return its complete body");
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    check();
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    complete = true;
    return { bytes, contentType };
  } catch (error) {
    throw new MediaError(error?.message === "media exceeded the gateway size bound" ? error.message : "media fetch failed; not retried");
  } finally {
    clearTimeout(timer);
    controller.abort();
    if (!complete) {
      if (reader) { try { void reader.cancel().catch(() => {}); } catch { /* Already closed. */ } }
      else cancelMediaBody(response);
    }
    try { reader?.releaseLock(); } catch { /* A pending read was cancelled. */ }
  }
}

/** Fetch one bounded media URL and return its bytes and content type. */
export async function fetchMediaBytes(url, {
  timeoutMs,
  maxBytes,
  fetchImpl = fetch,
  allowedHostSuffixes = ALLOWED_MEDIA_HOST_SUFFIXES,
  signal: parentSignal,
  onHeaders,
  onChunk,
  completeBody = false,
} = {}) {
  if (completeBody === true) return fetchCompleteMediaBytes(url, { timeoutMs, maxBytes, fetchImpl, allowedHostSuffixes, signal: parentSignal });
  let current = validateMediaUrl(url, allowedHostSuffixes, "media URL must be https on an allowed vendor host").href;
  const timeoutSignal = AbortSignal.timeout(Math.max(1, Math.ceil(Number(timeoutMs))));
  const signal = parentSignal ? AbortSignal.any([parentSignal, timeoutSignal]) : timeoutSignal;
  let response;
  for (let hop = 0; ; hop += 1) {
    try {
      response = await fetchImpl(current, { method: "GET", redirect: "manual", signal });
    } catch {
      throw new MediaError("media fetch failed; not retried");
    }
    if (response.status >= 300 && response.status < 400) {
      if (onChunk) void response.body?.cancel().catch(() => {});
      if (hop >= MAX_REDIRECTS) throw new MediaError("media fetch followed too many redirects");
      const location = response.headers.get("location");
      if (!location) throw new MediaError("media redirect lacked a location");
      let next;
      try {
        next = new URL(location, current);
      } catch {
        throw new MediaError("media redirect left the allowed vendor hosts");
      }
      // Re-validate before a single byte is read from the new host.
      current = validateMediaUrl(next.href, allowedHostSuffixes, "media redirect left the allowed vendor hosts").href;
      continue;
    }
    break;
  }
  if (!response.ok) {
    if (onChunk) void response.body?.cancel().catch(() => {});
    throw new MediaError(`media fetch answered HTTP ${response.status}`);
  }
  const header = response.headers.get("content-type") || "";
  const contentType = header.split(";")[0].trim().toLowerCase();
  const lengthHeader = response.headers.get('content-length');
  const declaredLength = lengthHeader !== null && /^\d+$/.test(lengthHeader) ? Number(lengthHeader) : null;
  let data;
  try {
    onHeaders?.({ contentType, url: current });
    if (onChunk && declaredLength > maxBytes) throw new MediaError('media exceeded the gateway size bound');
    if (!onChunk) data = await readBounded(response.body, maxBytes, "media exceeded the gateway size bound");
    else {
      const reader = response.body?.getReader();
      if (!reader) throw new MediaError("media fetch returned no bytes");
      const chunks = [];
      let total = 0, complete = false;
      try {
        while (true) {
          const item = await abortable(reader.read(), signal);
          if (signal.aborted) throw abortError();
          if (item.done) { complete = true; break; }
          const bytes = item.value;
          if (!(bytes instanceof Uint8Array) || total + bytes.length > maxBytes) throw new MediaError("media exceeded the gateway size bound");
          if (!bytes.length) continue;
          total += bytes.length;
          chunks.push(bytes);
          await abortable(onChunk(bytes), signal);
        }
      } finally {
        if (!complete) void reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      data = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
      if (declaredLength !== null && total < declaredLength) throw new MediaError('media ended before its declared length');
    }
  } catch (error) {
    if (onChunk && !response.body?.locked) void response.body?.cancel().catch(() => {});
    throw new MediaError(error?.message === "media exceeded the gateway size bound" ? error.message : "media fetch failed; not retried");
  }
  if (!data.byteLength) throw new MediaError("media fetch returned no bytes");
  return { bytes: data, contentType };
}

const SUFFIX_TYPES = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function contentTypeFor(url, headerType, fallback) {
  if (headerType && headerType !== "application/octet-stream") return headerType;
  let path = "";
  try {
    path = new URL(url).pathname;
  } catch {
    path = String(url);
  }
  const suffix = path.split(".").pop().toLowerCase();
  return SUFFIX_TYPES[suffix] || fallback;
}

/** Speak one bounded text through the single-voice vendor route and return real audio bytes. */
export async function synthesizeSpeech(text, { timeoutMs = 20000, ttsCaller = legacyTtsOnce, fetcher = fetchMediaBytes, signal } = {}) {
  const deadline = Date.now() + timeoutMs;
  const controller = new AbortController();
  const operationSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  const timer = setTimeout(() => controller.abort(), Math.max(1, Math.ceil(timeoutMs)));
  const check = () => {
    if (operationSignal.aborted || Date.now() >= deadline) throw new MediaError("Speech deadline exceeded");
  };
  try {
    check();
    let result;
    try {
      result = await abortable(Promise.resolve().then(() => {
        check();
        return ttsCaller(text, { timeoutMs, signal: operationSignal });
      }), operationSignal);
    } catch {
      throw new MediaError("speech route failed; not retried");
    }
    check();
    const url = String(result?.audioSource || "");
    const remaining = deadline - Date.now();
    const { bytes, contentType } = await abortable(Promise.resolve().then(() => {
      check();
      return fetcher(url, { timeoutMs: Math.min(15000, remaining), maxBytes: MAX_AUDIO_BYTES,
        signal: operationSignal, completeBody: true });
    }), operationSignal);
    check();
    const audioType = contentTypeFor(url, contentType, "audio/mpeg");
    if (audioType !== "audio/mpeg") throw new MediaError("fixed speech returned an incompatible content type");
    return { audio: bytes, contentType: audioType };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

/** Live voice forwards each validated MPEG chunk before the media fetch ends. */
export async function streamSpeech(text, {
  timeoutMs = 20000, ttsCaller = legacyTtsOnce, fetcher = fetchMediaBytes,
  signal, maxBytes = MAX_AUDIO_BYTES, onChunk, prepared,
} = {}) {
  if (typeof onChunk !== 'function' || !Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_AUDIO_BYTES) throw new MediaError('Invalid speech stream');
  const deadline = Date.now() + timeoutMs;
  let result;
  try { result = await ttsCaller(text, { timeoutMs, signal, prepared }); }
  catch { throw new MediaError('Speech route failed; not retried'); }
  const remaining = deadline - Date.now();
  if (remaining <= 0 || signal?.aborted) throw new MediaError('Speech deadline exceeded');
  const url = String(result?.audioSource || '');
  let admitted = false;
  const { bytes } = await fetcher(url, {
    timeoutMs: Math.min(15000, remaining), maxBytes, signal,
    onHeaders({ contentType, url: finalUrl }) {
      if (contentTypeFor(finalUrl, contentType, 'audio/mpeg') !== 'audio/mpeg') throw new MediaError('Speech returned an unexpected content type');
      admitted = true;
    },
    onChunk: chunk => {
      if (!admitted) throw new MediaError('Speech media headers were not validated');
      return onChunk(chunk, { contentType: 'audio/mpeg' });
    },
  });
  return { bytes: bytes.length, contentType: 'audio/mpeg' };
}

/**
 * Speak one bounded text in one selectable neural voice and return real audio
 * bytes. `prosody` is a character preset's `{pitch, rate, volume}`; without
 * it the voice is spoken exactly as before.
 */
export async function synthesizeSpeechWithVoice(text, voice, { timeoutMs = 20000, prosody, edgeCaller = edgeTtsOnce } = {}) {
  let result;
  try {
    result = await edgeCaller(text, { voice: voice || DEFAULT_EDGE_VOICE, timeoutMs, ...(prosody ? { prosody } : {}) });
  } catch {
    throw new MediaError("voice speech route failed; not retried");
  }
  if (!(result?.audio instanceof Uint8Array) || !result.audio.byteLength) {
    throw new MediaError("voice speech route returned no audio");
  }
  return { audio: result.audio, contentType: result.contentType || "audio/mpeg", voice: result.voice };
}

/** Generate one bounded image and return real image bytes. */
export async function generateImage(prompt, { style = "", timeoutMs = 90000, imageCaller = generateImageOnce, fetcher = fetchMediaBytes, clock = () => Date.now() } = {}) {
  const timeout = Number(timeoutMs);
  if (!(timeout >= 5000 && timeout <= 90000)) throw new RangeError("image timeout must be between 5 and 90 seconds");
  const deadline = clock() + timeout;
  let result;
  try {
    const remaining = deadline - clock();
    if (remaining <= 0) throw new MediaError("image operation exceeded its local time budget");
    result = await imageCaller(prompt, { style, timeoutMs: remaining });
  } catch {
    throw new MediaError("image route failed; not retried");
  }
  const url = String(result?.imageUrl || "");
  const remaining = deadline - clock();
  if (remaining <= 0) throw new MediaError("image operation exceeded its local time budget");
  const { bytes, contentType } = await fetcher(url, { timeoutMs: Math.min(30000, remaining), maxBytes: MAX_IMAGE_BYTES });
  if (clock() >= deadline) throw new MediaError("image operation exceeded its local time budget");
  return { image: bytes, contentType: contentTypeFor(url, contentType, "image/jpeg") };
}

/** Transcribe one bounded 16 kHz mono PCM buffer and return the text. */
export async function transcribeSpeech(pcm, { language = "", timeoutMs = 30000, maxAudioSeconds = 10, transcriber = transcribePcmOnce } = {}) {
  let result;
  try {
    result = await transcriber(pcm, { language, timeoutMs,
      ...(maxAudioSeconds !== 10 ? { maxAudioSeconds } : {}) });
  } catch (error) {
    throw new MediaError("transcription route failed; not retried", { cause: error });
  }
  return { transcript: String(result?.transcript ?? "") };
}

/** A small in-isolate TTL cache; isolates are ephemeral, so this is opportunistic. */
export class TtlCache {
  constructor(ttlSeconds, clock = () => Date.now()) {
    this.ttlMs = Number(ttlSeconds) * 1000;
    this.clock = clock;
    this.entry = null;
  }

  get() {
    if (!this.entry) return null;
    if (this.clock() - this.entry.storedAt > this.ttlMs) return null;
    return this.entry.value;
  }

  put(value) {
    this.entry = { value, storedAt: this.clock() };
    return value;
  }
}

const edgeVoiceCache = new TtlCache(EDGE_VOICE_CACHE_SECONDS);
const speakerCache = new TtlCache(SPEAKER_CATALOGUE_CACHE_SECONDS);

/** The selectable voice list, cached for a day inside the isolate. */
export async function listEdgeVoices({ timeoutMs = 10000, fetcher = fetchEdgeVoices, cache = edgeVoiceCache } = {}) {
  const cached = cache.get();
  if (cached) return cached;
  let voices;
  try {
    voices = await fetcher({ timeoutMs });
  } catch {
    throw new MediaError("voice list failed; not retried");
  }
  return cache.put(voices);
}

/** The vendor's read-only language and speaker catalogues, cached briefly. */
export async function listVendorSpeakers({
  timeoutMs = 10000,
  languageQuery = queryVoiceLanguages,
  speakerQuery = querySpeakerCatalog,
  cache = speakerCache,
} = {}) {
  const cached = cache.get();
  if (cached) return cached;
  let languages;
  let speakers;
  try {
    languages = await languageQuery({ timeoutMs });
    speakers = await speakerQuery({ timeoutMs });
  } catch {
    throw new MediaError("speaker catalogue failed; not retried");
  }
  return cache.put({ languages, speakers });
}
