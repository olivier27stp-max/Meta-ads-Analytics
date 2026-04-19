"use client";

import * as React from "react";
import { Activity, RefreshCw, ArrowUpRight } from "lucide-react";
import { SettingsCard } from "./SettingsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { formatRelative, formatMoney } from "@/lib/utils";

interface LeadRow {
  id: string;
  email: string | null;
  stage: string;
  value: number | null;
  currency: string;
  fbclid: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  created_at: string;
  updated_at: string;
}

interface CapiRow {
  id: string;
  event_name: string;
  value: number | null;
  status: "queued" | "sent" | "failed";
  http_status: number | null;
  created_at: string;
}

const STAGE_LABEL: Record<string, string> = {
  lead: "Lead",
  mql: "MQL",
  demo_booked: "Demo booked",
  demo_attended: "Demo attended",
  proposal: "Proposal",
  closed_won: "Closed-won",
  closed_lost: "Closed-lost",
};

const STAGE_TONE: Record<string, "success" | "warning" | "danger" | "muted" | "info"> = {
  closed_won: "success",
  closed_lost: "danger",
  proposal: "warning",
  demo_booked: "info",
  demo_attended: "info",
  mql: "info",
  lead: "muted",
};

export function AttributionActivityCard() {
  const [leads, setLeads] = React.useState<LeadRow[]>([]);
  const [events, setEvents] = React.useState<CapiRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const supabase = getBrowserSupabase();
    const [leadsRes, eventsRes] = await Promise.all([
      supabase
        .from("leads")
        .select("id,email,stage,value,currency,fbclid,utm_campaign,utm_content,created_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(10),
      supabase
        .from("capi_events")
        .select("id,event_name,value,status,http_status,created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setLeads((leadsRes.data as LeadRow[]) ?? []);
    setEvents((eventsRes.data as CapiRow[]) ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <SettingsCard
      title="Attribution activity"
      description="Recent leads captured from landing, and recent Meta CAPI events sent."
      icon={<Activity className="h-4 w-4" />}
      footer={
        <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Recent leads ({leads.length})
            </h3>
            {leads.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                last 10
              </span>
            )}
          </div>
          {leads.length === 0 ? (
            <EmptyPanel>No leads captured yet. Use &ldquo;Run simulation&rdquo; above or hit the capture endpoint from your landing.</EmptyPanel>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {leads.map((l) => (
                <li
                  key={l.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge tone={STAGE_TONE[l.stage] ?? "muted"} size="sm">
                        {STAGE_LABEL[l.stage] ?? l.stage}
                      </Badge>
                      {l.value ? (
                        <span className="font-semibold tabular text-foreground">
                          {formatMoney(l.value)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 truncate">
                      <span className="font-medium text-foreground">{l.email ?? "—"}</span>
                    </div>
                    {(l.utm_campaign || l.utm_content || l.fbclid) && (
                      <div className="mt-0.5 flex flex-wrap gap-1 text-[10.5px] text-muted-foreground">
                        {l.utm_campaign && <span>camp: <span className="font-mono">{l.utm_campaign}</span></span>}
                        {l.utm_content && <span>· creative: <span className="font-mono">{l.utm_content}</span></span>}
                        {l.fbclid && <span>· fbclid ✓</span>}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-[10.5px] tabular text-muted-foreground">
                    {formatRelative(l.updated_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              CAPI events ({events.length})
            </h3>
            {events.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                last 10
              </span>
            )}
          </div>
          {events.length === 0 ? (
            <EmptyPanel>No CAPI events sent yet. They appear here automatically once you set Pixel ID + Access Token and a lead or CRM event fires.</EmptyPanel>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{e.event_name}</span>
                      <Badge
                        tone={e.status === "sent" ? "success" : e.status === "failed" ? "danger" : "muted"}
                        size="sm"
                      >
                        {e.status} {e.http_status ? `· ${e.http_status}` : ""}
                      </Badge>
                      {e.value ? (
                        <span className="font-semibold tabular text-foreground">
                          {formatMoney(e.value)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10.5px] tabular text-muted-foreground">
                    {formatRelative(e.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {events.length > 0 && (
            <a
              href="https://business.facebook.com/events_manager2/list/overview"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 self-start text-[11px] font-medium text-info hover:underline"
            >
              Open Meta Events Manager
              <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </SettingsCard>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-[11.5px] text-muted-foreground">
      {children}
    </div>
  );
}
