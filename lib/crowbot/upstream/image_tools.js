// Fixed recovered FunPrint 8.09.10 image callers. Mirrors
// src/stickermate/image_tools.py and app_catalog.py; no configurable endpoint,
// upstream credential, device control, retry, or invented usage accounting.
import { base64ToBytesStrict, codePointLength, isPlainObject, readBounded, utf8DecodeStrict, utf8Encode } from "../util.js";
import { buildJavaPayload } from "./java_signature.js";
export { buildJavaPayload } from "./java_signature.js";
import { ALLOWED_MEDIA_HOST_SUFFIXES, fetchMediaBytes, hostAllowed, MAX_IMAGE_BYTES } from "./media.js";
import { parseImageDataUrl } from "./legacy_vision.js";
import { MAX_IMAGE_METADATA_BYTES, MAX_IMAGE_PAYLOAD_BYTES } from "./legacy_image.js";
import { abortable } from "./cancellation.js";
import { fetchCompleteOriginalText } from "./original_text_http.js";
import { originalAccountContext } from "./original_account_context.js";

export const IMAGE_TOOLS_SOURCE_SHA256 = "142c7ffe9f27eb4c99525947ecfbe1d430ecb97d72fd1cc6d06d8ee604f69867";
export const CURRENT_IMAGE_TOOLS_SOURCE_SHA256 = "ce4db1be2a7ea17f182be3dde5bc57c8c50f6bac08f7b717ed5b577691135eb2";
export const MAX_IMAGE_TOOL_RESPONSE_BYTES = Math.floor(MAX_IMAGE_BYTES * 4 / 3) + 65536;
// Local transport resources, not original model or text capacity claims.
// Image-guided calls retain their whole admitted picture and prompt together.
export const MAX_IMAGE_TOOL_REQUEST_BYTES = 16 * 1024 * 1024;
export const MAX_DESCRIPTION_UTF8_BYTES = MAX_IMAGE_TOOL_RESPONSE_BYTES;
export const MAX_PRINTER_CONTEXT_BYTES = 4 * 1024;
export const APP_POLICY_ENDPOINT = "https://miaoxue.api.open.ocrmath.com/mx/ai/query_ai_config";
export const CARTOON_STYLES = Object.freeze(["cartoon", "artstyle", "d3", "handdrawn", "sketch"]);
const BASE = "https://miaoxue.api.open.ocrmath.com";
const OPERATIONS = Object.freeze({
  painting: ["/picture/pureTextToPicture", "e332", 26103392, ["aihh"]],
  drawing: ["/picture/textToPicture", "5ac7", 16991804, ["aityhh"]],
  cartoon: ["/mx/ai/cartoon", "a01b", 22084187, ["airxdmh", "rxdmh"]],
  line_art: ["/mx/ai/get_line_image", "a2ff", 22148220, ["aixgt", "xgt"]],
  stick_figure: ["/mx/ai/image2stickfigure", "8898", 20386645, []],
  colour: ["/picture/color", "e41f", 26332124, ["aitpss", "tpss"]],
  words_art: ["/mx/ai/wordsArt", "d119", 25059111, []],
  object_description: ["/mx/ai/introduce", "f69a", 28188092, ["aisw"]],
});
const LANGUAGE = /^[A-Za-z]{2,8}(?:[-_][A-Za-z0-9]{2,8}){0,2}$/;
const PLACEHOLDER_SHA256 = "0ce0c836616bcd9d4fda2930c96edb564b8fb101a37a9a97c95838a354ff2f1d";
const POLICY_STATUSES = Object.freeze({ 1: "hidden_by_app_policy", 2: "unrestricted_by_app_policy", 3: "connection_required",
  4: "connection_and_local_total_limit", 5: "local_daily_limit", 7: "server_decision_required" });

export class ImageToolsError extends Error {
  constructor(message, { phase, upstreamAttempts = 0, httpStatus = null, upstreamCode = null } = {}) {
    super(message);
    this.name = "ImageToolsError";
    this.phase = phase;
    this.upstreamAttempts = upstreamAttempts;
    this.httpStatus = httpStatus;
    this.upstreamCode = upstreamCode;
  }
}

function operationDefinition(operation) {
  if (typeof operation !== "string" || !Object.hasOwn(OPERATIONS, operation)) throw new RangeError("unknown recovered image operation");
  return OPERATIONS[operation];
}

/** Private source provenance, never a statement that an invocation succeeded. */
export function imageOperationEvidence(operation) {
  const [, module, offset, features] = operationDefinition(operation);
  const currentSource = operation === "stick_figure";
  return { source_version: currentSource ? "8.09.22" : "8.09.10",
    source_sha256: currentSource ? CURRENT_IMAGE_TOOLS_SOURCE_SHA256 : IMAGE_TOOLS_SOURCE_SHA256,
    source_module: module, call_byte_offset: offset, policy_features: [...features], live_verified: false };
}

