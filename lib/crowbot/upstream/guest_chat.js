// The recovered anonymous guest chat socket, mirroring
// src/stickermate/guest_chat.py and the streaming adapter in
// src/crowbot_gateway/upstream.py: one native role-tagged JSON message array,
// streamed JSON chunks, terminal `status: "DONE"`, bounded and never retried.

import { codePointLength, isPlainObject, nowMs, utf8Encode } from "../util.js";
import { openBoundedSocket, safeFailureDetails } from "./ws.js";
import { prepareConnection } from "./cancellation.js";

export const GUEST_CHAT_ENDPOINT = "wss://miaoxue.api.open.ocrmath.com/mx/deepSeek";
export const GUEST_CHAT_ORIGIN = "https://miaoxue.api.open.ocrmath.com";
// Local resource budgets, matching the existing native WebSocket frame bound.
// They describe wrapper resources, not the service's model or token capacity.
export const MAX_GUEST_REQUEST_BYTES = 1 << 20;
// Public HTTP Chat uses the original text operation's 16 MiB request resource,
// not the guest WebSocket frame. This local envelope ceiling is not measured
// model context or generation capacity.
export const MAX_PUBLIC_CHAT_MESSAGE_BYTES = 16 << 20;
// Public Chat buffers original text before SSE and then emits bounded events.
// This is a finite local total, not a claim about upstream generation capacity.
export const MAX_PUBLIC_CHAT_RESPONSE_BYTES = 16 << 20;
// The native guest WebSocket, used by voice, retains its one-frame reply cap.
export const MAX_GUEST_RESPONSE_BYTES = 1 << 20;
// A shortest normalized entry is 28 JSON bytes, plus its separating comma.
// After the final comma correction, brackets and final non-empty content add
// two bytes: any valid N-entry payload needs at least 29*N+2 bytes.
export const MAX_CHAT_MESSAGES = Math.floor((MAX_GUEST_REQUEST_BYTES - 2) / 29);
export const MAX_PUBLIC_CHAT_MESSAGES = Math.floor((MAX_PUBLIC_CHAT_MESSAGE_BYTES - 2) / 29);
export const DEFAULT_MAX_RESPONSE_CHARS = MAX_GUEST_RESPONSE_BYTES;
// Each progressing message adds at least one byte to the full response text.
// Non-progress messages share one cumulative allowance across the whole turn.
export const MAX_RECEIVED_FRAMES = 512;

export class GuestChatError extends Error {
  constructor(message) {
    super(message);
    this.name = "GuestChatError";
  }
}

export class UpstreamError extends Error {
  constructor(message, failure = {}) {
    super(message);
    this.name = "UpstreamError";
    Object.assign(this, safeFailureDetails(failure));
  }
}

export function buildGuestMessages(prompt) {
  return buildMessages(prompt, MAX_CHAT_MESSAGES, serializeGuestMessages);
}

export function buildPublicChatMessages(prompt) {
  return buildMessages(prompt, MAX_PUBLIC_CHAT_MESSAGES, serializePublicChatMessages);
}

function buildMessages(prompt, maxMessages, serialize) {
  // The route honours system / assistant / user roles (verified live), so a
  // validated message array is sent as-is; a plain string stays one user turn.
  if (Array.isArray(prompt)) {
    if (!prompt.length || prompt.length > maxMessages) throw new RangeError(`messages must contain between 1 and ${maxMessages} entries`);
    const messages = Array.from(prompt, (message) => {
      if (!isPlainObject(message) || Object.keys(message).some(key => key !== "role" && key !== "content")) {
        throw new RangeError("messages must contain only role and content objects");
      }
      if (!["system", "user", "assistant"].includes(message.role) || typeof message.content !== "string") {
        throw new RangeError("messages must use system, user or assistant roles and string content");
      }
      return { role: message.role, content: message.content };
    });
    const last = messages.at(-1);
    if (last.role !== "user" || !last.content.trim()) throw new RangeError("messages must end with a non-empty user message");
    serialize(messages);
    return messages;
  }
  const content = String(prompt);
  if (!content.trim()) throw new RangeError("prompt must not be empty");
  const messages = [{ role: "user", content }];
  serialize(messages);
  return messages;
}

