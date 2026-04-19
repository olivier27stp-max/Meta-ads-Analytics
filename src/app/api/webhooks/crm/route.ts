import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { hmacVerify } from "@/lib/meta-capi";
import {
  generateEventId,
  recordCapiEvent,
  resolveWorkspaceByApiKey,
  resolveWorkspaceById,
} from "@/lib/attribution-shared";

export const runtime = "nodejs";

/**
 * CRM webhook receiver. Your CRM (HubSpot, Salesforce, Pipedrive, Attio,
 * Close, custom) POSTs here when a deal stage changes. We:
 *   1. Verify HMAC signature (shared secret) if configured.
 *   2. Look up the lead by external_id or email.
 *   3. Update the lead's stage + value.
 *   4. Fire the mapped Meta CAPI event (Lead, Purchase, etc.).
 *
 * Authentication options (you pick one and set it in Settings):
 *   - `X-MCA-Signature: sha256=<hex>` header, HMAC of raw body with webhook
 *     secret. Recommended.
 *   - `api_key` field in the body. Simpler, less secure.
 */
const Schema = z.object({
  workspace_id: z.string().uuid().optional(),
  api_key: z.string().optional(),

  // Lookup keys (at least one required)
  lead_id: z.string().uuid().optional(),
  external_id: z.string().optional(),
  email: z.string().email().optional(),

  // State transition
  stage: z.enum([
    "lead",
    "mql",
    "demo_booked",
    "demo_attended",
    "proposal",
    "closed_won",
    "closed_lost",
  ]),
  value: z.number().optional(),
  currency: z.string().optional(),

  // Optional: override event name from the default stage map
  event_name: z.string().optional(),

  // Optional: pass user signals if the CRM has richer data than our lead row
  user: z
    .object({
      email: z.string().optional(),
      phone: z.string().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    })
    .optional(),

  event_source_url: z.string().optional(),
});

export async function POST(req: Request) {
  const rawBody = await req.text();
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(parsedBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // 1) Resolve the workspace
  let ws = null;
  if (parsed.data.workspace_id) {
    ws = await resolveWorkspaceById(parsed.data.workspace_id);
  }
  if (!ws && parsed.data.api_key) {
    ws = await resolveWorkspaceByApiKey(parsed.data.api_key);
  }
  if (!ws) {
    return NextResponse.json({ ok: false, error: "workspace_not_found" }, { status: 401 });
  }

  // 2) Verify signature if a secret is configured
  const signature = req.headers.get("x-mca-signature");
  if (ws.attribution.webhookSecret) {
    if (!signature || !hmacVerify(rawBody, ws.attribution.webhookSecret, signature.replace(/^sha256=/, ""))) {
      return NextResponse.json(
        { ok: false, error: "invalid_signature" },
        { status: 401 },
      );
    }
  }

  const admin = getAdminSupabase();

  // 3) Find the lead
  interface LeadRow {
    id: string;
    email: string | null;
    phone: string | null;
    first_name: string | null;
    last_name: string | null;
    fbc: string | null;
    fbp: string | null;
    landing_url: string | null;
    currency: string;
  }
  let lead: LeadRow | null = null;

  const selectCols = "id,email,phone,first_name,last_name,fbc,fbp,landing_url,currency";

  if (parsed.data.lead_id) {
    const { data } = await admin
      .from("leads")
      .select(selectCols)
      .eq("id", parsed.data.lead_id)
      .eq("workspace_id", ws.workspaceId)
      .maybeSingle();
    if (data) lead = data as unknown as LeadRow;
  }
  if (!lead && parsed.data.external_id) {
    const { data } = await admin
      .from("leads")
      .select(selectCols)
      .eq("external_id", parsed.data.external_id)
      .eq("workspace_id", ws.workspaceId)
      .maybeSingle();
    if (data) lead = data as unknown as LeadRow;
  }
  if (!lead && parsed.data.email) {
    const { data } = await admin
      .from("leads")
      .select(selectCols)
      .eq("email", parsed.data.email.toLowerCase())
      .eq("workspace_id", ws.workspaceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) lead = data as unknown as LeadRow;
  }
  if (!lead) {
    return NextResponse.json(
      { ok: false, error: "lead_not_found", hint: "Provide lead_id, external_id, or an email that matches an existing lead" },
      { status: 404 },
    );
  }

  // 4) Update stage + value + external_id
  const updatePatch: Record<string, unknown> = {
    stage: parsed.data.stage,
    value: parsed.data.value ?? null,
    currency: parsed.data.currency ?? lead.currency ?? "USD",
  };
  if (parsed.data.external_id) updatePatch.external_id = parsed.data.external_id;
  if (parsed.data.user?.email) updatePatch.email = parsed.data.user.email.toLowerCase();
  if (parsed.data.user?.phone) updatePatch.phone = parsed.data.user.phone;
  if (parsed.data.user?.first_name) updatePatch.first_name = parsed.data.user.first_name;
  if (parsed.data.user?.last_name) updatePatch.last_name = parsed.data.user.last_name;

  await admin.from("leads").update(updatePatch).eq("id", lead.id);

  // 5) Fire CAPI event if mapped
  const eventName =
    parsed.data.event_name ?? ws.attribution.stageMap[parsed.data.stage] ?? "";
  let capiResult: { ok: boolean; httpStatus: number; error?: string } | null = null;

  if (eventName && ws.attribution.pixelId && ws.attribution.capiAccessToken) {
    const eventId = generateEventId(parsed.data.stage);
    const res = await recordCapiEvent({
      workspaceId: ws.workspaceId,
      leadId: lead.id,
      eventName,
      eventTimeMs: Date.now(),
      eventId,
      value: parsed.data.value,
      currency: parsed.data.currency ?? lead.currency ?? "USD",
      config: {
        pixelId: ws.attribution.pixelId,
        accessToken: ws.attribution.capiAccessToken,
        testEventCode: ws.attribution.testEventCode,
      },
      userData: {
        email: parsed.data.user?.email ?? lead.email ?? undefined,
        phone: parsed.data.user?.phone ?? lead.phone ?? undefined,
        firstName: parsed.data.user?.first_name ?? lead.first_name ?? undefined,
        lastName: parsed.data.user?.last_name ?? lead.last_name ?? undefined,
        fbc: lead.fbc ?? undefined,
        fbp: lead.fbp ?? undefined,
      },
      eventSourceUrl: parsed.data.event_source_url ?? lead.landing_url ?? undefined,
      customData: { leadEventSource: "crm" },
    });
    capiResult = res;
  }

  return NextResponse.json({
    ok: true,
    lead_id: lead.id,
    stage: parsed.data.stage,
    event_name: eventName || null,
    capi: capiResult,
  });
}
