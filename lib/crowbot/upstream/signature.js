// The anonymous timestamp-signed request envelope shared by the recovered
// image, speech-recognition bootstrap, and catalogue routes. Mirrors
// src/stickermate/ai_catalog.py: user_id 0 only, no key, no identity.

import { md5Hex } from "./md5.js";
import { isPlainObject, utf8Encode } from "../util.js";

// Embedded in the preserved client bundle. It creates a per-request
// catalogue signature; it is not an inference key or an entitlement.
export const CLIENT_SIGNING_MARKER = ".nice@friend.ai.";

export const SIGNED_REQUEST_HEADERS = Object.freeze({
  "Accept-Language": "en",
  "Content-Type": "application/json",
  device_id: "",
});

export class SignedRouteError extends Error {
  constructor(message) {
    super(message);
    this.name = "SignedRouteError";
  }
}

export function makeCatalogAuthorization(timestampMs, userId = 0) {
  const timestamp = Math.trunc(Number(timestampMs));
  const user = Math.trunc(Number(userId));
  return md5Hex(`${timestamp}${CLIENT_SIGNING_MARKER}${user}.${timestamp}`);
}

export function buildCatalogPayload(timestampMs, { userId = 0, appVersion = "8.07.29", appName = "FriendAI" } = {}) {
  const timestamp = Math.trunc(Number(timestampMs));
  const user = Math.trunc(Number(userId));
  if (user !== 0) {
    throw new Error("the bounded catalogue client permits anonymous user_id 0 only");
  }
  return {
    Authorization: makeCatalogAuthorization(timestamp, user),
    app_version: String(appVersion),
    app_name: String(appName),
    user_id: user,
    timestamp,
  };
}

/**
 * One bounded signed POST to an exact recovered endpoint. Returns the parsed
 * JSON object; anything else (non-2xx, non-object, timeout) throws. Never
 * retried.
 */
export async function signedPost(endpoint, extraFields = {}, { timeoutMs = 10000, fetchImpl = fetch, timestampMs = null, maxTimeoutMs = 30000, minTimeoutMs = 1000 } = {}) {
  const timeout = Number(timeoutMs);
  const ceiling = Number(maxTimeoutMs);
  const minimum = Number(minTimeoutMs);
  // Only an explicitly scoped caller may use its source-backed longer wait;
  // the shared catalogue/ASR default remains the existing thirty seconds.
  if (!(minimum >= 1 && minimum <= 1000 && ceiling >= 1000 && ceiling <= 90000
      && timeout >= minimum && timeout <= ceiling)) {
    throw new RangeError("timeout must fit the signed caller's local operation budget");
  }
  const timestamp = timestampMs === null ? Date.now() : Math.trunc(Number(timestampMs));
  const body = JSON.stringify({ ...buildCatalogPayload(timestamp), ...extraFields });
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { ...SIGNED_REQUEST_HEADERS },
    body: utf8Encode(body),
    signal: AbortSignal.timeout(Math.ceil(timeout)),
  });
  if (!response.ok) {
    throw new SignedRouteError(`signed route answered HTTP ${response.status}`);
  }
  let document;
  try {
    document = await response.json();
  } catch {
    throw new SignedRouteError("signed route returned malformed JSON");
  }
  if (!isPlainObject(document)) {
    throw new SignedRouteError("signed route response must be a JSON object");
  }
  return document;
}