/** Exact native JSON wire payload; no input text is truncated or rewritten. */
export function serializeGuestMessages(messages) {
  const payload = JSON.stringify(messages);
  if (utf8Encode(payload).byteLength > MAX_GUEST_REQUEST_BYTES) {
    throw new RangeError(`serialized messages exceed the ${MAX_GUEST_REQUEST_BYTES}-byte local transport budget`);
  }
  return payload;
}

/** Exact public Chat message array under its larger HTTP text resource. */
export function serializePublicChatMessages(messages) {
  const payload = JSON.stringify(messages);
  if (utf8Encode(payload).byteLength > MAX_PUBLIC_CHAT_MESSAGE_BYTES) {
    throw new RangeError(`serialized messages exceed the ${MAX_PUBLIC_CHAT_MESSAGE_BYTES}-byte local public Chat budget`);
  }
  return payload;
}

/** Sizes of the concatenated response, including a pair split across chunks. */
export function responseTextSizes(chunk, previousHighSurrogate = false) {
  if (!chunk) return { characters: 0, bytes: 0, endsHighSurrogate: previousHighSurrogate };
  const first = chunk.charCodeAt(0);
  const last = chunk.charCodeAt(chunk.length - 1);
  const completesPair = previousHighSurrogate && first >= 0xdc00 && first <= 0xdfff;
  return {
    characters: codePointLength(chunk) - (completesPair ? 1 : 0),
    bytes: utf8Encode(chunk).byteLength - (completesPair ? 2 : 0),
    endsHighSurrogate: last >= 0xd800 && last <= 0xdbff,
  };
}

/** Parse one text frame into JSON objects, tolerating `}\n\n`-joined documents. */
export function frameDocuments(rawFrame) {
  if (typeof rawFrame !== "string") {
    throw new GuestChatError("guest chat returned a non-text WebSocket frame");
  }
  const stripped = rawFrame.trim();
  if (!stripped) return [];
  try {
    const document = JSON.parse(stripped);
    if (!isPlainObject(document)) throw new GuestChatError("guest chat frame must contain a JSON object");
    return [document];
  } catch (error) {
    if (error instanceof GuestChatError) throw error;
  }
  const pieces = rawFrame.split("}\n\n");
  if (pieces.length <= 1) throw new GuestChatError("guest chat returned malformed JSON");
  return pieces.flatMap((piece, index) => {
    if (!piece.trim()) return [];
    // Restore exactly the outer brace consumed by each actual delimiter.
    const candidate = piece.trim() + (index < pieces.length - 1 ? "}" : "");
    let document;
    try {
      document = JSON.parse(candidate);
    } catch {
      throw new GuestChatError("guest chat returned malformed streamed JSON");
    }
    if (!isPlainObject(document)) throw new GuestChatError("guest chat frame must contain a JSON object");
    return [document];
  });
}

function defaultConnector(url, { origin, timeoutMs, signal }) {
  return openBoundedSocket(url, { origin, timeoutMs, signal });
}

export function prepareGuestChat({ timeoutMs = 10000, signal, connector = defaultConnector } = {}) {
  return prepareConnection(owned => connector(GUEST_CHAT_ENDPOINT, {
    origin: GUEST_CHAT_ORIGIN, timeoutMs: Math.min(10000, timeoutMs), signal: owned,
  }), signal);
}

/**
 * Stream one bounded guest chat as events: `{type:"chunk", content}` then a
 * single `{type:"done", ...}`. Exactly one frame is sent; any failure throws
 * with no retry. The socket is closed on every exit path, including a
 * consumer that stops iterating early.
 */
