"use client";

import * as React from "react";
import {
  ContactRound,
  RefreshCw,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AutomationCard,
  CopyRow,
  SnippetBlock,
  Banner,
} from "./shared";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { formatRelative } from "@/lib/utils";

interface LeadRecent {
  id: string;
  email: string | null;
  stage: string;
  utm_campaign: string | null;
  utm_content: string | null;
  fbclid: string | null;
  created_at: string;
}

export function LeadsAutomationTab() {
  const [apiKey, setApiKey] = React.useState<string | null>(null);
  const [recent, setRecent] = React.useState<LeadRecent[]>([]);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(true);
  const [simulating, setSimulating] = React.useState(false);
  const [simResult, setSimResult] = React.useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://YOUR_APP";
  const endpoint = `${origin}/api/leads/capture`;
  const trackerSrc = `${origin}/mca-tracker.js`;

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const supabase = getBrowserSupabase();
    const [keyRes, leadsRes, countRes] = await Promise.all([
      fetch("/api/attribution/workspace-key"),
      supabase
        .from("leads")
        .select("id,email,stage,utm_campaign,utm_content,fbclid,created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("leads").select("id", { count: "exact", head: true }),
    ]);
    if (keyRes.ok) {
      const body = await keyRes.json();
      setApiKey(body.publicApiKey ?? null);
    }
    setRecent((leadsRes.data as LeadRecent[]) ?? []);
    setTotalCount(countRes.count ?? 0);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const status = apiKey
    ? recent.length > 0
      ? "connected"
      : "pending"
    : "disconnected";

  const runSim = async () => {
    if (!apiKey) return;
    setSimulating(true);
    setSimResult(null);
    const suffix = Date.now().toString(36);
    try {
      const res = await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          email: `sim-${suffix}@smoketest.local`,
          first_name: "Sim",
          last_name: "Lead",
          company: "Smoke Co",
          fbclid: `sim_${suffix}`,
          fbc: `fb.1.${Date.now()}.sim_${suffix}`,
          utm_source: "facebook",
          utm_medium: "paid",
          utm_campaign: "prospecting_us_broad",
          utm_content: "founder_story_45s",
          landing_url: "https://your-saas.com/demo",
        }),
      });
      const body = await res.json();
      setSimResult(body.ok ? `✓ Lead créé · id ${body.lead_id.slice(0, 8)}…` : `✗ ${body.error}`);
      await refresh();
    } catch {
      setSimResult("✗ Network error");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <AutomationCard
        title="Landing → Lead → CRM"
        description="Drop the tracker script on your landing pages. Form submissions create a lead in Supabase with fbclid + UTM tokens so you can trace which creative drove the sign-up."
        status={status}
        icon={<ContactRound className="h-3.5 w-3.5" />}
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={runSim}
              disabled={!apiKey || simulating}
            >
              <Sparkles />
              {simulating ? "Running…" : "Simulate a form submit"}
            </Button>
            <Button variant="secondary" size="sm" onClick={refresh}>
              <RefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-[12.5px]">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              <span className="font-semibold">{totalCount}</span> lead{totalCount === 1 ? "" : "s"} captured total ·{" "}
              {recent[0]?.created_at ? `last ${formatRelative(recent[0].created_at)}` : "waiting for first capture"}
            </span>
          </div>

          {simResult && (
            <Banner tone={simResult.startsWith("✓") ? "success" : "danger"}>
              {simResult.startsWith("✓") ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : null}
              {simResult}
            </Banner>
          )}

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <CopyRow label="Workspace API key" value={apiKey ?? "Loading…"} />
            <CopyRow label="Capture endpoint" value={endpoint} />
          </div>

          <SnippetBlock
            title="1 · Add the tracker script to every landing page"
            description="Captures fbclid + _fbp + UTMs on first visit and auto-fills your forms."
            language="html"
            snippet={`<script src="${trackerSrc}" async defer></script>`}
          />
          <SnippetBlock
            title="2 · POST the form to the capture endpoint"
            description="Include the workspace API key + all tracker fields. The lead is created instantly with a timestamp."
            language="javascript"
            snippet={postSnippet(endpoint, apiKey)}
          />
        </div>
      </AutomationCard>

      <AutomationCard
        title="Recent captures"
        description="Last 8 leads received. Each row surfaces the creative token carried from the ad."
        icon={<ContactRound className="h-3.5 w-3.5" />}
      >
        {recent.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-6 text-center text-[12px] text-muted-foreground">
            No leads yet. Either drop the tracker on your landing, run the Simulate
            button above, or wait for your first real form submit.
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {recent.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-[12.5px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-foreground">
                    {l.email ?? "(no email)"}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                    <Badge tone="muted" size="sm">
                      {l.stage}
                    </Badge>
                    {l.utm_campaign && (
                      <span>
                        camp:{" "}
                        <span className="font-mono text-foreground/80">
                          {l.utm_campaign}
                        </span>
                      </span>
                    )}
                    {l.utm_content && (
                      <span>
                        · creative:{" "}
                        <span className="font-mono text-foreground/80">
                          {l.utm_content}
                        </span>
                      </span>
                    )}
                    {l.fbclid && (
                      <Badge tone="info" size="sm">
                        fbclid
                      </Badge>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-[10.5px] tabular text-muted-foreground">
                  {formatRelative(l.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AutomationCard>
    </div>
  );
}

function postSnippet(endpoint: string, apiKey: string | null): string {
  return `const form = document.getElementById('lead-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const get = (k) => fd.get(k) || undefined;

  const res = await fetch('${endpoint}', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: '${apiKey ?? "YOUR_WORKSPACE_API_KEY"}',
      email:   get('email'),
      phone:   get('phone'),
      first_name: get('first_name'),
      company: get('company'),
      fbclid:  get('mca_fbclid'),
      fbc:     get('mca_fbc'),
      fbp:     get('mca_fbp'),
      utm_source:   get('mca_utm_source'),
      utm_medium:   get('mca_utm_medium'),
      utm_campaign: get('mca_utm_campaign'),
      utm_content:  get('mca_utm_content'),
      utm_term:     get('mca_utm_term'),
      landing_url:  get('mca_landing_url'),
    }),
  });

  const { lead_id } = await res.json();
  // → lead_id is persisted in Supabase, timestamped, linked to the ad via utm_content + fbclid.
});`;
}
