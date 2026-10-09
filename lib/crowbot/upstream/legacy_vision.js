// The printer's fixed image-understanding callers use common/request.js's
// Java envelope, not the distinct FriendAI catalogue envelope. Preserved
// 8.09.10 app SHA142c7ffe...: identify byte28187083 (90s), OCR byte17438796
// (helper default10s), Vue $request wiring byte21751423 -> module6660.
// Entire original pictures and complete returned readings stay unchanged.
import { buildJavaPayload } from "./java_signature.js";
import { isPlainObject, utf8DecodeStrict, utf8Encode } from "../util.js";

export const IDENTIFY_ENDPOINT = "https://miaoxue.api.open.ocrmath.com/mx/ai/identify_all_things";
export const OCR_ENDPOINT = "https://miaoxue.api.open.ocrmath.com/mx/ocr/textRecognition";
export const MAX_INLINE_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_DATA_URL_CHARS = Math.ceil(MAX_INLINE_IMAGE_BYTES / 3) * 4 + 23;
export const SMALL_IMAGE_DATA_URL_CHARS = 1_400_000;
export const MAX_LARGE_IMAGE_TIMEOUT_MS = 90_000;
export const MAX_OCR_TEXT_CHARS = 1500;
export const MAX_KEYWORD_CHARS = 400;
export const MAX_RESPONSE_BYTES = 1_048_576;
export const MAX_FULL_OCR_TEXT_UNITS = 262_144;
export const MAX_IDENTIFY_TIMEOUT_MS = 90_000;
export const MAX_OCR_TIMEOUT_MS = 10_000;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class LegacyVisionError extends Error {
  constructor(message) {
    super(message);
    this.name = "LegacyVisionError";
  }
}

/** Accept only an inline data URL of a bounded, ordinary image type. */
export function parseImageDataUrl(value) {
  const text = String(value ?? "");
  if (text.length > MAX_IMAGE_DATA_URL_CHARS) throw new RangeError(`image must not exceed ${MAX_IMAGE_DATA_URL_CHARS} characters`);
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(text);
  if (!match || !IMAGE_TYPES.has(match[1]) || match[2].length < 64) {
    throw new RangeError("image must be an inline data URL of a JPEG, PNG, or WebP picture");
  }
  return { mime: match[1], base64: match[2] };
}

function tidy(value, limit) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

/** Label one picture: the scene root and the keywords the service saw. */
export async function identifyImageOnce(dataUrl, { language = "en", ...options } = {}) {
  const { mime, base64 } = parseImageDataUrl(dataUrl);
  let document;
  try {
    document = await fullVisionPost(IDENTIFY_ENDPOINT, { base64: `data:${mime};base64,${base64}`, language: String(language || "en") }, options);
  } catch {
    throw new LegacyVisionError("image identification failed; request was not retried");
  }
  if (document.errno !== 0) throw new LegacyVisionError("image identification returned an error");
  const results = Array.isArray(document.data?.result) ? document.data.result : [];
  const keywords = tidy(results.map((row) => (row && typeof row === "object" ? row.keyword : "")).filter(Boolean).join("; "), MAX_KEYWORD_CHARS);
  const scene = tidy(results.length && results[0] && typeof results[0] === "object" ? results[0].root : "", 120);
  if (!keywords && !scene) throw new LegacyVisionError("image identification returned nothing");
  return { anonymous: true, scene, keywords, requestsSent: 1 };
}

/** Read the text in one picture. An empty page is a valid answer. */
export async function recognizeTextOnce(dataUrl, options = {}) {
  const { base64 } = parseImageDataUrl(dataUrl);
  let document;
  try {
    document = await fullVisionPost(OCR_ENDPOINT, { base64, line: false }, options);
  } catch {
    throw new LegacyVisionError("text recognition failed; request was not retried");
  }
  if (document.errno !== 0) throw new LegacyVisionError("text recognition returned an error");
  return { anonymous: true, text: tidy(typeof document.data === "string" ? document.data : "", MAX_OCR_TEXT_CHARS), requestsSent: 1 };
}

