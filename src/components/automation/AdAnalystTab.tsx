"use client";

import * as React from "react";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutomationCard } from "./shared";
import { useStore } from "@/lib/store";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { formatMoney, formatRelative } from "@/lib/utils";

interface ClosedLeadRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  stage: string;
  value: number | null;
  utm_campaign: string | null;
  utm_content: string | null;
  fbclid: string | null;
  landing_url: string | null;
  updated_at: string;
}

interface CapiEventRow {
  id: string;
  event_name: string;
  value: number | null;
  status: string;
  http_status: number | null;
  created_at: string;
}

export function AdAnalystTab() {
  const settings = useStore((s) => s.settings);
  const accounts = useStore((s) => s.accounts);
  const creatives = useStore((s) => s.creatives);
  const [closed, setClosed] = React.useState<ClosedLeadRow[]>([]);
  const [events, setEvents] = React.useState<CapiEventRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const supabase = getBrowserSupabase();
    const [closedRes, eventsRes] = await Promise.all([
      supabase
        .from("leads")
        .select(
          "id,email,first_name,last_name,stage,value,utm_campaign,utm_content,fbclid,landing_url,updated_at",
        )
        .eq("stage", "closed_won")
        .order("updated_at", { ascending: false })
        .limit(12),
      supabase
        .from("capi_events")
        .select("id,event_name,value,status,http_status,created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
    setClosed((closedRes.data as ClosedLeadRow[]) ?? []);
    setEvents((eventsRes.data as CapiEventRow[]) ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const metaTokenConfigured = false; // server-side env var; surfaced via /api/settings
  const pixelConfigured = Boolean(settings.attribution.pixelId);
  const capiConfigured = Boolean(settings.attribution.capiAccessToken);
  const activeAccounts = accounts.filter((a) => a.isActive).length;
  const creativeCount = creatives.length;

  // Match closed leads to creatives by utm_content == creative name (if any)
  const closedWithCreatives = closed.map((l) => {
    const creativeHit = l.utm_content
      ? creatives.find(
          (c) =>
            c.name.toLowerCase().includes(l.utm_content!.toLowerCase()) ||
            c.adId === l.utm_content,
        )
      : null;
    return { lead: l, creative: creativeHit };
  });

  const totalWonValue = closed.reduce((a, l) => a + (l.value ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <AutomationCard
        title="Ad analyst — end-to-end attribution"
        description="Traces every closed deal back to the exact creative that drove the click. Meta CAPI sends the Purchase event back to the pixel so ads optimize on real outcomes."
        status={capiConfigured && pixelConfigured ? "connected" : "pending"}
        icon={<Sparkles className="h-3.5 w-3.5" />}
        footer={
          <Button variant="secondary" size="sm" onClick={refresh}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatusTile
            label="Meta Pixel"
            on={pixelConfigured}
            hint={settings.attribution.pixelId || "Not set"}
          />
          <StatusTile
            label="CAPI Access Token"
            on={capiConfigured}
            hint={capiConfigured ? "Saved" : "Not set"}
          />
          <StatusTile
            label="Connected ad accounts"
            on={activeAccounts > 0}
            hint={`${activeAccounts} active`}
          />
          <StatusTile
            label="Tracked creatives"
            on={creativeCount > 0}
            hint={`${creativeCount} total`}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
          <SummaryTile
            label="Closed-won"
            value={closed.length.toString()}
            hint="Last 12 shown"
          />
          <SummaryTile
            label="Won value"
            value={formatMoney(totalWonValue)}
            hint="Contract totals"
          />
          <SummaryTile
            label="CAPI events"
            value={events.length.toString()}
            hint={`${events.filter((e) => e.status === "sent").length} sent`}
          />
          <SummaryTile
            label="With attribution"
            value={closed.filter((l) => l.utm_content || l.fbclid).length.toString()}
            hint="fbclid or utm_content"
          />
        </div>
      </AutomationCard>

      <AutomationCard
        title="Closed deals → creative chain"
        description="The link you actually care about: deal closed → which creative drove the click → which campaign → which account."
        icon={<TrendingUp className="h-3.5 w-3.5" />}
      >
        {closedWithCreatives.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-6 text-center text-[12px] text-muted-foreground">
            No closed-won leads yet. When a lead hits closed-won (via CRM webhook
            or the Pipeline UI), the attribution chain appears here with the
            creative that started it.
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {closedWithCreatives.map(({ lead, creative }) => (
              <li
                key={lead.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-[12.5px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">
                    {[lead.first_name, lead.last_name].filter(Boolean).join(" ") ||
                      lead.email}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Badge tone="success" size="sm">
                      {lead.value ? formatMoney(lead.value) : "no value"}
                    </Badge>
                    {lead.utm_campaign && (
                      <span>
                        camp:{" "}
                        <span className="font-mono text-foreground/80">
                          {lead.utm_campaign}
                        </span>
                      </span>
                    )}
                    {lead.utm_content && (
                      <span>
                        · creative:{" "}
                        <span className="font-mono text-foreground/80">
                          {lead.utm_content}
                        </span>
                      </span>
                    )}
                    {lead.fbclid && (
                      <Badge tone="info" size="sm">
                        <LinkIcon className="h-2.5 w-2.5" />
                        fbclid
                      </Badge>
                    )}
                  </div>
                  {creative && (
                    <div className="mt-0.5 text-[11px]">
                      <span className="text-muted-foreground">→ matched creative: </span>
                      <span className="font-semibold">{creative.name}</span>
                      <span className="ml-1 text-muted-foreground">
                        ({creative.campaignName})
                      </span>
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-[10.5px] tabular text-muted-foreground">
                  {formatRelative(lead.updated_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AutomationCard>

      <AutomationCard
        title="Recent CAPI deliveries"
        description="Server-side Meta Conversions API events. These are what make Meta see your closed deals and optimize accordingly."
        icon={<Sparkles className="h-3.5 w-3.5" />}
      >
        {events.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-6 text-center text-[12px] text-muted-foreground">
            No CAPI events sent yet. Configure Pixel + Token in Settings → Attribution,
            then trigger a stage change or lead capture.
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{e.event_name}</span>
                  <Badge
                    tone={
                      e.status === "sent"
                        ? "success"
                        : e.status === "failed"
                          ? "danger"
                          : "muted"
                    }
                    size="sm"
                  >
                    {e.status} {e.http_status ? `· ${e.http_status}` : ""}
                  </Badge>
                  {e.value && (
                    <span className="font-mono text-[11px] text-foreground/80">
                      {formatMoney(e.value)}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-[10.5px] tabular text-muted-foreground">
                  {formatRelative(e.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AutomationCard>
    </div>
  );
}

function StatusTile({
  label,
  on,
  hint,
}: {
  label: string;
  on: boolean;
  hint?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-md border px-3 py-2 text-[12px] ${
        on
          ? "border-success/25 bg-success-soft text-success"
          : "border-border bg-muted/20 text-muted-foreground"
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide">
          {label}
        </span>
        {on ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <span className="text-[10px] uppercase">off</span>
        )}
      </div>
      {hint && <span className="truncate text-[11px]">{hint}</span>}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-[16px] font-semibold tabular">{value}</div>
      {hint && <div className="text-[10.5px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
