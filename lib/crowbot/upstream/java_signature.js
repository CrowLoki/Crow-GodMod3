// Original Java envelope from the owned FunPrint app's module 6660.
// Preserved 8.09.10 app-service.js SHA-256:
// 142c7ffe9f27eb4c99525947ecfbe1d430ecb97d72fd1cc6d06d8ee604f69867.
// java_post byte 17795702; get_sign_for_java byte 17799908. The shipped
// signature markers are request checksums, not paid inference credentials.
// Confirmed in 8.09.22 SHA-256:
// ce4db1be2a7ea17f182be3dde5bc57c8c50f6bac08f7b717ed5b577691135eb2,
// java_post byte 18129022; get_sign_for_java byte 18133292.
import { md5Hex } from "./md5.js";
import { utf8Encode } from "../util.js";
import { originalAccountContext } from "./original_account_context.js";

const LANGUAGE = /^[A-Za-z]{2,8}(?:[-_][A-Za-z0-9]{2,8}){0,2}$/;

/** Preserve the anonymous body or sign the trusted caller's actual account. */
export async function buildJavaPayload(timestampMs = null, { platform, locale, accountContext = null } = {}) {
  const account = originalAccountContext(accountContext);
  if (typeof platform !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(platform)) throw new RangeError("actual client platform is required");
  if (typeof locale !== "string" || !LANGUAGE.test(locale)) throw new RangeError("actual client locale is required");
  const observed = timestampMs === null ? Date.now() : timestampMs;
  if (!Number.isSafeInteger(observed) || observed < 0) throw new RangeError("timestamp must be nonnegative integer milliseconds");
  const timestamp = Math.floor(observed / 1000) * 1000;
  // 8.09.22 java_post reads cached user_id and signs the final merged value;
  // its duplicate version assignment still produces numeric version:2.
  const userId = account?.userId ?? 0;
  const digest = md5Hex(`${timestamp}&ytb.675.wx.com.cc&${userId}`).toUpperCase();
  const key = await crypto.subtle.importKey("raw", utf8Encode("3b4fbc4cf8c5e7626fe829ab8fa8ad40"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", key, utf8Encode(digest)));
  const sign = Array.from(signed, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  return { os: platform, user_id: userId, timestamp, version: 2, app_name: "funprint", locale, sign };
}
