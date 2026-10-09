// Bounded outbound WebSocket for the Workers runtime, mirroring the
// discipline of src/crowbot_gateway/wsclient.py: one connect, masked text
// sends handled by the runtime, timed receives that never renew their
// budget, no extensions, no subprotocols, and an explicit close.
//
// Workers open an outbound socket by fetching the https:// form of the URL
// with an `Upgrade: websocket` header; a 101 answer carries `webSocket`.

const MAX_MESSAGE_CHARS = 4 * 1024 * 1024;
const FAILURE_PHASES = new Set(["handshake", "handshake_timeout", "receive", "receive_timeout", "response"]);

// Only these fixed scalar fields may cross a private error boundary. Never
// retain a response, signed URL, header, body, or unrestricted nested cause.
export function safeFailureDetails(error, fallbackPhase = null) {
  const failurePhase = FAILURE_PHASES.has(error?.failurePhase) ? error.failurePhase
    : FAILURE_PHASES.has(fallbackPhase) ? fallbackPhase : null;
  const status = error?.upstreamHttpStatus;
  const details = {
    failurePhase,
    upstreamHttpStatus: failurePhase === "handshake" && Number.isInteger(status) && status >= 100 && status <= 599 ? status : null,
  };
  const closeCode = error?.websocketCloseCode;
  if (Number.isInteger(closeCode) && closeCode >= 1000 && closeCode <= 4999) {
    details.websocketCloseCode = closeCode;
  }
  if (typeof error?.websocketCloseWasClean === "boolean") {
    details.websocketCloseWasClean = error.websocketCloseWasClean;
  }
  return details;
}

export class WSClientError extends Error {
  constructor(message, failure = {}) {
    super(message);
    this.name = "WSClientError";
    Object.assign(this, safeFailureDetails(failure));
  }
}

export function httpUrlForSocket(url) {
  const text = String(url);
  if (text.startsWith("wss://")) return `https://${text.slice(6)}`;
  if (text.startsWith("ws://")) return `http://${text.slice(5)}`;
  throw new WSClientError("only ws:// and wss:// URLs are supported");
}

/** Binary message payloads arrive as ArrayBuffer, a typed view, or Blob depending on the runtime. */
async function binaryBytes(data) {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (data && typeof data.arrayBuffer === "function") {
    if (typeof data.size === "number" && data.size > MAX_MESSAGE_CHARS) throw new WSClientError("message exceeded the size bound");
    return new Uint8Array(await data.arrayBuffer());
  }
  throw new WSClientError("unsupported binary message payload");
}

export class BoundedSocket {
  constructor(socket) {
    this.socket = socket;
    this.queue = [];
    this.queuedBytes = 0;
    this.waiters = [];
    this.closed = false;
    try {
      // The Workers runtime hands binary messages over as Blob unless asked
      // otherwise; recvFrame copes with both, this just avoids the extra read.
      socket.binaryType = "arraybuffer";
    } catch {
      // Read-only on some runtimes; Blob is handled below.
    }
    socket.addEventListener("message", (event) => this.push({ kind: "message", data: event.data }));
    socket.addEventListener("close", (event) => {
      const details = {};
      if (Number.isInteger(event?.code) && event.code >= 1000 && event.code <= 4999) {
        details.websocketCloseCode = event.code;
      }
      if (typeof event?.wasClean === "boolean") details.websocketCloseWasClean = event.wasClean;
      this.peerCloseDetails = Object.freeze(details);
      this.push({ kind: "close" });
    });
    socket.addEventListener("error", () => this.push({ kind: "error" }));
  }

  push(item) {
    if (this.closed) return;
    item.size = item.kind !== "message" ? 0 : typeof item.data === "string"
      ? item.data.length * 2 : Number(item.data?.byteLength ?? item.data?.size ?? 0);
    if (item.size > MAX_MESSAGE_CHARS || this.queue.length >= 512
        || this.queuedBytes + item.size > MAX_MESSAGE_CHARS) {
      this.failure = new WSClientError("socket read-ahead exceeded the size bound");
      this.close();
      return;
    }
    const waiter = this.waiters.shift();
    if (waiter) waiter(item);
    else { this.queuedBytes += item.size; this.queue.push(item); }
  }

  sendText(text) {
    if (this.closed) throw new WSClientError("connection is closed");
    this.socket.send(String(text));
  }