/** Normalize observed menu rules without inventing any missing permission. */
export function normalizeImageToolsPolicy(document) {
  const fail = () => { throw new ImageToolsError("app policy response is invalid", { phase: "policy", upstreamAttempts: 1 }); };
  if (!isPlainObject(document) || document.errno !== 0 || !isPlainObject(document.data)
      || !["1", "2"].some((key) => Object.hasOwn(document.data, key))) fail();
  const rules = [];
  for (const sourceRow of ["1", "2"]) {
    const entries = Object.hasOwn(document.data, sourceRow) ? document.data[sourceRow] : [];
    if (!Array.isArray(entries) || entries.length + rules.length > 256) fail();
    for (const original of entries) {
      const issues = [], entry = isPlainObject(original) ? original : {};
      if (entry !== original) issues.push("not_an_object");
      let feature = entry.language, name = entry.aiName, status = entry.status, limit = null;
      if (typeof feature !== "string" || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(feature)) { feature = null; issues.push("invalid_feature"); }
      if (typeof name !== "string" || !name.trim() || codePointLength(name) > 160) { name = null; issues.push("invalid_menu_name"); }
      if (!Number.isInteger(status) || !Object.hasOwn(POLICY_STATUSES, status)) { status = Number.isInteger(status) ? status : null; issues.push("unknown_status"); }
      if (entry.dailyLimit !== null && entry.dailyLimit !== undefined) {
        limit = isPlainObject(entry.dailyLimit) ? entry.dailyLimit.limit : null;
        if (!Number.isSafeInteger(limit) || limit < 0) { limit = null; issues.push("invalid_limit"); }
      }
      if ([4, 5].includes(status) && limit === null && !issues.includes("invalid_limit")) issues.push("missing_limit");
      rules.push({ feature, menu_name: name, status, limit, source_row: sourceRow, policy: POLICY_STATUSES[status] ?? "unknown",
        requires_connection: [3, 4].includes(status), requires_server_decision: status === 7,
        usage_scope: ({ 4: "local_total", 5: "local_daily", 7: "server" })[status] ?? "none",
        valid: !issues.length, may_invoke_without_further_checks: !issues.length && status === 2, issues });
    }
  }
  for (const rule of rules) {
    if (rule.feature !== null && rules.filter((other) => other.feature === rule.feature).length > 1) {
      rule.issues.push("duplicate_feature"); rule.valid = false; rule.may_invoke_without_further_checks = false;
    }
  }
  return { anonymous: true, configuration_only: true, usage_recorded: false,
    normalization_complete: rules.every((rule) => rule.valid), rules };
}

/** One read-only fixed menu request; no usage endpoint or identity state. */
export async function queryImageToolsPolicy({ platform, locale, timeoutMs = 10000, timestampMs = null, fetchImpl = fetch, signal, accountContext = null } = {}) {
  const account = originalAccountContext(accountContext);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) throw new RangeError("policy timeout must be between 1 and 30 seconds");
  const deadline = Date.now() + timeoutMs;
  if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
  const body = { ...await abortable(buildJavaPayload(timestampMs, { platform, locale, accountContext: account }), signal),
    version: "v2", user_label: account?.userLabel ?? "A", app_version: account?.appVersion ?? "8.09.10" };
  try {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new RangeError("policy request exceeded its time budget");
    const raw = await fetchCompleteOriginalText(APP_POLICY_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" },
      body: utf8Encode(JSON.stringify(body)) }, { fetchImpl, signal, timeoutMs: remaining, maxBytes: 262144 });
    const result = normalizeImageToolsPolicy(parseImageToolDocument(utf8DecodeStrict(raw)));
    if (Date.now() >= deadline) throw new RangeError("policy request exceeded its time budget");
    return account === null ? result : { ...result, anonymous: false };
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
    if (error instanceof ImageToolsError) throw error;
    throw new ImageToolsError("app policy request failed; not retried", { phase: "policy", upstreamAttempts: 1, httpStatus: error?.httpStatus ?? null });
  }
}

/** Only a trusted operator-side receipt adapter may construct this context. */
export class PrinterContext {
  constructor(model, evidenceSha256, evidenceKind = "retained_owned_printer_receipt") {
    if (typeof model !== "string" || !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,63}$/.test(model)) throw new RangeError("printer context requires an actual model name");
    if (typeof evidenceSha256 !== "string" || !/^[a-f0-9]{64}$/.test(evidenceSha256)) throw new RangeError("printer context requires its retained receipt fingerprint");
    if (evidenceKind !== "retained_owned_printer_receipt") throw new RangeError("printer context must describe retained owned-printer evidence");
    this.model = model;
    this.evidence_sha256 = evidenceSha256;
    this.evidence_kind = evidenceKind;
    Object.freeze(this);
  }
}

