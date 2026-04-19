import "server-only";
import crypto from "node:crypto";

const GRAPH_VERSION = "v21.0";

export interface CapiUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  fbc?: string; // fb.1.<ts>.<fbclid>
  fbp?: string;
  ip?: string;
  userAgent?: string;
  externalId?: string; // CRM id
}

export interface CapiCustomData {
  value?: number;
  currency?: string;
  contentName?: string;
  contentCategory?: string;
  leadEventSource?: string;
}

export interface CapiEventInput {
  eventName: string; // e.g. "Lead", "Purchase"
  eventId: string; // unique; used for pixel/CAPI dedup
  eventTimeMs?: number;
  eventSourceUrl?: string;
  actionSource?:
    | "website"
    | "email"
    | "app"
    | "phone_call"
    | "chat"
    | "physical_store"
    | "system_generated"
    | "business_messaging"
    | "other";
  userData: CapiUserData;
  customData?: CapiCustomData;
}

export interface CapiConfig {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
}

function hash(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function hashPhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return undefined;
  return crypto.createHash("sha256").update(digits).digest("hex");
}

/**
 * Construct the fbc cookie-format string from a raw fbclid + capture timestamp.
 * Meta expects: fb.<subdomain_idx>.<ts_ms>.<fbclid>
 * subdomain_idx is 1 for most apex/www domains.
 */
export function buildFbc(fbclid: string, capturedAtMs: number): string {
  return `fb.1.${capturedAtMs}.${fbclid}`;
}

/**
 * Generate a stable event_id so server + browser pixel deduplicate.
 */
export function generateEventId(prefix = "evt"): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function buildUserData(u: CapiUserData): Record<string, unknown> {
  const userData: Record<string, unknown> = {};
  const em = hash(u.email);
  if (em) userData.em = [em];
  const ph = hashPhone(u.phone);
  if (ph) userData.ph = [ph];
  const fn = hash(u.firstName);
  if (fn) userData.fn = [fn];
  const ln = hash(u.lastName);
  if (ln) userData.ln = [ln];
  const ct = hash(u.city);
  if (ct) userData.ct = [ct];
  const st = hash(u.state);
  if (st) userData.st = [st];
  const zp = hash(u.zip);
  if (zp) userData.zp = [zp];
  const country = hash(u.country);
  if (country) userData.country = [country];
  const externalId = u.externalId ? hash(u.externalId) : undefined;
  if (externalId) userData.external_id = [externalId];
  if (u.fbc) userData.fbc = u.fbc;
  if (u.fbp) userData.fbp = u.fbp;
  if (u.ip) userData.client_ip_address = u.ip;
  if (u.userAgent) userData.client_user_agent = u.userAgent;
  return userData;
}

export interface CapiSendResult {
  ok: boolean;
  httpStatus: number;
  response: unknown;
  error?: string;
}

export async function sendCapiEvent(
  config: CapiConfig,
  event: CapiEventInput,
): Promise<CapiSendResult> {
  if (!config.pixelId || !config.accessToken) {
    return { ok: false, httpStatus: 0, response: null, error: "capi_not_configured" };
  }

  const eventTimeSec = Math.floor((event.eventTimeMs ?? Date.now()) / 1000);
  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: eventTimeSec,
        event_id: event.eventId,
        action_source: event.actionSource ?? "website",
        event_source_url: event.eventSourceUrl,
        user_data: buildUserData(event.userData),
        custom_data: event.customData
          ? {
              value: event.customData.value,
              currency: event.customData.currency,
              content_name: event.customData.contentName,
              content_category: event.customData.contentCategory,
              lead_event_source: event.customData.leadEventSource,
            }
          : undefined,
      },
    ],
    test_event_code: config.testEventCode || undefined,
  };

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${config.pixelId}/events?access_token=${encodeURIComponent(
    config.accessToken,
  )}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    const body = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      httpStatus: res.status,
      response: body,
    };
  } catch (err) {
    return {
      ok: false,
      httpStatus: 0,
      response: null,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

/**
 * HMAC-sign payload for CRM webhook verification. Used both to sign outbound
 * and to verify inbound.
 */
export function hmacSign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function hmacVerify(payload: string, secret: string, signature: string | null | undefined): boolean {
  if (!signature) return false;
  const expected = hmacSign(payload, secret);
  if (expected.length !== signature.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
