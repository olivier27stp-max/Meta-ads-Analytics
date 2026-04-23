import "server-only";
import crypto from "node:crypto";

/**
 * Verify a Twilio webhook signature. Twilio signs each request with HMAC-SHA1
 * over the full URL concatenated with form params sorted and joined as
 * key+value strings.
 *
 * See: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function verifyTwilioSignature(params: {
  url: string;
  body: Record<string, string | string[] | undefined>;
  signature: string | null | undefined;
  authToken: string;
}): boolean {
  if (!params.signature || !params.authToken) return false;

  // Sort form params alphabetically and concat as key+value.
  const keys = Object.keys(params.body).sort();
  let data = params.url;
  for (const k of keys) {
    const v = params.body[k];
    if (Array.isArray(v)) {
      for (const item of v) data += k + String(item ?? "");
    } else {
      data += k + String(v ?? "");
    }
  }

  const computed = crypto
    .createHmac("sha1", params.authToken)
    .update(data)
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(params.signature),
    );
  } catch {
    return false;
  }
}

/**
 * Normalize a phone number to digits only for lookup/matching.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  return digits || null;
}