/** Status 1 is tile visibility; status 3 uses saved context, not an online claim. */
export function checkImageOperationPolicy(operation, rule, context = null) {
  const features = operationDefinition(operation)[3];
  return checkImagePolicyFeatures(features, rule, context);
}

/** Reuse the recovered menu rule without selecting an image operation. */
export function checkImagePolicyFeature(feature, rule, context = null) {
  return checkImagePolicyFeatures([feature], rule, context);
}

function checkImagePolicyFeatures(features, rule, context) {
  const fail = (message) => { throw new ImageToolsError(message, { phase: "policy" }); };
  if (!features.length) {
    if (rule !== null && rule !== undefined) throw new RangeError("this source operation has no mapped menu policy rule");
    return { status: null, printer_context_used: false, usage_recorded: false };
  }
  if (!isPlainObject(rule) || rule.valid !== true || !Array.isArray(rule.issues) || rule.issues.length) fail("a valid recovered app policy rule is required");
  if (!features.includes(rule.feature)) fail("app policy rule does not match this operation");
  const status = rule.status;
  if (!Number.isInteger(status) || ![1, 2, 3, 4, 5, 7].includes(status)) fail("app policy status is unresolved");
  if (typeof rule.menu_name !== "string" || !rule.menu_name.trim()) fail("app policy menu name is malformed");
  if (rule.limit !== null && rule.limit !== undefined && (!Number.isSafeInteger(rule.limit) || rule.limit < 0)) fail("app policy limit is malformed");
  if ([4, 5, 7].includes(status)) fail("this app policy needs its complete usage workflow");
  if (status === 3 && !(context instanceof PrinterContext)) fail("this app policy requires retained owned-printer context");
  return { status, menu_visible: status !== 1, printer_context_used: status === 3, usage_recorded: false };
}

function completeText(value, name, required = true) {
  if (typeof value !== "string" || (required && !value.trim())) throw new RangeError(`${name} must be ${required ? "nonempty " : ""}text`);
  return value;
}

/** Serialize the complete native request; never shorten fields to fit. */
export function imageToolPayloadBytes(payload) {
  const body = utf8Encode(JSON.stringify(payload));
  if (body.byteLength > MAX_IMAGE_TOOL_REQUEST_BYTES) throw new RangeError("image-tool request exceeds its local serialized UTF-8 budget");
  return body;
}

/** Preserve the complete returned field, including leading/trailing whitespace. */
export function validateFullObjectDescription(value) {
  const description = completeText(value, "description", false);
  if (utf8Encode(description).byteLength > MAX_DESCRIPTION_UTF8_BYTES) throw new RangeError("object description exceeds its local returned UTF-8 budget");
  return description;
}

function hasPrefix(bytes, expected, offset = 0) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

/** Raster signatures and bounds, not a claim of a complete pixel decode. */
export function imageBytesType(bytes) {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new RangeError("image bytes are empty or exceed the image limit");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 45 && hasPrefix(bytes, [137, 80, 78, 71, 13, 10, 26, 10])
      && hasPrefix(bytes, [73, 72, 68, 82], 12) && hasPrefix(bytes, [73, 69, 78, 68], bytes.length - 8)) {
    const width = view.getUint32(16), height = view.getUint32(20);
    if (width > 0 && height > 0 && width * height <= 36_000_000) return "image/png";
  }
  if (bytes.length >= 16 && hasPrefix(bytes, [255, 216, 255]) && hasPrefix(bytes, [255, 217], bytes.length - 2)) return "image/jpeg";
  if (bytes.length >= 20 && hasPrefix(bytes, [82, 73, 70, 70]) && hasPrefix(bytes, [87, 69, 66, 80], 8)
      && [[86, 80, 56, 32], [86, 80, 56, 76], [86, 80, 56, 88]].some((value) => hasPrefix(bytes, value, 12))
      && view.getUint32(4, true) + 8 === bytes.length) return "image/webp";
  throw new RangeError("response is not a supported raster image");
}

function validateInputImage(value) {
  const { mime, base64 } = parseImageDataUrl(value);
  const bytes = base64ToBytesStrict(base64);
  if (!bytes) throw new RangeError("image base64 is invalid");
  if (imageBytesType(bytes) !== mime) throw new RangeError("image MIME does not match its bytes");
  return `data:${mime};base64,${base64}`;
}