function waitForOcr(promise, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException("OCR request cancelled", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
    if (signal.aborted) abort();
  });
}

function cancelOcrBody(response) {
  try { void response.body?.cancel().catch(() => {}); } catch { /* Already closed. */ }
}

async function readFullOcrBody(response, signal, deadline) {
  if (!response.body) throw new LegacyVisionError("full text recognition response has no body");
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      if (performance.now() >= deadline) throw new LegacyVisionError("complete vision request exceeded its time budget");
      const { done, value } = await waitForOcr(reader.read(), signal);
      if (performance.now() >= deadline) throw new LegacyVisionError("complete vision request exceeded its time budget");
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) throw new LegacyVisionError("full text recognition exceeded its byte bound");
      chunks.push(value);
    }
  } finally {
    // Do not let a stalled cancellation renew the request's finite deadline.
    try { void reader.cancel().catch(() => {}); } catch { /* Already closed. */ }
    try { reader.releaseLock(); } catch { /* A pending read was cancelled. */ }
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const document = JSON.parse(utf8DecodeStrict(bytes));
  const pending = [document];
  while (pending.length) {
    const value = pending.pop();
    if (typeof value === "number" && !Number.isFinite(value)) throw new LegacyVisionError("vision response must use finite JSON numbers");
    if (value && typeof value === "object") for (const child of Object.values(value)) pending.push(child);
  }
  return document;
}

/** One complete response from either exact original vision endpoint. */
async function fullVisionPost(endpoint, fields, {
  timeoutMs = null, fetchImpl = fetch, timestampMs = null, _deadline = null,
  platform = "worker", locale = "en",
} = {}) {
  const sourceBudget = endpoint === IDENTIFY_ENDPOINT ? MAX_IDENTIFY_TIMEOUT_MS
    : endpoint === OCR_ENDPOINT ? (fields.base64.length + 23 > SMALL_IMAGE_DATA_URL_CHARS ? MAX_LARGE_IMAGE_TIMEOUT_MS : MAX_OCR_TIMEOUT_MS) : null;
  if (sourceBudget === null) throw new RangeError("only the recovered identification and OCR endpoints are allowed");
  const timeout = Number(timeoutMs ?? sourceBudget);
  if (!(timeout >= 1000 && timeout <= MAX_IDENTIFY_TIMEOUT_MS)) throw new RangeError("timeout must be between 1 and 90 seconds");
  // Preserve the original small-image allowance. Larger complete inputs have
  // an explicit local upload allowance, still bounded by the caller deadline.
  const deadline = Math.min(_deadline ?? Infinity, performance.now() + Math.min(timeout, sourceBudget));
  const body = utf8Encode(JSON.stringify({ ...await buildJavaPayload(timestampMs, { platform, locale }), ...fields }));
  const remaining = Math.ceil(deadline - performance.now());
  if (!(remaining > 0)) throw new LegacyVisionError("complete vision request exceeded its time budget");
  const signal = AbortSignal.timeout(remaining);
  const pending = Promise.resolve(fetchImpl(endpoint, {
    method: "POST", redirect: "manual", headers: { "Content-Type": "application/json" }, body, signal,
  }));
  // A late transport seam owns no later reading/request; release its body.
  pending.then((late) => { if (signal.aborted) cancelOcrBody(late); }, () => {});
  const response = await waitForOcr(pending, signal);
  if (response.redirected || (response.url && response.url !== endpoint)) {
    cancelOcrBody(response);
    throw new LegacyVisionError("complete vision response changed endpoint");
  }
  if (!response.ok) {
    cancelOcrBody(response);
    throw new LegacyVisionError("complete vision request returned an HTTP error");
  }
  const document = await readFullOcrBody(response, signal, deadline);
  if (!isPlainObject(document)) throw new LegacyVisionError("vision response must be a JSON object");
  return document;
}

/** Preserve the complete returned OCR string within finite local resources.
 * This preserves the returned string, not a claim of exact OCR transcription.
 */
