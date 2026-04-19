import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { sendCapiEvent, generateEventId, type CapiConfig, type CapiUserData } from "@/lib/meta-capi";

export interface WorkspaceAttributionConfig {
  workspaceId: string;
  displayName: string;
  attribution: {
    pixelId: string;
    capiAccessToken: string;
    webhookSecret: string;
    testEventCode: string;
    stageMap: Record<string, string>;
    defaultCurrency: string;
  };
}

/**
 * Resolve a workspace by its public API key (landing-page usage) — admin
 * client bypasses RLS. Only reads the minimum the attribution flow needs.
 */
export async function resolveWorkspaceByApiKey(
  apiKey: string,
): Promise<WorkspaceAttributionConfig | null> {
  if (!apiKey) return null;
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from("workspaces")
    .select("id, display_name, state_json")
    .eq("public_api_key", apiKey)
    .maybeSingle();
  if (error || !data) return null;

  const state = (data.state_json as Record<string, unknown>) || {};
  const state_ = (state.state || state) as Record<string, unknown>;
  const settings = (state_.settings as Record<string, unknown>) || {};
  const attribution =
    (settings.attribution as WorkspaceAttributionConfig["attribution"]) || {
      pixelId: "",
      capiAccessToken: "",
      webhookSecret: "",
      testEventCode: "",
      stageMap: {},
      defaultCurrency: "USD",
    };
  return {
    workspaceId: data.id,
    displayName: data.display_name,
    attribution,
  };
}

/**
 * Resolve workspace for a CRM webhook — same as above but we expect the
 * caller to have already verified the HMAC signature against the webhook
 * secret, which itself is scoped to the workspace. To find the right
 * workspace we match on the `api_key` payload field or the workspace id in
 * the URL path.
 */
export async function resolveWorkspaceById(
  workspaceId: string,
): Promise<WorkspaceAttributionConfig | null> {
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from("workspaces")
    .select("id, display_name, state_json")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error || !data) return null;
  const state = (data.state_json as Record<string, unknown>) || {};
  const state_ = (state.state || state) as Record<string, unknown>;
  const settings = (state_.settings as Record<string, unknown>) || {};
  const attribution =
    (settings.attribution as WorkspaceAttributionConfig["attribution"]) || {
      pixelId: "",
      capiAccessToken: "",
      webhookSecret: "",
      testEventCode: "",
      stageMap: {},
      defaultCurrency: "USD",
    };
  return {
    workspaceId: data.id,
    displayName: data.display_name,
    attribution,
  };
}

export async function recordCapiEvent(params: {
  workspaceId: string;
  leadId: string | null;
  eventName: string;
  eventTimeMs: number;
  eventId: string;
  value?: number;
  currency?: string;
  config: CapiConfig;
  userData: CapiUserData;
  eventSourceUrl?: string;
  customData?: { leadEventSource?: string };
}): Promise<{ ok: boolean; httpStatus: number; error?: string }> {
  const admin = getAdminSupabase();

  // Insert audit row first (queued state)
  const { data: queued, error: insertErr } = await admin
    .from("capi_events")
    .insert({
      workspace_id: params.workspaceId,
      lead_id: params.leadId,
      event_name: params.eventName,
      event_time: new Date(params.eventTimeMs).toISOString(),
      event_id: params.eventId,
      value: params.value ?? null,
      currency: params.currency ?? "USD",
      status: "queued",
    })
    .select("id")
    .single();
  if (insertErr || !queued) {
    return { ok: false, httpStatus: 0, error: insertErr?.message ?? "audit_insert_failed" };
  }

  // Send to Meta
  const result = await sendCapiEvent(params.config, {
    eventName: params.eventName,
    eventId: params.eventId,
    eventTimeMs: params.eventTimeMs,
    eventSourceUrl: params.eventSourceUrl,
    userData: params.userData,
    customData: {
      value: params.value,
      currency: params.currency ?? "USD",
      leadEventSource: params.customData?.leadEventSource,
    },
  });

  // Update audit row
  await admin
    .from("capi_events")
    .update({
      status: result.ok ? "sent" : "failed",
      http_status: result.httpStatus,
      meta_response: result.response as object,
      sent_at: new Date().toISOString(),
    })
    .eq("id", queued.id);

  return { ok: result.ok, httpStatus: result.httpStatus, error: result.error };
}

export { generateEventId };