/** Preserve each source caller's fields; device style numbers are not accepted. */
export function buildImageOperationFields(operation, { imageDataUrl = null, prompt = null, style = null, text = null, language = "en", lineDrawing = null } = {}) {
  operationDefinition(operation);
  if (operation === "painting") {
    if (imageDataUrl !== null || text !== null) throw new RangeError("painting does not accept an image or text label");
    if (typeof prompt !== "string" || !prompt.trim() || typeof style !== "string") throw new RangeError("painting requires a nonempty prompt and unchanged style text");
    if (typeof lineDrawing !== "boolean") throw new RangeError("painting requires an explicit boolean lineDrawing mode");
    const fields = { prompt, style, line_drawing: lineDrawing ? "true" : "false" };
    if (utf8Encode(JSON.stringify(fields)).byteLength > MAX_IMAGE_PAYLOAD_BYTES) throw new RangeError("image request exceeds the local 1 MiB serialized payload budget");
    return fields;
  }
  if (lineDrawing !== null) throw new RangeError("lineDrawing only applies to painting");
  if (["drawing", "cartoon", "line_art", "colour", "stick_figure"].includes(operation)) {
    if (text !== null) throw new RangeError("this image operation does not accept text");
    const image = validateInputImage(imageDataUrl);
    if (operation === "drawing") {
      const fields = { base64: image, prompt: `${completeText(prompt, "drawing prompt")} ${completeText(style ?? "", "drawing style", false)}` };
      imageToolPayloadBytes(fields);
      return fields;
    }
    if (prompt !== null) throw new RangeError("this image operation does not accept a prompt");
    if (operation === "cartoon") {
      if (typeof style !== "string" || !CARTOON_STYLES.includes(style)) throw new RangeError("cartoon style must be one of the recovered five styles");
      return { base64: image, style };
    }
    if (style !== null) throw new RangeError("this image operation does not accept a style");
    return { base64: image };
  }
  if (imageDataUrl !== null || style !== null) throw new RangeError("this operation does not accept an image or style");
  if (operation === "words_art") {
    const fields = { txt: completeText(text, "text"), prompt: prompt === null || prompt === "" ? "大气磅礴" : completeText(prompt, "words art prompt") };
    imageToolPayloadBytes(fields);
    return fields;
  }
  if (prompt !== null) throw new RangeError("object description does not accept a chat prompt");
  if (typeof language !== "string" || !LANGUAGE.test(language)) throw new RangeError("object description requires the selected language");
  const fields = { txt: completeText(text, "text"), language };
  imageToolPayloadBytes(fields);
  return fields;
}