export async function* streamGuestChat(prompt, {
  timeoutMs = 20000,
  maxResponseChars = DEFAULT_MAX_RESPONSE_CHARS,
  connector = defaultConnector,
  clock = nowMs,
  signal,
  prepared,
} = {}) {
  const timeout = Number(timeoutMs);
  if (!(timeout >= 1000 && timeout <= 90000)) throw new RangeError("timeout must be between 1 and 90 seconds");
  const responseLimit = Math.trunc(Number(maxResponseChars));
  if (!(responseLimit >= 1 && responseLimit <= MAX_GUEST_RESPONSE_BYTES)) {
    throw new RangeError(`max_response_chars must be between 1 and ${MAX_GUEST_RESPONSE_BYTES}`);
  }
  const payload = serializeGuestMessages(buildGuestMessages(prompt));

  const started = clock();
  let socket;
  try {
    socket = prepared ? await prepared.take() : await connector(GUEST_CHAT_ENDPOINT, { origin: GUEST_CHAT_ORIGIN, timeoutMs: Math.min(10000, timeout), signal });
  } catch (error) {
    throw new UpstreamError(`guest chat connection failed; not retried: ${error?.name || "error"}`, safeFailureDetails(error, "handshake"));
  }

  let contentLength = 0;
  let contentBytes = 0;
  let contentEndsHighSurrogate = false;
  let receivedFrames = 0;
  let nonProgressFrames = 0;
  let requestId = null;
  let model = null;
  try {
    if (signal?.aborted || clock() - started >= timeout) throw new Error('Guest chat deadline exceeded');
    socket.sendText(payload);
    while (receivedFrames < MAX_GUEST_RESPONSE_BYTES + MAX_RECEIVED_FRAMES && nonProgressFrames < MAX_RECEIVED_FRAMES) {
      if (signal?.aborted) throw new DOMException("Operation cancelled", "AbortError");
      const remaining = timeout - (clock() - started);
      if (remaining <= 0) throw new UpstreamError("guest chat timed out before DONE", { failurePhase: "receive_timeout" });
      let rawFrame;
      try {
        rawFrame = await socket.recvMessage(remaining);
      } catch (error) {
        throw new UpstreamError(`guest chat receive failed; not retried: ${error?.name || "error"}`, safeFailureDetails(error, "receive"));
      }
      if (rawFrame === null) throw new UpstreamError("guest chat closed before DONE", {
        failurePhase: "receive", ...(socket.peerCloseDetails ?? {}),
      });
      receivedFrames += 1;
      const frameStartBytes = contentBytes;

      let documents;
      try {
        documents = frameDocuments(rawFrame);
      } catch (error) {
        throw new UpstreamError(error.message, { failurePhase: "response" });
      }
      for (const document of documents) {
        if (document.id !== undefined && document.id !== null) requestId = String(document.id);
        if (document.model !== undefined && document.model !== null) model = String(document.model);
        const choices = document.choices;
        const firstChoice = Array.isArray(choices) && choices.length && isPlainObject(choices[0]) ? choices[0] : {};
        const delta = firstChoice.delta;
        const chunk = isPlainObject(delta) ? delta.content : null;
        if (typeof chunk === "string" && chunk) {
          const sizes = responseTextSizes(chunk, contentEndsHighSurrogate);
          const nextLength = contentLength + sizes.characters;
          const nextBytes = contentBytes + sizes.bytes;
          if (nextBytes > MAX_GUEST_RESPONSE_BYTES) {
            throw new UpstreamError("guest chat exceeded the response UTF-8 byte budget", { failurePhase: "response" });
          }
          if (nextLength > responseLimit) {
            throw new UpstreamError("guest chat exceeded the response character limit", { failurePhase: "response" });
          }
          contentLength = nextLength;
          contentBytes = nextBytes;
          contentEndsHighSurrogate = sizes.endsHighSurrogate;
          yield { type: "chunk", content: chunk };
        }
        if (document.status === "DONE") {
          const rawUsage = document.usage;
          const rawReason = firstChoice.finish_reason;
          yield {
            type: "done",
            anonymous: true,
            requestId,
            servedModel: model,
            usage: isPlainObject(rawUsage) ? rawUsage : null,
            finishReason: rawReason === undefined || rawReason === null ? null : String(rawReason),
            sentFrames: 1,
            receivedFrames,
          };
          return;
        }
      }
      // Count the outer message once, regardless of coalesced documents.
      // Intervening text does not renew the cumulative no-progress allowance.
      if (contentBytes === frameStartBytes) nonProgressFrames += 1;
    }
    throw new UpstreamError(`guest chat exceeded the ${MAX_RECEIVED_FRAMES}-frame no-progress limit`, { failurePhase: "response" });
  } finally {
    socket.close();
  }
}
