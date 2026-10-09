// Crow's selectable-voice speech lane: the Microsoft Edge "read aloud"
// protocol, the same endpoint, handshake, and frames the edge-tts package
// speaks and the same voice-id shape (`ShortName`, e.g. en-AU-NatashaNeural)
// Crow's own provider module exposes. Keyless: the trusted client token is a
// public constant carried by every Edge browser, not a credential issued to
// anyone. One connect, two text frames, binary audio frames until turn.end,
// no retry. It answers the vendor socket's missing speaker field.

import { codePointLength, readBounded, utf8Encode } from "../util.js";
import { openBoundedSocket } from "./ws.js";

const READ_ALOUD_BASE = "speech.platform.bing.com/consumer/speech/synthesize/readaloud";
export const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
export const EDGE_TTS_SOCKET_URL = `wss://${READ_ALOUD_BASE}/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;
export const EDGE_VOICE_LIST_URL = `https://${READ_ALOUD_BASE}/voices/list?trustedclienttoken=${TRUSTED_CLIENT_TOKEN}`;
// Crow's provider module defaults to William (en-AU). The live list on
// 2026-09-15 carries William only in its multilingual form, so that is the
// default here; en-AU-NatashaNeural is the other Australian English voice.
export const DEFAULT_EDGE_VOICE = "en-AU-WilliamMultilingualNeural";
export const MAX_EDGE_TEXT_CHARS = 500;
export const MAX_EDGE_AUDIO_BYTES = 5 * 1024 * 1024;
export const MAX_EDGE_FRAMES = 1024;
export const MAX_VOICE_LIST_BYTES = 2 * 1024 * 1024;
export const EDGE_OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
export const EDGE_AUDIO_CONTENT_TYPE = "audio/mpeg";

const CHROMIUM_FULL_VERSION = "143.0.3650.75";
const CHROMIUM_MAJOR_VERSION = CHROMIUM_FULL_VERSION.split(".")[0];
export const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;
const WINDOWS_EPOCH_OFFSET_SECONDS = 11644473600n;
const HUNDRED_NANOSECONDS_PER_SECOND = 10000000n;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  `Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`;
const BASE_HEADERS = Object.freeze({
  "User-Agent": USER_AGENT,
  "Accept-Language": "en-US,en;q=0.9",
});
export const SOCKET_HEADERS = Object.freeze({
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
  Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
  ...BASE_HEADERS,
});
export const VOICE_LIST_HEADERS = Object.freeze({
  "Sec-CH-UA": `" Not;A Brand";v="99", "Microsoft Edge";v="${CHROMIUM_MAJOR_VERSION}", "Chromium";v="${CHROMIUM_MAJOR_VERSION}"`,
  "Sec-CH-UA-Mobile": "?0",
  Accept: "*/*",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
  ...BASE_HEADERS,
});

// Voice ids are locale-and-name tokens; the pattern keeps them out of the
// SSML attribute quoting and rejects anything that is not one plain token.
export const VOICE_ID_PATTERN = /^[A-Za-z]{2,3}-[A-Za-z0-9]{2,8}(?:-[A-Za-z0-9]{2,12})?-[A-Za-z0-9]{3,48}$/;

export class EdgeTTSError extends Error {
  constructor(message) {
    super(message);
    this.name = "EdgeTTSError";
  }
}

/**
 * The Sec-MS-GEC clock hash: the current UTC time in Windows file time
 * (100 ns ticks since 1601), rounded down to five minutes, followed by the
 * trusted client token, SHA-256, uppercase hex.
 */
