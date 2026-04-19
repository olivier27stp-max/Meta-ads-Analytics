import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  generateEventId,
  recordCapiEvent,
  resolveWorkspaceByApiKey,
} from "@/lib/attribution-shared";

export const runtime = "nodejs";

/**
 * Public endpoint hit by the landing page form. Gated by a per-workspace
 * public API key (not the Supabase anon key). Creates a `lead` row with all
 * attribution signals and fires a "Lead" CAPI event immediately if Meta
 * Pixel credentials are configured in Settings.
 *
 * CORS is open so any landing domain can call this. That's safe because the
 * only write allowed is an INSERT into the workspace's leads table.
 */
const Schema = z.object({
  api_key: z.string().min(10),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  company: z.string().optional(),
  fbclid: z.string().optional(),
  fbc: z.string().optional(),
  fbp: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  landing_url: z.string().optional(),
  referrer: z.string().optional(),
});

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400, headers: corsHeaders() },
    );
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", details: parsed.error.flatten() },
      { status: 400, headers: corsHeaders() },
    );
  }

  const ws = await resolveWorkspaceByApiKey(parsed.data.api_key);
  if (!ws) {
    return NextResponse.json(
      { ok: false, error: "invalid_api_key" },
      { status: 401, headers: corsHeaders() },
    );
  }

  const admin = getAdminSupabase();
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;

  const { data: lead, error: insertErr } = await admin
    .from("leads")
    .insert({
      workspace_id: ws.workspaceId,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      first_name: parsed.data.first_name ?? null,
      last_name: parsed.data.last_name ?? null,
      company: parsed.data.company ?? null,
      fbclid: parsed.data.fbclid ?? null,
      fbc: parsed.data.fbc ?? null,
      fbp: parsed.data.fbp ?? null,
      utm_source: parsed.data.utm_source ?? null,
      utm_medium: parsed.data.utm_medium ?? null,
      utm_campaign: parsed.data.utm_campaign ?? null,
      utm_content: parsed.data.utm_content ?? null,
      utm_term: parsed.data.utm_term ?? null,
      landing_url: parsed.data.landing_url ?? null,
      referrer: parsed.data.referrer ?? null,
      client_ip: clientIp,
      user_agent: userAgent,
      stage: "lead",
    })
    .select("id")
    .single();

  if (insertErr || !lead) {
    return NextResponse.json(
      { ok: false, error: "insert_failed", detail: insertErr?.message },
      { status: 500, headers: corsHeaders() },
    );
  }

  // Fire CAPI "Lead" event immediately if configured.
  let capiResult: { ok: boolean; httpStatus: number } | null = null;
  const { pixelId, capiAccessToken, testEventCode, stageMap, defaultCurrency } = ws.attribution;
  const leadEventName = stageMap.lead || "Lead";
  if (pixelId && capiAccessToken && leadEventName) {
    const eventId = generateEventId("lead");
    const res = await recordCapiEvent({
      workspaceId: ws.workspaceId,
      leadId: lead.id,
      eventName: leadEventName,
      eventTimeMs: Date.now(),
      eventId,
      currency: defaultCurrency || "USD",
      config: { pixelId, accessToken: capiAccessToken, testEventCode },
      userData: {
        email: parsed.data.email,
        phone: parsed.data.phone,
        firstName: parsed.data.first_name,
        lastName: parsed.data.last_name,
        fbc: parsed.data.fbc,
        fbp: parsed.data.fbp,
        ip: clientIp ?? undefined,
        userAgent: userAgent ?? undefined,
      },
      eventSourceUrl: parsed.data.landing_url,
      customData: { leadEventSource: "web_form" },
    });
    capiResult = { ok: res.ok, httpStatus: res.httpStatus };
  }

  return NextResponse.json(
    {
      ok: true,
      lead_id: lead.id,
      capi: capiResult,
    },
    { headers: corsHeaders() },
  );
}
