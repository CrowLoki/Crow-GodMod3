// The vendor's anonymous read-only voice-language and speaker catalogues,
// mirroring the desktop driver's voice_catalog.py: the same signed envelope
// as the model catalogue, two fixed endpoints, reads only. Nothing here can
// select a speaker, clone a voice, or synthesize audio; the vendor's
// speaker-selectable synthesis path is account-token gated and is not used.

import { isPlainObject } from "../util.js";
import { signedPost } from "./signature.js";

export const VOICE_LANGUAGE_ENDPOINT = "https://api.friendai.ocrmath.com/friend/speaker/languages";
export const SPEAKER_CATALOG_ENDPOINT = "https://api.friendai.ocrmath.com/friend/speaker/get_all";

export class VoiceCatalogError extends Error {
  constructor(message) {
    super(message);
    this.name = "VoiceCatalogError";
  }
}

async function catalogueRead(endpoint, options) {
  const document = await signedPost(endpoint, {}, options);
  if (document.errno !== 0) throw new VoiceCatalogError("voice catalogue returned an error");
  const raw = document.data;
  if (!Array.isArray(raw)) throw new VoiceCatalogError("voice catalogue data must be a list");
  return raw;
}

export function normalizeLanguages(raw) {
  const languages = raw.map((item) => {
    if (!isPlainObject(item)) throw new VoiceCatalogError("voice-language entry must be an object");
    const language = String(item.language ?? "");
    const code = String(item.code ?? "");
    const count = Number(item.count);
    if (!language || !code || !Number.isInteger(count) || count < 0) {
      throw new VoiceCatalogError("voice-language entry contains an invalid value");
    }
    return { language, code, count };
  });
  return languages.sort((a, b) => a.language.localeCompare(b.language, "en", { sensitivity: "base" }));
}

export function normalizeSpeakers(raw) {
  const speakers = raw.map((item) => {
    if (!isPlainObject(item)) throw new VoiceCatalogError("speaker entry must be an object");
    const id = Number(item.id);
    const speakerName = String(item.speaker_name ?? "");
    if (!Number.isInteger(id) || id < 0 || !speakerName) {
      throw new VoiceCatalogError("speaker entry lacks a valid id or name");
    }
    return { id, speaker_name: speakerName };
  });
  return speakers.sort((a, b) => a.id - b.id);
}

export async function queryVoiceLanguages({ timeoutMs = 10000, fetchImpl = fetch } = {}) {
  return normalizeLanguages(await catalogueRead(VOICE_LANGUAGE_ENDPOINT, { timeoutMs, fetchImpl }));
}

export async function querySpeakerCatalog({ timeoutMs = 10000, fetchImpl = fetch } = {}) {
  return normalizeSpeakers(await catalogueRead(SPEAKER_CATALOG_ENDPOINT, { timeoutMs, fetchImpl }));
}