  /** Native printer uploads are binary application messages, preserved whole. */
  sendBinary(bytes) {
    if (this.closed) throw new WSClientError("connection is closed");
    if (!(bytes instanceof Uint8Array) || !bytes.byteLength || bytes.byteLength > MAX_MESSAGE_CHARS) {
      throw new WSClientError("binary send exceeded the size bound");
    }
    this.socket.send(bytes);
  }

  nextItem(timeoutMs) {
    if (this.failure) return Promise.reject(this.failure);
    if (this.queue.length) {
      const item = this.queue.shift();
      this.queuedBytes -= item.size;
      return Promise.resolve(item);
    }
    if (this.closed) return Promise.resolve({ kind: "close" });
    return new Promise((resolve, reject) => {
      const waiter = (item) => {
        clearTimeout(timer);
        resolve(item);
      };
      const timer = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(new WSClientError("message receive exceeded its time budget", { failurePhase: "receive_timeout" }));
      }, Math.max(0, timeoutMs));
      this.waiters.push(waiter);
    });
  }

  /**
   * Next complete frame as `{kind:"text", text}` or `{kind:"binary", bytes}`,
   * or null on a clean close. `timeoutMs` is the whole budget.
   */
  async recvFrame(timeoutMs) {
    if (timeoutMs <= 0) throw new WSClientError("message receive exceeded its time budget", { failurePhase: "receive_timeout" });
    const item = await this.nextItem(timeoutMs);
    if (this.failure) throw this.failure;
    if (item.kind === "close") {
      this.close(true);
      return null;
    }
    if (item.kind === "error") {
      throw new WSClientError("socket reported an error");
    }
    if (typeof item.data === "string") {
      if (item.data.length > MAX_MESSAGE_CHARS) throw new WSClientError("message exceeded the size bound");
      return { kind: "text", text: item.data };
    }
    const bytes = await binaryBytes(item.data);
    if (bytes.byteLength > MAX_MESSAGE_CHARS) throw new WSClientError("message exceeded the size bound");
    return { kind: "binary", bytes };
  }

  /** Next complete text message, or null on a clean close; binary frames are a contract breach. */
  async recvMessage(timeoutMs) {
    const frame = await this.recvFrame(timeoutMs);
    if (frame === null) return null;
    if (frame.kind !== "text") {
      throw new WSClientError("binary frames are not part of this route's contract");
    }
    return frame.text;
  }

  close(peerClosed = false) {
    this.onDispose?.();
    this.onDispose = null;
    if (this.closed) return;
    this.closed = true;
    this.queue.length = 0;
    this.queuedBytes = 0;
    for (const waiter of this.waiters.splice(0)) waiter({ kind: "close" });
    if (peerClosed) return;
    try {
      this.socket.close(1000, "done");
    } catch {
      // Already closed by the peer; nothing further to do.
    }
  }
}

/** Open one bounded socket. Fails on anything but a clean 101 upgrade. */
export async function openBoundedSocket(url, { origin = null, timeoutMs = 10000, fetchImpl = fetch, headers: extraHeaders = {}, signal } = {}) {
  const target = httpUrlForSocket(url);
  const headers = { ...extraHeaders, Upgrade: "websocket" };
  if (origin) headers.Origin = String(origin);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(() => controller.abort(), Math.max(0, timeoutMs));
  let response;
  try {
    response = await fetchImpl(target, { headers, redirect: "manual", signal: controller.signal });
  } catch (error) {
    throw new WSClientError(`handshake failed: ${error?.name || "error"}`, {
      failurePhase: controller.signal.aborted ? "handshake_timeout" : "handshake",
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
  if (response.status !== 101 || !response.webSocket) {
    throw new WSClientError(`handshake rejected: HTTP ${response.status}`, {
      failurePhase: "handshake",
      upstreamHttpStatus: response.status,
    });
  }
  const socket = response.webSocket;
  const bounded = new BoundedSocket(socket);
  const close = () => bounded.close();
  bounded.onDispose = () => signal?.removeEventListener("abort", close);
  signal?.addEventListener("abort", close, { once: true });
  if (signal?.aborted) {
    bounded.close();
    throw new DOMException("Operation cancelled", "AbortError");
  }
  try {
    // Authentication/readiness can arrive immediately when accept activates
    // the socket. Install the owned queue and cancellation first.
    socket.accept();
  } catch {
    bounded.close();
    throw new WSClientError("socket acceptance failed", { failurePhase: "handshake" });
  }
  return bounded;
}
