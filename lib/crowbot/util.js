// Small shared helpers for the hosted CrowBot AI gateway. Everything here is
// dependency-free and runs identically under the Workers runtime and Node.

const encoder = new TextEncoder();
const strictDecoder = new TextDecoder("utf-8", { fatal: true });

export function utf8Encode(text) {
  return encoder.encode(String(text));
}

export function utf8DecodeStrict(bytes) {
  return strictDecoder.decode(bytes);
}

/** Count Unicode code points, matching Python's len() on str. */
export function codePointLength(text) {
  let count = 0;
  for (const _char of String(text)) count += 1;
  return count;
}

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

export function nowMs() {
  return Date.now();
}

export function bytesToBase64(bytes) {
  let binary = "";
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let at = 0; at < view.length; at += 0x8000) {
    binary += String.fromCharCode.apply(null, view.subarray(at, at + 0x8000));
  }
  return btoa(binary);
}

const BASE64_STRICT = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * Strict base64 decode: canonical alphabet, correct padding, length a
 * multiple of four. Returns null instead of throwing on any defect, the
 * same fail-closed behaviour the local gateway applies to audio_base64.
 */
export function base64ToBytesStrict(text) {
  if (typeof text !== "string" || text.length % 4 !== 0 || !BASE64_STRICT.test(text)) {
    return null;
  }
  let binary;
  try {
    binary = atob(text);
  } catch {
    return null;
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function base64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Opaque locally generated correlation or response id (prefix + 18 random bytes). */
export function newPublicId(prefix) {
  const cleanPrefix = String(prefix).replace(/[^A-Za-z0-9]/g, "") || "cb";
  const random = new Uint8Array(18);
  crypto.getRandomValues(random);
  return `${cleanPrefix}_${base64Url(random)}`;
}

/** Constant-time equality of two strings via fixed-length digests. */
export async function constantTimeEqual(left, right) {
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", utf8Encode(String(left))),
    crypto.subtle.digest("SHA-256", utf8Encode(String(right))),
  ]);
  const aBytes = new Uint8Array(a);
  const bBytes = new Uint8Array(b);
  let difference = 0;
  for (let index = 0; index < aBytes.length; index += 1) {
    difference |= aBytes[index] ^ bBytes[index];
  }
  return difference === 0;
}

/** Read a body stream, failing once it grows past maxBytes. */
export async function readBounded(stream, maxBytes, tooLarge = "body exceeds the bound") {
  if (!stream) return new Uint8Array(0);
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new Error(tooLarge);
      }
      chunks.push(value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // The stream may already be closed; nothing else to release.
    }
  }
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
}
