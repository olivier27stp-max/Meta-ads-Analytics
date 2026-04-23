"use client";

import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { LeadStage } from "@/types";

export interface LeadRow {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  fbclid: string | null;
  fbc: string | null;
  fbp: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  landing_url: string | null;
  referrer: string | null;
  stage: LeadStage;
  value: number | null;
  currency: string;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT_COLS =
  "id,email,phone,first_name,last_name,company,fbclid,fbc,fbp,utm_source,utm_medium,utm_campaign,utm_content,utm_term,landing_url,referrer,stage,value,currency,external_id,created_at,updated_at";

export async function fetchLeads(): Promise<LeadRow[]> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase
    .from("leads")
    .select(SELECT_COLS)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) {
    console.warn("[leads] fetch error", error.message);
    return [];
  }
  return (data as LeadRow[]) ?? [];
}

export async function updateLeadStage(
  id: string,
  stage: LeadStage,
  opts?: { value?: number; currency?: string },
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/leads/${id}/stage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      stage,
      value: opts?.value,
      currency: opts?.currency,
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok && body.ok, error: body.error };
}

export const STAGE_LABEL: Record<LeadStage, string> = {
  lead: "Lead",
  mql: "MQL",
  demo_booked: "Demo booked",
  demo_attended: "Demo attended",
  proposal: "Proposal",
  closed_won: "Closed-won",
  closed_lost: "Closed-lost",
};

export const STAGE_TONE: Record<LeadStage, "success" | "warning" | "danger" | "muted" | "info"> = {
  lead: "muted",
  mql: "info",
  demo_booked: "info",
  demo_attended: "info",
  proposal: "warning",
  closed_won: "success",
  closed_lost: "danger",
};

export const PIPELINE_STAGES: LeadStage[] = [
  "lead",
  "mql",
  "demo_booked",
  "demo_attended",
  "proposal",
  "closed_won",
  "closed_lost",
];

export const ACTIVE_STAGES: LeadStage[] = [
  "lead",
  "mql",
  "demo_booked",
  "demo_attended",
  "proposal",
];

export function displayName(lead: LeadRow): string {
  const full = [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim();
  return full || lead.email || "(no name)";
}

export function leadSource(lead: LeadRow): string | null {
  const bits = [lead.utm_campaign, lead.utm_content].filter(Boolean);
  return bits.length > 0 ? bits.join(" · ") : null;
}
