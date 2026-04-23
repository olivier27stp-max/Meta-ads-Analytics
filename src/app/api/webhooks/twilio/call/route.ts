import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  resolveWorkspaceByApiKey,
  resolveWorkspaceById,
} from "@/lib/attribution-shared";
import {
  normalizePhone,
  verifyTwilioSignature,
} from "@/lib/integrations/twilio";

export const runtime = "nodejs";

/**
 * Twilio call webhook. Configure your Twilio phone number's Status Callback
 * to POST to:
 *
 *   https://YOUR_APP/api/webhooks/twilio/call?workspace_id=<WS_UUID>
 *   or
 *   https://YOUR_APP/api/webhooks/twilio/call?api_key=<PUBLIC_API_KEY>
 *
 * Twilio signs each request with HMAC-SHA1 using your Twilio Auth Token;
 * we verify the signature against the Auth Token saved in Settings.
 *
 * Typical Twilio form fields received:
 *   CallSid, AccountSid, From, To, Direction, CallStatus, CallDuration,
 *   RecordingUrl, RecordingSid, Timestamp, StartTime, EndTime
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const workspaceIdParam = url.searchParams.get("workspace_id");
  const apiKeyParam = url.searchParams.get("api_key");

  // Twilio posts form-urlencoded by default.
  const rawBody = await req.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(rawBody).entries()) {
    params[k] = v;
  }

  // 1) Resolve workspace
  let ws = null;
  if (workspaceIdParam) ws = await resolveWorkspaceById(workspaceIdParam);
  if (!ws && apiKeyParam) ws = await resolveWorkspaceByApiKey(apiKeyParam);
  if (!ws) {
    return NextResponse.json(
      { ok: false, error: "workspace_not_found" },
      { status: 401 },
    );
  }

  // 2) Load Twilio auth token from workspace state_json settings
  const admin = getAdminSupabase();
  const { data: wsRow } = await admin
    .from("workspaces")
    .select("state_json")
    .eq("id", ws.workspaceId)
    .maybeSingle();
  const state =
    (wsRow?.state_json as { state?: Record<string, unknown> } | null) ?? {};
  const inner =
    state && "state" in state ? state.state ?? {} : (state as Record<string, unknown>);
  const settings = (inner.settings as Record<string, unknown> | undefined) ?? {};
  const automation = (settings.automation as
    | { twilio?: { authToken?: string; accountSid?: string } }
    | undefined) ?? {};
  const twilioAuthToken = automation.twilio?.authToken ?? "";

  // 3) Verify Twilio signature (required when authToken is set)
  const signature = req.headers.get("x-twilio-signature");
  if (twilioAuthToken) {
    const ok = verifyTwilioSignature({
      url: url.toString(),
      body: params,
      signature,
      authToken: twilioAuthToken,
    });
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "invalid_signature" },
        { status: 401 },
      );
    }
  }

  // 4) Upsert the call row
  const fromDigits = normalizePhone(params["From"]);
  const toDigits = normalizePhone(params["To"]);

  // Try to match a lead by phone number (either From or To)
  let leadId: string | null = null;
  if (fromDigits || toDigits) {
    const phones = [fromDigits, toDigits].filter(Boolean) as string[];
    const { data: leadMatch } = await admin
      .from("leads")
      .select("id, phone")
      .eq("workspace_id", ws.workspaceId)
      .or(phones.map((p) => `phone.ilike.%${p}%`).join(","))
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (leadMatch) leadId = leadMatch.id as string;
  }

  const durationRaw = Number(params["CallDuration"]);
  const duration = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : null;

  const recordingSid = params["RecordingSid"] ?? null;
  const recordingUrl =
    params["RecordingUrl"] || (recordingSid ? `${params["RecordingUrl"] ?? ""}` : null);

  const { data: upserted, error } = await admin
    .from("twilio_calls")
    .upsert(
      {
        workspace_id: ws.workspaceId,
        lead_id: leadId,
        twilio_call_sid: params["CallSid"] ?? null,
        account_sid: params["AccountSid"] ?? null,
        direction: params["Direction"] ?? null,
        from_number: params["From"] ?? null,
        to_number: params["To"] ?? null,
        status: params["CallStatus"] ?? null,
        duration_sec: duration,
        recording_url: recordingUrl,
        recording_sid: recordingSid,
        price_usd: Number(params["Price"]) || null,
        started_at: params["StartTime"] ? new Date(params["StartTime"]).toISOString() : null,
        ended_at: params["EndTime"] ? new Date(params["EndTime"]).toISOString() : null,
        raw_payload: params,
      },
      { onConflict: "workspace_id,twilio_call_sid" },
    )
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "insert_failed", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, callId: upserted?.id, leadId });
}
