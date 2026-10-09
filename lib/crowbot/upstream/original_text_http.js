// Complete original JSON responses for the text caller and its policy read.
// One fixed request; cancellation and the deadline cover headers and the body.
import { abortable, abortError } from "./cancellation.js";

export async function fetchCompleteOriginalText(endpoint, init, {
  fetchImpl = fetch, signal, timeoutMs, maxBytes,
}) {
  if (signal?.aborted) throw abortError();
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const deadline = Date.now() + timeoutMs;
  const timer = setTimeout(abort, Math.max(1, Math.ceil(timeoutMs)));
  let reader, response, complete = false;
  const check = () => {
    if (signal?.aborted || controller.signal.aborted || Date.now() >= deadline) throw abortError();
  };
  const cancelBody = (value) => { try { void value?.body?.cancel().catch(() => {}); } catch {} };
  try {
    check();
    const opening = Promise.resolve().then(() => {
      check();
      return fetchImpl(endpoint, { ...init, redirect: "manual", credentials: "omit", signal: controller.signal });
    });
    opening.then(value => { if (controller.signal.aborted) cancelBody(value); }, () => {});
    response = await abortable(opening, controller.signal);
    check();
    if (response.status !== 200 || response.headers.has("content-range")
        || response.url && response.url !== endpoint) {
      const error = new Error("original text response was incomplete or changed endpoint");
      error.httpStatus = response.status;
      throw error;
    }
    const encoded = response.headers.get("content-encoding");
    const rawLength = response.headers.get("content-length");
    const length = !encoded || encoded.toLowerCase() === "identity"
      ? rawLength === null ? null : /^\d+$/.test(rawLength) ? Number(rawLength) : NaN
      : null;
    if (length !== null && (!Number.isSafeInteger(length) || length < 0 || length > maxBytes)) throw new Error("original text response has an invalid length");
    reader = response.body?.getReader();
    if (!reader) throw new Error("original text response has no body");
    const chunks = []; let total = 0;
    for (;;) {
      check();
      const { done, value } = await abortable(reader.read(), controller.signal);
      check();
      if (done) break;
      if (!(value instanceof Uint8Array) || total + value.byteLength > maxBytes
          || length !== null && total + value.byteLength > length) throw new Error("original text response exceeds its complete body bound");
      chunks.push(value); total += value.byteLength;
    }
    if (!total || length !== null && total !== length) throw new Error("original text response ended before its declared length");
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    check(); complete = true;
    return bytes;
  } finally {
    clearTimeout(timer); signal?.removeEventListener("abort", abort);
    if (!complete) {
      controller.abort();
      if (reader) { try { void reader.cancel().catch(() => {}); } catch {} }
      else cancelBody(response);
    }
    try { reader?.releaseLock(); } catch {}
  }
}
