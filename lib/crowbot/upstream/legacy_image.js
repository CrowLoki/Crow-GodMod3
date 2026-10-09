// The recovered anonymous text-to-image endpoint, mirroring
// src/stickermate/legacy_image.py: one signed POST, one response carrying a
// single image URL, no retry, no downloader here.

import { utf8DecodeStrict, utf8Encode } from "../util.js";
import { buildCatalogPayload, signedPost } from "./signature.js";
import { abortable } from "./cancellation.js";

export const LEGACY_IMAGE_ENDPOINT = "https://miaoxue.api.open.ocrmath.com/picture/pureTextToPicture";
// Local serialized UTF-8 resource budget; no prompt/style character maximum
// was recovered from the original image service caller.
export const MAX_IMAGE_PAYLOAD_BYTES = 1 << 20;
export const MAX_IMAGE_METADATA_BYTES = 1 << 20;

export class LegacyImageError extends Error {
  constructor(message) {
    super(message);
    this.name = "LegacyImageError";
  }
}

/** The prompt and style fields appended to the signed envelope. */
export function buildImageFields(prompt, { style = "", timestampMs = null } = {}) {
  const content = String(prompt);
  const styleValue = String(style);
  if (!content.trim()) throw new RangeError("image prompt must not be empty");
  // UTF-16 length is a lower bound for JSON UTF-8 encoding, including escaped
  // surrogate units. Reject that bound before allocating an oversized body.
  if (content.length + styleValue.length > MAX_IMAGE_PAYLOAD_BYTES) {
    throw new RangeError("image request exceeds the local 1 MiB serialized payload budget");
  }
  const fields = { prompt: content, style: styleValue };
  const timestamp = timestampMs === null ? Date.now() : Math.trunc(Number(timestampMs));
  const payload = JSON.stringify({ ...buildCatalogPayload(timestamp), ...fields });
  if (utf8Encode(payload).byteLength > MAX_IMAGE_PAYLOAD_BYTES) {
    throw new RangeError("image request exceeds the local 1 MiB serialized payload budget");
  }
  return fields;
}

function cancelImageBody(response) {
  try { void response.body?.cancel().catch(() => {}); } catch { /* Already closed or locked. */ }
}

function checkImageDeadline(signal, deadline, clock) {
  if (signal.aborted || clock() >= deadline) {
    throw new LegacyImageError("image metadata exceeded its local time budget");
  }
}

async function readImageMetadata(response, signal, deadline, clock) {
  checkImageDeadline(signal, deadline, clock);
  if (!response.body) throw new LegacyImageError("image metadata response has no body");
  const header = response.headers?.get("content-length");
  // Fetch may decode compressed bytes while retaining the wire-length
  // header. The local budget always measures delivered metadata bytes.
  const encoding = String(response.headers?.get("content-encoding") || "").trim().toLowerCase();
  let expected = null;
  if ((encoding === "" || encoding === "identity") && header !== null && header !== undefined) {
    if (!/^\d+$/.test(header)) throw new LegacyImageError("image metadata has an invalid content length");
    expected = Number(header);
    if (!Number.isSafeInteger(expected) || expected > MAX_IMAGE_METADATA_BYTES) {
      throw new LegacyImageError("image metadata exceeded its local byte budget");
    }
  }
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  try {
    for (;;) {
      checkImageDeadline(signal, deadline, clock);
      const { done, value } = await abortable(reader.read(), signal);
      checkImageDeadline(signal, deadline, clock);
      if (done) break;
      if (!(value instanceof Uint8Array) || received + value.byteLength > MAX_IMAGE_METADATA_BYTES) {
        throw new LegacyImageError("image metadata exceeded its local byte budget");
      }
      received += value.byteLength;
      chunks.push(value);
    }
    if (expected !== null && received !== expected) {
      throw new LegacyImageError("image metadata ended before its declared length");
    }
  } finally {
    // A stalled cancellation must not renew the finite generation deadline.
    try { void reader.cancel().catch(() => {}); } catch { /* Already closed. */ }
    try { reader.releaseLock(); } catch { /* A pending read was cancelled. */ }
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const document = JSON.parse(utf8DecodeStrict(bytes));
  checkImageDeadline(signal, deadline, clock);
  return document;
}

/** Send one bounded image request and return the single image URL. */
export async function generateImageOnce(prompt, { style = "", timeoutMs = 90000, fetchImpl = fetch, timestampMs = null, clock = () => Date.now() } = {}) {
  const timeout = Number(timeoutMs);
  // Both retained painting callers explicitly pass 9e4 to java_post.
  // The outer operation keeps its five-second minimum, while the lower
  // transport can spend the remaining portion after local setup.
  if (!(timeout >= 1 && timeout <= 90000)) throw new RangeError("timeout must be between 1 millisecond and 90 seconds");
  const deadline = clock() + timeout;
  const operationSignal = AbortSignal.timeout(Math.ceil(timeout));
  // Freeze one timestamp so validation measures the exact envelope signedPost
  // serializes; no upstream option is added and no request is split or retried.
  const timestamp = timestampMs === null ? Date.now() : Math.trunc(Number(timestampMs));
  const fields = buildImageFields(prompt, { style, timestampMs: timestamp });
  let document;
  try {
    checkImageDeadline(operationSignal, deadline, clock);
    document = await signedPost(LEGACY_IMAGE_ENDPOINT, fields, {
      timeoutMs: deadline - clock(), timestampMs: timestamp, maxTimeoutMs: 90000, minTimeoutMs: 1,
      fetchImpl: async (url, init) => {
        const signal = AbortSignal.any([operationSignal, init.signal]);
        checkImageDeadline(signal, deadline, clock);
        const pending = Promise.resolve(fetchImpl(url, { ...init, signal, redirect: "manual" }));
        // Even an injected transport settling after cancellation owns no
        // follow-up request or body; release that late response immediately.
        pending.then((late) => {
          if (signal.aborted || clock() >= deadline) cancelImageBody(late);
        }, () => {});
        const response = await abortable(pending, signal);
        try {
          checkImageDeadline(signal, deadline, clock);
          if (response.redirected || (response.url && response.url !== LEGACY_IMAGE_ENDPOINT)) {
            throw new LegacyImageError("image generation response changed endpoint");
          }
          if (!response.ok) cancelImageBody(response);
          return { ok: response.ok, status: response.status,
            json: async () => {
              try { return await readImageMetadata(response, signal, deadline, clock); }
              catch (error) { cancelImageBody(response); throw error; }
            } };
        } catch (error) {
          cancelImageBody(response);
          throw error;
        }
      },
    });
  } catch {
    throw new LegacyImageError("image request failed; request was not retried");
  }
  if (document.errno !== 0) throw new LegacyImageError("image service returned an error");
  const data = document.data;
  if (!Array.isArray(data) || data.length !== 1 || typeof data[0] !== "string") {
    throw new LegacyImageError("image service did not return exactly one URL");
  }
  const imageUrl = data[0].trim();
  let parsed;
  try {
    parsed = new URL(imageUrl);
  } catch {
    throw new LegacyImageError("image service returned an invalid URL");
  }
  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !parsed.host) {
    throw new LegacyImageError("image service returned an invalid URL");
  }
  checkImageDeadline(operationSignal, deadline, clock);
  return { anonymous: true, imageUrl, requestsSent: 1 };
}