function validateImageUrl(value) {
  if (typeof value !== "string" || !value || value.length > 8192 || /[\u0000-\u0020\\]/.test(value)) throw new RangeError("image service returned an invalid image URL");
  const url = new URL(value);
  if (url.protocol !== "https:" || !hostAllowed(url.hostname, ALLOWED_MEDIA_HOST_SUFFIXES)
      || url.username || url.password || url.hash || /^https:\/\/[^/?#]*@/i.test(value)) throw new RangeError("image URL must use an allowed HTTPS media host");
  if (url.port) {
    const rawPath = /^https:\/\/[^/?#]+(\/[^?#]*)?$/i.exec(value)?.[1];
    const earnedTlsImage = url.hostname === "ocr.server.ocrmath.com" && url.port === "9000"
      && !value.includes("?") && !value.includes("#") && rawPath === url.pathname
      && /^(?:\/sketch\/|\/\/cartoon\/)[A-Za-z0-9][A-Za-z0-9._-]{0,180}\.jpg$/.test(url.pathname);
    if (!earnedTlsImage) throw new RangeError("image URL port/path is outside the recovered TLS media allowlist");
  }
  return value;
}

// Original I02 returns this HTTP media origin; the original app downloads its
// URL unchanged. This operation-specific route does not relax HTTPS media rules.
const ORIGINAL_DRAWING_HTTP = /^http:\/\/ai\.ocrmath\.com:9102\/scribble\/[0-9]{4}-[0-9]{2}-[0-9]{2}\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}\.jpg$/;
function isOriginalDrawingHttpUrl(value) {
  return typeof value === "string" && ORIGINAL_DRAWING_HTTP.test(value) && new URL(value).href === value;
}

async function fetchOriginalDrawingImage(url, { deadline, fetchImpl }) {
  if (!isOriginalDrawingHttpUrl(url)) throw new RangeError("drawing URL is outside the original media route");
  const controller = new AbortController(), signal = controller.signal;
  const check = () => {
    if (signal.aborted || Date.now() >= deadline) throw new RangeError("drawing media exceeded its time budget");
  };
  check();
  const timer = setTimeout(() => controller.abort(), Math.max(1, Math.ceil(deadline - Date.now())));
  let response, reader, complete = false;
  const cancelBody = value => { try { void value?.body?.cancel().catch(() => {}); } catch {} };
  try {
    const opening = Promise.resolve().then(() => {
      check();
      return fetchImpl(url, { method: "GET", credentials: "omit", redirect: "manual", signal });
    });
    // A late fetch result still owns a body even after our deadline rejected.
    opening.then(value => { if (signal.aborted) cancelBody(value); }, () => {});
    response = await abortable(opening, signal);
    check();
    if (response.status !== 200 || response.url !== url || response.redirected) throw new RangeError("original drawing media response changed route or status");
    const lengthHeader = response.headers.get("content-length");
    const declaredLength = lengthHeader === null ? null : /^\d+$/.test(lengthHeader) ? Number(lengthHeader) : NaN;
    if (declaredLength !== null && (!Number.isSafeInteger(declaredLength) || declaredLength > MAX_IMAGE_BYTES)) throw new RangeError("drawing media has an invalid content length");
    reader = response.body?.getReader();
    if (!reader) throw new RangeError("drawing media returned no body");
    const chunks = []; let total = 0;
    while (true) {
      check();
      const item = await abortable(reader.read(), signal);
      check();
      if (item.done) break;
      if (!(item.value instanceof Uint8Array) || total + item.value.length > MAX_IMAGE_BYTES ||
          declaredLength !== null && total + item.value.length > declaredLength) throw new RangeError("drawing media exceeded its complete body bound");
      if (item.value.length) { chunks.push(item.value); total += item.value.length; }
    }
    if (!total || declaredLength !== null && total !== declaredLength) throw new RangeError("drawing media ended before its complete body");
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    check();
    complete = true;
    return { bytes, contentType: response.headers.get("content-type") || "" };
  } finally {
    clearTimeout(timer);
    if (!complete) {
      controller.abort();
      if (reader) { try { void reader.cancel().catch(() => {}); } catch {} }
      else cancelBody(response);
    }
    try { reader?.releaseLock(); } catch {}
  }
}

// JSON.parse checks syntax first; this bounded second pass rejects duplicate
// object keys and non-finite numeric overflow like Python's strict parser.
export function parseImageToolDocument(raw) {
  const document = JSON.parse(raw);
  let at = 0;
  const whitespace = () => { while (/\s/.test(raw[at] ?? "")) at += 1; };
  function string() {
    const start = at++;
    while (at < raw.length) {
      const ch = raw[at++];
      if (ch === "\\") at += 1;
      else if (ch === '"') return JSON.parse(raw.slice(start, at));
    }
    throw new RangeError("malformed JSON string");
  }
  function value(depth) {
    if (depth > 64) throw new RangeError("response JSON nesting exceeds its bound");
    whitespace();
    const ch = raw[at];
    if (ch === '"') { string(); return; }
    if (ch === "{" || ch === "[") {
      at += 1;
      const close = ch === "{" ? "}" : "]", keys = new Set();
      whitespace();
      if (raw[at] === close) { at += 1; return; }
      for (;;) {
        if (ch === "{") {
          whitespace();
          const key = string();
          if (keys.has(key)) throw new RangeError("response contains duplicate JSON fields");
          keys.add(key); whitespace(); at += 1;
        }
        value(depth + 1); whitespace();
        if (raw[at++] === close) return;
      }
    }
    const start = at;
    while (at < raw.length && !/[\s,\]}]/.test(raw[at])) at += 1;
    if (/^-?\d/.test(raw.slice(start, at)) && !Number.isFinite(Number(raw.slice(start, at)))) throw new RangeError("response contains non-finite numbers");
  }
  value(0);
  return document;
}

function decodeWordsImage(value) {
  if (typeof value !== "string" || value.length > MAX_IMAGE_TOOL_RESPONSE_BYTES) throw new RangeError("words art returned invalid image data");
  let declaredType = null;
  if (value.startsWith("data:")) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) throw new RangeError("words art returned an unsupported image data URL");
    declaredType = match[1]; value = match[2];
  }
  const image = base64ToBytesStrict(value);
  const contentType = imageBytesType(image);
  if (declaredType && declaredType !== contentType) throw new RangeError("words art MIME does not match its image bytes");
  return { image, contentType };
}

