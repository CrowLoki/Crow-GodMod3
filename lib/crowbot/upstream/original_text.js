// The original /mx/ai/introduce operation accepts complete text and returns a
// complete text field. Preserve the caller's entire role/content array in txt;
// these are serialized instructions, not an invented native role/model API.
import { buildPublicChatMessages, serializePublicChatMessages, MAX_PUBLIC_CHAT_RESPONSE_BYTES, UpstreamError } from "./guest_chat.js";
import { describeObject } from "./image_tools.js";
import { utf8Encode } from "../util.js";
import { abortable, abortError } from "./cancellation.js";
import { originalAccountContext } from "./original_account_context.js";

// FunPrint's text endpoint receives one serialized message array rather than
// native role or JSON-schema controls. CrowBot places its complete output
// contract in the system message; carrying that exact caller-authored section
// beside the final request makes the contract salient without replacing any
// caller message or adding provider-owned instructions.
export const OUTPUT_CONTRACT_MARKER = "== OUTPUT — reply with ONLY one line of minified JSON ==";
const CHAT_EVENT_CHARS = 64 * 1024;

function* completeTextChunks(text) {
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + CHAT_EVENT_CHARS, text.length);
    const high = end < text.length && end > start
      && text.charCodeAt(end - 1) >= 0xD800 && text.charCodeAt(end - 1) <= 0xDBFF;
    const low = end < text.length && text.charCodeAt(end) >= 0xDC00 && text.charCodeAt(end) <= 0xDFFF;
    if (high && low) end -= 1;
    yield text.slice(start, end);
    start = end;
  }
}

export function carryForwardOutputContract(messages) {
  const source = messages.find(message => message.role === "system"
    && message.content.includes(OUTPUT_CONTRACT_MARKER));
  if (!source) return messages;
  const contract = source.content.slice(source.content.indexOf(OUTPUT_CONTRACT_MARKER));
  const last = messages.length - 1;
  // Avoid growing requests when a caller has already put this exact section
  // immediately before the final turn.
  if (messages[last - 1]?.role === "system" && messages[last - 1].content === contract) {
    return messages;
  }
  return [...messages.slice(0, last), { role: "system", content: contract }, messages[last]];
}

export async function* streamOriginalText(prompt, {
  timeoutMs = 90000, signal, describe = describeObject, accountContext = null, platform, locale,
} = {}) {
  const account = originalAccountContext(accountContext);
  const messages = carryForwardOutputContract(buildPublicChatMessages(prompt));
  const text = serializePublicChatMessages(messages);
  if (signal?.aborted) throw abortError();
  const result = await abortable(describe(text, { language: "en", timeoutMs, signal,
    ...(platform === undefined ? {} : { platform }), ...(locale === undefined ? {} : { locale }),
    ...(account === null ? {} : { accountContext: account }) }), signal);
  if (signal?.aborted) throw abortError();
  if (typeof result?.text !== "string" || !result.text.trim()
      || utf8Encode(result.text).byteLength > MAX_PUBLIC_CHAT_RESPONSE_BYTES) {
    throw new UpstreamError("original text returned no complete admitted answer");
  }
  // HTTP completes before any generated content is emitted. These bounded SSE
  // chunks only frame the completed answer for transport; they do not claim
  // token streaming or invent a served model, token counts or service DONE.
  for (const content of completeTextChunks(result.text)) {
    if (signal?.aborted) throw abortError();
    yield { type: "chunk", content };
  }
  if (signal?.aborted) throw abortError();
  yield { type: "done", finishReason: "stop" };
}
