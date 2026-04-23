import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  generateEventId,
  recordCapiEvent,
  resolveWorkspaceById,
} from "@/lib/attribution-shared";

export const runtime = "nodejs";

const Schema = z.object({
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
});

/**
 * In-app stage transition for a lead. Unlike /api/webhooks/crm, this is
 * session-authed (the user moved the card themselves) and does NOT require
 * an HMAC signature. RLS guarantees the user can only touch their own leads.
 * If Pixel + CAPI token are configured, it fires the mapped Meta event.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const supabase = await getServerSupabase();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .select("id,workspace_id,email,phone,first_name,last_name,fbc,fbp,landing_url,currency")
    .eq("id", id)
    .eq("workspace_id", userRes.user.id)
    .maybeSingle();
  if (leadErr || !lead) {
    return NextResponse.json({ ok: false, error: "lead_not_found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {
    stage: parsed.data.stage,
  };
  if (parsed.data.value !== undefined) update.value = parsed.data.value;
  if (parsed.data.currency) update.currency = parsed.data.currency;

  const { error: updateErr } = await admin
    .from("leads")
    .update(update)
    .eq("id", lead.id);
  if (updateErr) {
    return NextResponse.json(
      { ok: false, error: "update_failed", detail: updateErr.message },
      { status: 500 },
    );
  }

  // Fire CAPI if the workspace has Pixel + Token configured for this stage.
  const ws = await resolveWorkspaceById(userRes.user.id);
  let capi: { ok: boolean; httpStatus: number } | null = null;
  if (ws?.attribution.pixelId && ws.attribution.capiAccessToken) {
    const eventName = ws.attribution.stageMap[parsed.data.stage];
    if (eventName) {
      const result = await recordCapiEvent({
        workspaceId: userRes.user.id,
        leadId: lead.id,
        eventName,
        eventTimeMs: Date.now(),
        eventId: generateEventId(parsed.data.stage),
        value: parsed.data.value,
        currency:
          parsed.data.currency ??
          (lead as { currency?: string }).currency ??
          "USD",
        config: {
          pixelId: ws.attribution.pixelId,
          accessToken: ws.attribution.capiAccessToken,
          testEventCode: ws.attribution.testEventCode,
        },
        userData: {
          email: (lead as { email?: string }).email ?? undefined,
          phone: (lead as { phone?: string }).phone ?? undefined,
          firstName: (lead as { first_name?: string }).first_name ?? undefined,
          lastName: (lead as { last_name?: string }).last_name ?? undefined,
          fbc: (lead as { fbc?: string }).fbc ?? undefined,
          fbp: (lead as { fbp?: string }).fbp ?? undefined,
        },
        eventSourceUrl:
          (lead as { landing_url?: string }).landing_url ?? undefined,
        customData: { leadEventSource: "in_app" },
      });
      capi = { ok: result.ok, httpStatus: result.httpStatus };
    }
  }

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    stage: parsed.data.stage,
    capi,
  });
}