export async function generateSecMsGec(unixSeconds = Date.now() / 1000) {
  let seconds = BigInt(Math.floor(Number(unixSeconds))) + WINDOWS_EPOCH_OFFSET_SECONDS;
  seconds -= seconds % 300n;
  const ticks = seconds * HUNDRED_NANOSECONDS_PER_SECOND;
  const digest = await crypto.subtle.digest("SHA-256", utf8Encode(`${ticks}${TRUSTED_CLIENT_TOKEN}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function randomHex(bytes) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return [...buffer].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function connectId() {
  return randomHex(16);
}

function muidCookie() {
  return `muid=${randomHex(16).toUpperCase()};`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The browser-style UTC timestamp the protocol carries on every frame. */
export function dateToString(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return (
    `${WEEKDAYS[date.getUTCDay()]} ${MONTHS[date.getUTCMonth()]} ${pad(date.getUTCDate())} ${date.getUTCFullYear()} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`
  );
}

/** The service rejects a few control ranges; they become spaces, as in the reference client. */
export function removeIncompatibleCharacters(text) {
  let cleaned = "";
  for (const char of String(text)) {
    const code = char.codePointAt(0);
    cleaned += code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) ? " " : char;
  }
  return cleaned;
}

export function escapeXml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function isValidVoiceId(value) {
  return typeof value === "string" && value.length <= 80 && VOICE_ID_PATTERN.test(value);
}

// Prosody in the units the reference client sends: a signed whole-number Hz
// pitch shift and signed whole-number percentages for rate and volume. The
// neutral values below are what every plain voice has always been spoken
// with; a character preset supplies its own. The patterns keep the values
// inside the SSML attribute quoting.
export const DEFAULT_PROSODY = Object.freeze({ pitch: "+0Hz", rate: "+0%", volume: "+0%" });
const PROSODY_HZ_PATTERN = /^[+-]\d{1,3}Hz$/;
const PROSODY_PERCENT_PATTERN = /^[+-]\d{1,3}%$/;

export function isValidProsody(value) {
  return !!value && typeof value === "object"
    && typeof value.pitch === "string" && PROSODY_HZ_PATTERN.test(value.pitch)
    && typeof value.rate === "string" && PROSODY_PERCENT_PATTERN.test(value.rate)
    && typeof value.volume === "string" && PROSODY_PERCENT_PATTERN.test(value.volume);
}

const SHORT_VOICE_PATTERN = /^([a-z]{2,})-([A-Z]{2,})-(.+Neural)$/;

/**
 * The SSML voice attribute the reference client sends: a short id such as
 * `en-AU-WilliamNeural` becomes the full Microsoft voice name, and a
 * region-suffixed id such as `zh-CN-liaoning-XiaobeiNeural` folds the suffix
 * into the region. Ids outside that shape are sent as they are.
 */
export function fullVoiceName(voice) {
  const match = SHORT_VOICE_PATTERN.exec(String(voice));
  if (!match) return String(voice);
  const [, lang, baseRegion, baseName] = match;
  let region = baseRegion;
  let name = baseName;
  const dash = name.indexOf("-");
  if (dash !== -1) {
    region = `${region}-${name.slice(0, dash)}`;
    name = name.slice(dash + 1);
  }
  return `Microsoft Server Speech Text to Speech Voice (${lang}-${region}, ${name})`;
}

export function makeSsml(voice, escapedText, prosody = DEFAULT_PROSODY) {
  return (
    "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>" +
    `<voice name='${fullVoiceName(voice)}'>` +
    `<prosody pitch='${prosody.pitch}' rate='${prosody.rate}' volume='${prosody.volume}'>` +
    `${escapedText}` +
    "</prosody></voice></speak>"
  );
}

export function speechConfigFrame(timestamp) {
  return (
    `X-Timestamp:${timestamp}\r\n` +
    "Content-Type:application/json; charset=utf-8\r\n" +
    "Path:speech.config\r\n\r\n" +
    '{"context":{"synthesis":{"audio":{"metadataoptions":{' +
    '"sentenceBoundaryEnabled":"true","wordBoundaryEnabled":"false"' +
    "}," +
    `"outputFormat":"${EDGE_OUTPUT_FORMAT}"` +
    "}}}}\r\n"
  );
}

export function ssmlFrame(requestId, timestamp, ssml) {
  return (
    `X-RequestId:${requestId}\r\n` +
    "Content-Type:application/ssml+xml\r\n" +
    `X-Timestamp:${timestamp}Z\r\n` +
    "Path:ssml\r\n\r\n" +
    `${ssml}`
  );
}

/** Split `Key:Value\r\n...` header lines from a frame body. */
export function parseFrameHeaders(headerText) {
  const headers = {};
  for (const line of headerText.split("\r\n")) {
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 0) throw new EdgeTTSError("malformed frame header");
    headers[line.slice(0, colon)] = line.slice(colon + 1);
  }
  return headers;
}

export function parseTextFrame(text) {
  const split = text.indexOf("\r\n\r\n");
  if (split < 0) throw new EdgeTTSError("text frame lacks a header terminator");
  return { headers: parseFrameHeaders(text.slice(0, split)), body: text.slice(split + 4) };
}

/** Binary frames: two big-endian bytes of header length, headers, then audio bytes. */
export function parseBinaryFrame(bytes) {
  if (bytes.byteLength < 2) throw new EdgeTTSError("binary frame is missing its header length");
  const headerLength = (bytes[0] << 8) | bytes[1];
  if (headerLength + 2 > bytes.byteLength) throw new EdgeTTSError("binary frame header length exceeds the frame");
  const headerText = new TextDecoder().decode(bytes.subarray(2, 2 + headerLength));
  return { headers: parseFrameHeaders(headerText), data: bytes.subarray(2 + headerLength) };
}

export async function buildSocketUrl(clock = () => Date.now() / 1000) {
  const gec = await generateSecMsGec(clock());
  return `${EDGE_TTS_SOCKET_URL}&ConnectionId=${connectId()}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
}

function defaultConnector(url, { timeoutMs }) {
  return openBoundedSocket(url, { timeoutMs, headers: { ...SOCKET_HEADERS, Cookie: muidCookie() } });
}

/** Synthesize one bounded text in one voice, at the given prosody, and return the MP3 bytes. */
export async function edgeTtsOnce(text, {
  voice = DEFAULT_EDGE_VOICE,
  prosody = DEFAULT_PROSODY,
  timeoutMs = 20000,
  connector = defaultConnector,
  clock = () => Date.now() / 1000,
} = {}) {
  const content = String(text);
  if (!content.trim()) throw new RangeError("TTS text must not be empty");
  if (codePointLength(content) > MAX_EDGE_TEXT_CHARS) {
    throw new RangeError(`TTS text must not exceed ${MAX_EDGE_TEXT_CHARS} characters`);
  }
  if (!isValidVoiceId(voice)) throw new RangeError("voice must be one plain voice id");
  if (!isValidProsody(prosody)) throw new RangeError("prosody must be signed Hz and percent offsets");
  const timeout = Number(timeoutMs);
  if (!(timeout >= 1000 && timeout <= 30000)) throw new RangeError("timeout must be between 1 and 30 seconds");

  const started = clock() * 1000;
  const remaining = () => {
    const left = timeout - (clock() * 1000 - started);
    if (left <= 0) throw new EdgeTTSError("speech synthesis exceeded its total timeout");
    return left;
  };

  let socket;
  try {
    socket = await connector(await buildSocketUrl(clock), { timeoutMs: Math.min(10000, timeout) });
  } catch {
    throw new EdgeTTSError("speech connection failed; request was not retried");
  }

  const chunks = [];
  let audioBytes = 0;
  let receivedFrames = 0;
  try {
    const timestamp = dateToString(new Date(clock() * 1000));
    socket.sendText(speechConfigFrame(timestamp));
    socket.sendText(ssmlFrame(connectId(), timestamp, makeSsml(voice, escapeXml(removeIncompatibleCharacters(content)), prosody)));

    for (;;) {
      if (receivedFrames >= MAX_EDGE_FRAMES) throw new EdgeTTSError("speech synthesis exceeded its frame limit");
      const frame = await socket.recvFrame(remaining());
      if (frame === null) throw new EdgeTTSError("speech socket closed before turn.end");
      receivedFrames += 1;
      if (frame.kind === "text") {
        const { headers } = parseTextFrame(frame.text);
        const path = headers.Path;
        if (path === "turn.end") break;
        if (path !== "response" && path !== "turn.start" && path !== "audio.metadata") {
          throw new EdgeTTSError("speech socket returned an unknown path");
        }
        continue;
      }
      const { headers, data } = parseBinaryFrame(frame.bytes);
      if (headers.Path !== "audio") throw new EdgeTTSError("binary frame path is not audio");
      const contentType = headers["Content-Type"];
      if (contentType === undefined) {
        if (data.byteLength === 0) continue;
        throw new EdgeTTSError("binary frame carries data without a content type");
      }
      if (contentType !== EDGE_AUDIO_CONTENT_TYPE) throw new EdgeTTSError("binary frame has an unexpected content type");
      if (data.byteLength === 0) throw new EdgeTTSError("binary audio frame is empty");
      audioBytes += data.byteLength;
      if (audioBytes > MAX_EDGE_AUDIO_BYTES) throw new EdgeTTSError("speech audio exceeded the gateway size bound");
      chunks.push(data);
    }
  } catch (error) {
    if (error instanceof EdgeTTSError) throw error;
    throw new EdgeTTSError("speech synthesis failed; request was not retried");
  } finally {
    socket.close();
  }
  if (!audioBytes) throw new EdgeTTSError("no audio was received");
  const audio = new Uint8Array(audioBytes);
  let offset = 0;
  for (const chunk of chunks) {
    audio.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { voice, audio, contentType: EDGE_AUDIO_CONTENT_TYPE, receivedFrames };
}

/** Reduce a raw voice entry to the id/name/locale/gender shape. */
export function normalizeVoiceEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const id = typeof entry.ShortName === "string" ? entry.ShortName : "";
  if (!isValidVoiceId(id)) return null;
  return {
    id,
    name: typeof entry.FriendlyName === "string" && entry.FriendlyName ? entry.FriendlyName : id,
    locale: typeof entry.Locale === "string" ? entry.Locale : "",
    gender: typeof entry.Gender === "string" ? entry.Gender : "",
  };
}

/** One bounded read of the voice list, sorted by id. */
export async function fetchEdgeVoices({ timeoutMs = 10000, fetchImpl = fetch, clock = () => Date.now() / 1000 } = {}) {
  const gec = await generateSecMsGec(clock());
  const url = `${EDGE_VOICE_LIST_URL}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { ...VOICE_LIST_HEADERS, Cookie: muidCookie() },
      signal: AbortSignal.timeout(Math.max(1000, Number(timeoutMs))),
    });
  } catch {
    throw new EdgeTTSError("voice list request failed; request was not retried");
  }
  if (!response.ok) throw new EdgeTTSError(`voice list answered HTTP ${response.status}`);
  let bytes;
  try {
    bytes = await readBounded(response.body, MAX_VOICE_LIST_BYTES, "voice list exceeded the size bound");
  } catch {
    throw new EdgeTTSError("voice list exceeded the size bound");
  }
  let entries;
  try {
    entries = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new EdgeTTSError("voice list returned malformed JSON");
  }
  if (!Array.isArray(entries)) throw new EdgeTTSError("voice list must be an array");
  const voices = entries.map(normalizeVoiceEntry).filter(Boolean);
  if (!voices.length) throw new EdgeTTSError("voice list contained no usable voices");
  return voices.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
