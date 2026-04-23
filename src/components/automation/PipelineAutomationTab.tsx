"use client";

import * as React from "react";
import {
  GitBranch,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Webhook,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutomationCard } from "./shared";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { useStore } from "@/lib/store";
import { formatRelative } from "@/lib/utils";

interface ActivityRow {
  id: string;
  lead_id: string | null;
  actor: string;
  event_type: string;
  from_stage: string | null;
  to_stage: string | null;
  value: number | null;
  details: Record<string, unknown> | null;
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

export function PipelineAutomationTab() {
  const settings = useStore((s) => s.settings);
  const [rows, setRows] = React.useState<ActivityRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const supabase = getBrowserSupabase();
    const { data } = await supabase
      .from("lead_activity")
      .select("id,lead_id,actor,event_type,from_stage,to_stage,value,details,created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    setRows((data as ActivityRow[]) ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const capiConfigured = Boolean(
    settings.attribution.pixelId && settings.attribution.capiAccessToken,
  );
  const webhookConfigured = Boolean(settings.attribution.webhookSecret);

  return (
    <div className="flex flex-col gap-4">
      <AutomationCard
        title="Automatisation pipeline"
        description="Every stage change — whether from the Pipeline UI, the CRM webhook, or the Leads detail drawer — flows through one pipeline. Meta CAPI events fire automatically when a stage is mapped in Settings → Attribution."
        status="connected"
        icon={<GitBranch className="h-3.5 w-3.5" />}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[13px] font-semibold">UI → stage change</span>
            </div>
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              Moving a card on the Pipeline board hits <span className="font-mono">/api/leads/[id]/stage</span>,
              writes the new stage, logs an activity row, and fires the mapped
              Meta CAPI event.
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <Webhook className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[13px] font-semibold">CRM → stage change</span>
            </div>
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              When your CRM posts to <span className="font-mono">/api/webhooks/crm</span>,
              the lead&apos;s stage updates, activity logs, and the same
              stage → event mapping fires CAPI.
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          <StatusTile label="CRM webhook HMAC" on={webhookConfigured} />
          <StatusTile label="Meta CAPI firing" on={capiConfigured} />
          <StatusTile label="Stage → event map" on={Object.values(settings.attribution.stageMap).some(Boolean)} />
        </div>

        <div className="mt-3">
          <h4 className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            Stage → CAPI event mapping
          </h4>
          <ul className="grid grid-cols-1 gap-1 md:grid-cols-2">
            {Object.entries(settings.attribution.stageMap).map(([stage, eventName]) => (
              <li
                key={stage}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-1.5 text-[11.5px]"
              >
                <span className="font-medium">{STAGE_LABEL[stage] ?? stage}</span>
                <Badge tone={eventName ? "info" : "muted"} size="sm">
                  {eventName || "(no event)"}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </AutomationCard>

      <AutomationCard
        title="Recent pipeline activity"
        description="Live audit log of every stage change + lead creation, regardless of source."
        icon={<Bell className="h-3.5 w-3.5" />}
        footer={
          <Button variant="secondary" size="sm" onClick={refresh}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      >
        {rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-6 text-center text-[12px] text-muted-foreground">
            No activity yet. Move a lead on the Pipeline board or trigger the CRM
            webhook to see entries land here.
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px]"
              >
                <Badge
                  tone={
                    r.actor === "crm_webhook"
                      ? "info"
                      : r.actor === "pipeline_ui"
                        ? "success"
                        : r.actor === "api"
                          ? "muted"
                          : "muted"
                  }
                  size="sm"
                >
                  {r.actor}
                </Badge>
                <span className="font-medium">
                  {r.event_type === "lead_created"
                    ? "Lead created"
                    : r.event_type === "stage_changed"
                      ? "Stage changed"
                      : r.event_type}
                </span>
                {r.from_stage && r.to_stage && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <span>{STAGE_LABEL[r.from_stage] ?? r.from_stage}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{STAGE_LABEL[r.to_stage] ?? r.to_stage}</span>
                  </span>
                )}
                <span className="ml-auto shrink-0 text-[10.5px] tabular text-muted-foreground">
                  {formatRelative(r.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AutomationCard>
    </div>
  );
}

function StatusTile({ label, on }: { label: string; on: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-md border px-3 py-2 text-[12px] ${
        on
          ? "border-success/25 bg-success-soft text-success"
          : "border-border bg-muted/30 text-muted-foreground"
      }`}
    >
      <span className="font-medium">{label}</span>
      {on ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <span className="text-[10.5px] uppercase tracking-wide">off</span>
      )}
    </div>
  );
}