/** One fixed operation plus its pinned media download. No policy mutation. */
export async function runImageOperationOnce(operation, {
  imageDataUrl = null, prompt = null, style = null, text = null, language = "en", lineDrawing = null,
  policyRule = null, printerContext = null, platform, locale, timeoutMs = 30000,
  timestampMs = null, fetchImpl = fetch, fetcher = fetchMediaBytes, signal, accountContext = null,
} = {}) {
  const account = originalAccountContext(accountContext);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 90000) throw new RangeError("image operation timeout must be between 1 and 90 seconds");
  const deadline = Date.now() + timeoutMs;
  const evidence = imageOperationEvidence(operation);
  const fields = buildImageOperationFields(operation, { imageDataUrl, prompt, style, text, language, lineDrawing });
  const policy = checkImageOperationPolicy(operation, policyRule, printerContext);
  const remaining = () => {
    if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
    const left = deadline - Date.now();
    if (left <= 0) throw new RangeError("image operation exceeded its time budget");
    return left;
  };
  const endpoint = BASE + operationDefinition(operation)[0];
  remaining();
  const payload = { ...await abortable(buildJavaPayload(timestampMs, { platform, locale, accountContext: account }), signal), ...fields };
  const serialized = operation === "painting" ? utf8Encode(JSON.stringify(payload)) : imageToolPayloadBytes(payload);
  if (operation === "painting" && serialized.byteLength > MAX_IMAGE_PAYLOAD_BYTES) throw new RangeError("image request exceeds the local 1 MiB serialized payload budget");
  let document;
  try {
    if (operation === "object_description") {
      const raw = await fetchCompleteOriginalText(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: serialized },
        { fetchImpl, signal, timeoutMs: remaining(), maxBytes: MAX_IMAGE_TOOL_RESPONSE_BYTES });
      remaining();
      document = parseImageToolDocument(utf8DecodeStrict(raw));
    } else {
    const response = await fetchImpl(endpoint, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/json" },
      body: serialized, signal: AbortSignal.timeout(Math.ceil(remaining())) });
    if (!response.ok) throw new ImageToolsError("image operation returned an HTTP error", { phase: "response", upstreamAttempts: 1, httpStatus: response.status });
    if (response.url && response.url !== endpoint) throw new ImageToolsError("image operation response changed endpoint", { phase: "response", upstreamAttempts: 1 });
    const raw = await readBounded(response.body, operation === "painting" ? MAX_IMAGE_METADATA_BYTES : MAX_IMAGE_TOOL_RESPONSE_BYTES);
    remaining();
    document = parseImageToolDocument(utf8DecodeStrict(raw));
    }
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
    if (error instanceof ImageToolsError) throw error;
    throw new ImageToolsError("image operation failed; request was not retried", { phase: "response", upstreamAttempts: 1, httpStatus: error?.httpStatus ?? null });
  }
  if (!isPlainObject(document) || !Number.isInteger(document.errno) || document.errno !== 0) throw new ImageToolsError("image operation returned an unsuccessful result", {
    phase: "result", upstreamAttempts: 1, upstreamCode: Number.isSafeInteger(document?.errno) ? document.errno : null });
  const base = { operation, anonymous: account === null, requestsSent: 1, evidence: { ...evidence, policy, response_received: true } };
  try {
    if (operation === "object_description") {
      const description = validateFullObjectDescription(document.data?.description);
      remaining();
      return { ...base, text: description };
    }
    let image, contentType;
    if (operation === "words_art") ({ image, contentType } = decodeWordsImage(document.data));
    else {
      let data = document.data;
      if (operation === "painting") {
        if (!Array.isArray(data) || data.length !== 1 || typeof data[0] !== "string") throw new RangeError("painting did not return exactly one image URL");
        data = data[0];
      } else if (operation === "stick_figure") {
        if (!isPlainObject(data) || typeof data.img_url !== "string") throw new RangeError("stick figure did not return its image URL");
        data = data.img_url;
      }
      let result;
      if (operation === "drawing" && isOriginalDrawingHttpUrl(data)) {
        result = await fetchOriginalDrawingImage(data, { deadline, fetchImpl });
      } else {
        const url = validateImageUrl(data);
        // The existing media fetcher exposes every redirect before contacting it.
        // Enforce this operation's stricter URL rules on every hop, too.
        const strictFetch = (target, init) => { validateImageUrl(target); return fetchImpl(target, init); };
        result = await fetcher(url, { timeoutMs: remaining(), maxBytes: MAX_IMAGE_BYTES, fetchImpl: strictFetch });
      }
      image = result.bytes;
      contentType = imageBytesType(image);
      const declared = String(result.contentType || "").split(";")[0].trim().toLowerCase();
      if (!["", "application/octet-stream", contentType].includes(declared)) throw new RangeError("downloaded image MIME does not match its bytes");
    }
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", image));
    if (Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("") === PLACEHOLDER_SHA256) throw new RangeError("service returned a known placeholder");
    remaining();
    return { ...base, image, contentType };
  } catch {
    throw new ImageToolsError("image operation returned invalid or unavailable content", { phase: "content", upstreamAttempts: 1 });
  }
}

const objectPolicyCache = new Map();