export async function recognizeFullTextOnce(dataUrl, options = {}) {
  const { base64 } = parseImageDataUrl(dataUrl);
  let document;
  try {
    document = await fullVisionPost(OCR_ENDPOINT, { base64, line: false }, options);
  } catch {
    throw new LegacyVisionError("full text recognition failed; request was not retried");
  }
  if (document.errno !== 0) throw new LegacyVisionError("full text recognition returned an error");
  if (typeof document.data !== "string") throw new LegacyVisionError("full text recognition returned invalid text data");
  if (document.data.length > MAX_FULL_OCR_TEXT_UNITS) throw new LegacyVisionError("full text recognition exceeded its text bound");
  return { anonymous: true, text: document.data, requestsSent: 1 };
}

/** Preserve every original identification row, label character and whitespace.
 * The same original request retains a finite complete-response byte budget.
 */
export async function identifyFullImageOnce(dataUrl, options = {}) {
  const { mime, base64 } = parseImageDataUrl(dataUrl);
  const language = String(options.language || "en");
  let document;
  try {
    document = await fullVisionPost(IDENTIFY_ENDPOINT, { base64: `data:${mime};base64,${base64}`, language }, options);
  } catch {
    throw new LegacyVisionError("full image identification failed; request was not retried");
  }
  if (document.errno !== 0) throw new LegacyVisionError("full image identification returned an error");
  const results = document.data?.result;
  if (!Array.isArray(results) || results.some((row) => !row || typeof row !== "object" || Array.isArray(row))) {
    throw new LegacyVisionError("full image identification returned invalid result data");
  }
  // The original app retains all rows, including empty/null labels. These
  // derived strings never coerce or invalidate the raw array sent to chat.
  const keywords = results.map((row) => row.keyword).filter((value) => typeof value === "string" && value).join("; ");
  const scene = typeof results[0]?.root === "string" ? results[0].root : "";
  return { anonymous: true, scene, keywords, identification: results, requestsSent: 1 };
}

/** Require both complete original readings under one per-picture deadline.
 * A failed reading never becomes a partial successful description for chat.
 */
export async function describeFullImageOnce(dataUrl, options = {}) {
  parseImageDataUrl(dataUrl);
  const timeout = Number(options.timeoutMs ?? MAX_IDENTIFY_TIMEOUT_MS);
  if (!(timeout >= 1000 && timeout <= MAX_IDENTIFY_TIMEOUT_MS)) throw new RangeError("timeout must be between 1 and 90 seconds");
  const deadline = performance.now() + timeout;
  const bounded = { ...options, timeoutMs: timeout, _deadline: deadline };
  const [labels, reading] = await Promise.allSettled([
    identifyFullImageOnce(dataUrl, bounded), recognizeFullTextOnce(dataUrl, bounded),
  ]);
  if (labels.status !== "fulfilled" || reading.status !== "fulfilled" || performance.now() >= deadline) {
    const error = new LegacyVisionError("the complete picture could not be read; requests were not retried");
    error.upstreamAttempts = 2;
    throw error;
  }
  return {
    anonymous: true, scene: labels.value.scene, keywords: labels.value.keywords,
    identification: labels.value.identification, text: reading.value.text, requestsSent: 2,
  };
}

/** Both readings at once; one of them answering is enough to describe the picture. */
export async function describeImageOnce(dataUrl, options = {}) {
  parseImageDataUrl(dataUrl);
  const [labels, reading] = await Promise.allSettled([identifyImageOnce(dataUrl, options), recognizeTextOnce(dataUrl, options)]);
  if (labels.status === "rejected" && reading.status === "rejected") {
    throw new LegacyVisionError("the picture could not be read; requests were not retried");
  }
  return {
    anonymous: true,
    scene: labels.status === "fulfilled" ? labels.value.scene : "",
    keywords: labels.status === "fulfilled" ? labels.value.keywords : "",
    text: reading.status === "fulfilled" ? reading.value.text : "",
    requestsSent: 2,
  };
}
