import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Session-authed internal endpoint to create a lead manually from the UI.
 * Unlike /api/leads/capture (which takes an api_key and is meant for
 * landing-page traffic), this one requires a signed-in user and inserts
 * into the leads table with workspace_id = auth.uid() (RLS-checked).
 */
const Schema = z.object({
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  stage: z
    .enum([
      "lead",
      "mql",
      "demo_booked",
      "demo_attended",
      "proposal",
      "closed_won",
      "closed_lost",
    ])
    .default("lead"),
  value: z.number().optional(),
  currency: z.string().default("USD"),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  external_id: z.string().optional(),
});

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminSupabase();
  const { data: lead, error } = await admin
    .from("leads")
    .insert({
      workspace_id: userRes.user.id,
      email: parsed.data.email?.toLowerCase() ?? null,
      first_name: parsed.data.first_name ?? null,
      last_name: parsed.data.last_name ?? null,
      phone: parsed.data.phone ?? null,
      company: parsed.data.company ?? null,
      stage: parsed.data.stage,
      value: parsed.data.value ?? null,
      currency: parsed.data.currency,
      utm_source: parsed.data.utm_source ?? null,
      utm_medium: parsed.data.utm_medium ?? null,
      utm_campaign: parsed.data.utm_campaign ?? null,
      utm_content: parsed.data.utm_content ?? null,
      utm_term: parsed.data.utm_term ?? null,
      external_id: parsed.data.external_id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "insert_failed", detail: error.message },
      { status: 500 },
    );
  }

  // Activity log
  void admin.from("lead_activity").insert({
    workspace_id: userRes.user.id,
    lead_id: lead.id,
    actor: "user",
    event_type: "lead_created",
    to_stage: parsed.data.stage,
    value: parsed.data.value ?? null,
    details: { source: "manual_ui" },
  });

  return NextResponse.json({ ok: true, leadId: lead.id });
}