async function currentPolicy({ platform, locale, policyCache, clock, remaining, policyQuery, fetchImpl, signal, accountContext = null }) {
  remaining();
  // Account policy belongs to this invocation only. Never read or populate the
  // anonymous cache, including when a caller supplies a shared cache object.
  if (accountContext !== null) {
    const policy = await abortable(policyQuery({ platform, locale, accountContext,
      timeoutMs: Math.min(remaining(), 10000), fetchImpl, signal }), signal);
    remaining();
    return policy;
  }
  const cacheKey = `${platform}\n${locale}`;
  const cached = policyCache.get(cacheKey);
  if (cached && clock() >= cached.at && clock() - cached.at < 300000) return cached.value;
  const policy = await abortable(policyQuery({ platform, locale, timeoutMs: Math.min(remaining(), 10000), fetchImpl, signal }), signal);
  remaining();
  if (policyCache.size >= 16) policyCache.delete(policyCache.keys().next().value);
  policyCache.set(cacheKey, { at: clock(), value: policy });
  return policy;
}

/** Read only trusted per-installation configuration, never an HTTP body. */
export function printerContextFromInstallation(value) {
  if (value === undefined || value === null) return null;
  if (value instanceof PrinterContext) return value;
  if (typeof value === "string") {
    // Cloudflare encrypted bindings arrive as strings. Only this trusted env
    // adapter decodes them; public request fields cannot supply configuration.
    try {
      if (value.length > MAX_PRINTER_CONTEXT_BYTES || utf8Encode(value).byteLength > MAX_PRINTER_CONTEXT_BYTES) throw new RangeError();
      value = parseImageToolDocument(value);
    } catch {
      // JSON.parse errors can quote their input, which is private host config.
      throw new RangeError("installation printer context must be valid bounded JSON");
    }
  }
  const keys = ["model", "evidence_sha256", "evidence_kind"];
  if (!isPlainObject(value) || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new RangeError("installation printer context must contain exactly its retained model and provenance");
  }
  return new PrinterContext(value.model, value.evidence_sha256, value.evidence_kind);
}

/** Original text caller. Only anonymous policy reads share the 5-minute cache. */
export async function describeObject(text, {
  language = "en", platform = "cloudflare", locale = "en", timeoutMs = 30000,
  fetchImpl = fetch, policyQuery = queryImageToolsPolicy, operationCaller = runImageOperationOnce,
  policyCache = objectPolicyCache, clock = () => Date.now(), signal, accountContext = null,
} = {}) {
  const account = originalAccountContext(accountContext);
  // Validate the actual request before any configuration read.
  buildImageOperationFields("object_description", { text, language });
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 90000) throw new RangeError("image operation timeout must be between 1 and 90 seconds");
  const deadline = clock() + timeoutMs;
  const remaining = () => {
    if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
    const left = deadline - clock();
    if (left < 1000) throw new ImageToolsError("object description exceeded its time budget", { phase: "policy" });
    return left;
  };
  const policy = await currentPolicy({ platform, locale, policyCache, clock, remaining, policyQuery, fetchImpl, signal, accountContext: account });
  const rules = policy?.rules?.filter((rule) => rule.feature === "aisw");
  if (!rules || rules.length !== 1) throw new ImageToolsError("object description policy is unresolved", { phase: "policy" });
  // No device profile is needed by the observed status-1 rule. If it changes
  // to a device/usage rule the ordinary policy check stops this caller.
  const result = await operationCaller("object_description", { text, language, platform, locale,
    timeoutMs: remaining(), policyRule: rules[0], fetchImpl, signal, ...(account === null ? {} : { accountContext: account }) });
  if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
  if (clock() >= deadline) throw new ImageToolsError("object description exceeded its time budget", { phase: "content", upstreamAttempts: 1 });
  return result;
}

/** Original e332 painting controls, with its actual current aihh menu policy. */
export async function paintImage(prompt, {
  style = "", lineDrawing, printerContext = null, platform = "cloudflare", locale = "en", timeoutMs = 90000,
  fetchImpl = fetch, policyQuery = queryImageToolsPolicy, operationCaller = runImageOperationOnce,
  policyCache = objectPolicyCache, clock = () => Date.now(),
} = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 90000) throw new RangeError("image operation timeout must be between 1 and 90 seconds");
  const deadline = clock() + timeoutMs;
  const fields = { prompt, style, lineDrawing };
  buildImageOperationFields("painting", fields);
  if (printerContext !== null && !(printerContext instanceof PrinterContext)) throw new RangeError("painting requires trusted installation context");
  const remaining = () => {
    const left = deadline - clock();
    if (left < 1000) throw new ImageToolsError("painting exceeded its time budget", { phase: "policy" });
    return left;
  };
  const policy = await currentPolicy({ platform, locale, policyCache, clock, remaining, policyQuery, fetchImpl });
  const rules = policy?.rules?.filter((rule) => rule.feature === "aihh");
  if (!rules || rules.length !== 1) throw new ImageToolsError("painting policy is unresolved", { phase: "policy" });
  checkImageOperationPolicy("painting", rules[0], printerContext);
  const result = await operationCaller("painting", { ...fields, platform, locale, printerContext,
    timeoutMs: remaining(), policyRule: rules[0], fetchImpl });
  if (clock() >= deadline) throw new ImageToolsError("painting exceeded its time budget", { phase: "content", upstreamAttempts: 1 });
  return result;
}

/** Original 5ac7 image-guided drawing, with its actual aityhh menu policy. */
export async function drawImage(prompt, {
  imageDataUrl, style = "", printerContext = null, platform = "cloudflare", locale = "en", timeoutMs = 90000,
  fetchImpl = fetch, policyQuery = queryImageToolsPolicy, operationCaller = runImageOperationOnce,
  policyCache = objectPolicyCache, clock = () => Date.now(),
} = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 90000) throw new RangeError("image operation timeout must be between 1 and 90 seconds");
  const deadline = clock() + timeoutMs;
  const fields = { imageDataUrl, prompt, style };
  buildImageOperationFields("drawing", fields);
  if (printerContext !== null && !(printerContext instanceof PrinterContext)) throw new RangeError("drawing requires trusted installation context");
  const remaining = () => {
    const left = deadline - clock();
    if (left < 1000) throw new ImageToolsError("drawing exceeded its time budget", { phase: "policy" });
    return left;
  };
  const policy = await currentPolicy({ platform, locale, policyCache, clock, remaining, policyQuery, fetchImpl });
  const rules = policy?.rules?.filter((rule) => rule.feature === "aityhh");
  if (!rules || rules.length !== 1) throw new ImageToolsError("drawing policy is unresolved", { phase: "policy" });
  checkImageOperationPolicy("drawing", rules[0], printerContext);
  const result = await operationCaller("drawing", { ...fields, platform, locale, printerContext,
    timeoutMs: remaining(), policyRule: rules[0], fetchImpl });
  if (clock() >= deadline) throw new ImageToolsError("drawing exceeded its time budget", { phase: "content", upstreamAttempts: 1 });
  return result;
}

/** Fixed recovered editors; each operation keeps its actual source admission. */
export async function editImage(operation, imageDataUrl, {
  style,
  printerContext = null, platform = "cloudflare", locale = "en", timeoutMs = 30000,
  fetchImpl = fetch, policyQuery = queryImageToolsPolicy, operationCaller = runImageOperationOnce,
  policyCache = objectPolicyCache, clock = () => Date.now(),
} = {}) {
  if (!["line_art", "cartoon", "colour", "stick_figure"].includes(operation)) throw new RangeError("this image editor is not admitted");
  const fields = { imageDataUrl };
  if (operation === "cartoon") {
    if (style !== undefined && !CARTOON_STYLES.includes(style)) throw new RangeError("this cartoon style is not admitted");
    fields.style = style === undefined ? "cartoon" : style;
  } else if (style !== undefined) throw new RangeError("this image editor does not accept a style");
  buildImageOperationFields(operation, fields);
  if (printerContext !== null && !(printerContext instanceof PrinterContext)) throw new RangeError("image editor requires trusted installation context");
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 90000) throw new RangeError("image operation timeout must be between 1 and 90 seconds");
  const deadline = clock() + timeoutMs;
  const remaining = () => {
    const left = deadline - clock();
    if (left < 1000) throw new ImageToolsError("image editing exceeded its time budget", { phase: "policy" });
    return left;
  };
  if (operation === "stick_figure") {
    // 8.09.22 modules 8898/db52 and their parent have no mapped menu gate.
    // Their malformed timeout arguments do not establish a 60-second budget;
    // timeoutMs is the explicit local allowance shared with signing/download.
    const result = await operationCaller(operation, { ...fields, platform, locale,
      timeoutMs: remaining(), fetchImpl });
    if (clock() >= deadline) throw new ImageToolsError("image editing exceeded its time budget", { phase: "content", upstreamAttempts: 1 });
    return result;
  }
  const policy = await currentPolicy({ platform, locale, policyCache, clock, remaining, policyQuery, fetchImpl });
  const features = operationDefinition(operation)[3];
  const rules = policy?.rules?.filter((rule) => features.includes(rule.feature));
  if (!rules || rules.length !== 1) throw new ImageToolsError("image editor policy is unresolved", { phase: "policy" });
  // Validate before invoking even an injected operation adapter. Retained
  // context carries model/provenance only and is never sent upstream.
  checkImageOperationPolicy(operation, rules[0], printerContext);
  const result = await operationCaller(operation, { ...fields, platform, locale, printerContext,
    timeoutMs: remaining(), policyRule: rules[0], fetchImpl });
  if (clock() >= deadline) throw new ImageToolsError("image editing exceeded its time budget", { phase: "content", upstreamAttempts: 1 });
  return result;
}
