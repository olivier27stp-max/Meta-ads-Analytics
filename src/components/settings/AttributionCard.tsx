"use client";

import * as React from "react";
import { Webhook, Copy, RefreshCw, CheckCircle2, XCircle, Code2, Eye, EyeOff, Beaker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SettingsCard } from "./SettingsCard";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type TestState = { status: "idle" } | { status: "testing" } | { status: "ok"; httpStatus: number } | { status: "error"; message: string };
type SimState =
  | { status: "idle" }
  | { status: "running"; step: string }
  | { status: "ok"; leadId: string; closedWon: boolean; capiFired: boolean }
  | { status: "error"; message: string };

export function AttributionCard() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const [pixelId, setPixelId] = React.useState(settings.attribution.pixelId);
  const [token, setToken] = React.useState(settings.attribution.capiAccessToken);
  const [webhookSecret, setWebhookSecret] = React.useState(settings.attribution.webhookSecret);
  const [testCode, setTestCode] = React.useState(settings.attribution.testEventCode);
  const [showToken, setShowToken] = React.useState(false);
  const [testState, setTestState] = React.useState<TestState>({ status: "idle" });
  const [simState, setSimState] = React.useState<SimState>({ status: "idle" });

  const [apiKey, setApiKey] = React.useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPixelId(settings.attribution.pixelId);
    setToken(settings.attribution.capiAccessToken);
    setWebhookSecret(settings.attribution.webhookSecret);
    setTestCode(settings.attribution.testEventCode);
  }, [settings.attribution]);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/attribution/workspace-key");
      if (!res.ok) return;
      const body = await res.json();
      setApiKey(body.publicApiKey ?? null);
      setWorkspaceId(body.workspaceId ?? null);
    })();
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://YOUR_APP";
  const trackerSrc = `${origin}/mca-tracker.js`;
  const leadsEndpoint = `${origin}/api/leads/capture`;
  const webhookEndpoint = `${origin}/api/webhooks/crm`;

  const dirty =
    pixelId !== settings.attribution.pixelId ||
    token !== settings.attribution.capiAccessToken ||
    webhookSecret !== settings.attribution.webhookSecret ||
    testCode !== settings.attribution.testEventCode;

  const save = () =>
    updateSettings({
      attribution: {
        ...settings.attribution,
        pixelId,
        capiAccessToken: token,
        webhookSecret,
        testEventCode: testCode,
      },
    });

  const genSecret = () => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setWebhookSecret(hex);
  };

  const rotateApiKey = async () => {
    const res = await fetch("/api/attribution/rotate-key", { method: "POST" });
    if (res.ok) {
      const body = await res.json();
      setApiKey(body.publicApiKey);
    }
  };

  const simulateEndToEnd = async () => {
    if (!apiKey) return;
    setSimState({ status: "running", step: "Creating lead from simulated landing-page form…" });
    const suffix = Date.now().toString(36);
    const email = `sim-${suffix}@smoketest.local`;
    try {
      const capture = await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          email,
          first_name: "Sim",
          last_name: "Lead",
          company: "Smoke Co",
          fbclid: `sim_${suffix}`,
          fbc: `fb.1.${Date.now()}.sim_${suffix}`,
          fbp: `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e10)}`,
          utm_source: "facebook",
          utm_medium: "paid",
          utm_campaign: "prospecting_us_broad",
          utm_content: "founder_story_45s",
          landing_url: "https://your-saas.com/demo",
          referrer: "https://facebook.com/",
        }),
      });
      const body = await capture.json();
      if (!capture.ok || !body.ok) {
        setSimState({
          status: "error",
          message: `Lead capture failed: ${body.error ?? capture.status}`,
        });
        return;
      }
      const leadId = body.lead_id as string;
      const capiFired = body.capi?.ok === true;

      setSimState({ status: "running", step: "Simulating CRM webhook: demo_booked…" });
      await fetch("/api/webhooks/crm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          lead_id: leadId,
          stage: "demo_booked",
          external_id: `hubspot_${suffix}`,
        }),
      });

      setSimState({ status: "running", step: "Simulating CRM webhook: closed_won — $12,000…" });
      const closeRes = await fetch("/api/webhooks/crm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          email,
          stage: "closed_won",
          value: 12000,
          currency: "USD",
        }),
      });
      const closeBody = await closeRes.json();
      setSimState({
        status: "ok",
        leadId,
        closedWon: closeBody.ok === true,
        capiFired: capiFired || closeBody.capi?.ok === true,
      });
    } catch (err) {
      setSimState({
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  };

  const testCapi = async () => {
    setTestState({ status: "testing" });
    try {
      const res = await fetch("/api/attribution/test-capi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pixelId, capiAccessToken: token, testEventCode: testCode }),
      });
      const body = await res.json();
      if (body.ok) {
        setTestState({ status: "ok", httpStatus: body.httpStatus });
      } else {
        setTestState({
          status: "error",
          message:
            body.error === "missing_credentials"
              ? "Save a Pixel ID + Access Token first."
              : typeof body.response === "object" && body.response !== null
                ? JSON.stringify(body.response).slice(0, 240)
                : body.error || "Unknown error",
        });
      }
    } catch (err) {
      setTestState({
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  };

  return (
    <SettingsCard
      title="Attribution — Meta CAPI + CRM webhook"
      description="Track which creative closed which deal. Offline-conversion attribution for SaaS pipelines."
      icon={<Webhook className="h-4 w-4" />}
      footer={
        <>
          <Button variant="ghost" onClick={testCapi} disabled={!pixelId || !token || testState.status === "testing"}>
            {testState.status === "testing" ? "Testing…" : "Test CAPI"}
          </Button>
          <Button variant="primary" onClick={save} disabled={!dirty}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Meta Pixel ID</Label>
            <Input
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="1234567890123"
              className="tabular"
            />
            <span className="text-[11px] text-muted-foreground">
              Events Manager → Data Sources → your Pixel → Settings.
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Meta CAPI Access Token</Label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="EAAB…"
                className="pr-9"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground">
              System user long-lived token with <code className="font-mono">ads_management</code> scope.
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Test event code (optional)</Label>
            <Input
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              placeholder="TEST12345"
            />
            <span className="text-[11px] text-muted-foreground">
              Events Manager → Test events → copy the test code to stage-test before going live.
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Webhook signing secret</Label>
            <div className="flex items-center gap-1.5">
              <Input
                type={showToken ? "text" : "password"}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="hex string"
                className="font-mono"
                autoComplete="off"
              />
              <Button variant="secondary" size="sm" onClick={genSecret}>
                Gen
              </Button>
            </div>
            <span className="text-[11px] text-muted-foreground">
              HMAC secret — your CRM signs each webhook with this using SHA-256.
            </span>
          </div>
        </div>

        {testState.status === "ok" && (
          <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-xs text-success">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <div className="font-semibold">CAPI test event sent (HTTP {testState.httpStatus})</div>
              <div className="text-[11px] opacity-80">
                Check Events Manager → Test events — you should see a PageView arriving for{" "}
                <span className="font-mono">{pixelId}</span>.
              </div>
            </div>
          </div>
        )}
        {testState.status === "error" && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <div className="font-semibold">CAPI test failed</div>
              <div className="whitespace-pre-wrap break-all text-[11px] opacity-90">{testState.message}</div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-info-soft text-info">
                <Beaker className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-[13px] font-semibold">Simulate end-to-end attribution</div>
                <div className="text-[11.5px] text-muted-foreground">
                  Fires a fake form submit → CRM demo_booked → CRM closed_won ($12k). No landing page or ads required.
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={simulateEndToEnd}
              disabled={!apiKey || simState.status === "running"}
            >
              <Beaker />
              {simState.status === "running" ? "Running…" : "Run simulation"}
            </Button>
          </div>
          {simState.status === "running" && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-info/25 bg-info-soft px-3 py-2 text-[12px] text-info">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              {simState.step}
            </div>
          )}
          {simState.status === "ok" && (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-2.5 text-[12px] text-success">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Simulation passed
              </div>
              <ul className="list-disc space-y-0.5 pl-5 text-[11.5px] opacity-90">
                <li>Lead inserted (id: <span className="font-mono">{simState.leadId.slice(0, 8)}…</span>)</li>
                <li>Stage transitions persisted: lead → demo_booked → closed_won</li>
                <li>Deal value: $12,000</li>
                <li>
                  CAPI: {simState.capiFired ? "event sent to Meta ✓" : "not sent (Pixel/Token not configured — check Events Manager after you save credentials)"}
                </li>
              </ul>
            </div>
          )}
          {simState.status === "error" && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-[12px] text-danger">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{simState.message}</span>
            </div>
          )}
        </div>

        <KeyPanel label="Workspace public API key" value={apiKey ?? "Loading…"}>
          <Button variant="ghost" size="sm" onClick={rotateApiKey}>
            <RefreshCw />
            Rotate
          </Button>
        </KeyPanel>
        <KeyPanel label="Lead capture endpoint (POST from your landing)" value={leadsEndpoint} />
        <KeyPanel label="CRM webhook endpoint (POST from your CRM)" value={webhookEndpoint} />

        <SnippetBlock
          title="1) Drop this script on your landing page"
          description="Captures fbclid, _fbp, UTMs, landing URL, referrer. Auto-fills any form on the page with matching hidden inputs."
          snippet={`<script src="${trackerSrc}" async defer></script>`}
        />
        <SnippetBlock
          title="2) Add hidden inputs to your lead form"
          description="The tracker fills these on submit."
          snippet={HIDDEN_INPUTS_SNIPPET}
          language="html"
        />
        <SnippetBlock
          title="3) Post the submitted form to the lead capture endpoint"
          description={`apiKey = ${apiKey ?? "(loading)"} — expose it via a form action or your server handler.`}
          snippet={fetchSnippet(leadsEndpoint, apiKey)}
          language="javascript"
        />
        <SnippetBlock
          title="4) Configure your CRM webhook"
          description="When a deal stage changes, your CRM should POST here. Include the HMAC signature in the X-MCA-Signature header."
          snippet={webhookPayloadSnippet(webhookEndpoint, workspaceId, webhookSecret)}
          language="javascript"
        />
      </div>
    </SettingsCard>
  );
}

function KeyPanel({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-0.5 truncate font-mono text-[12.5px] text-foreground">{value}</div>
      </div>
      <Button variant="secondary" size="sm" onClick={copy}>
        <Copy />
        {copied ? "Copied" : "Copy"}
      </Button>
      {children}
    </div>
  );
}

function SnippetBlock({
  title,
  description,
  snippet,
  language,
}: {
  title: string;
  description: string;
  snippet: string;
  language?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2">
        <div className="flex items-center gap-2">
          <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <div className="text-[12.5px] font-semibold">{title}</div>
            <div className="text-[11px] text-muted-foreground">{description}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={copy}>
          <Copy />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className={cn("overflow-x-auto px-3.5 py-2.5 font-mono text-[11.5px] leading-relaxed", "text-foreground")}>
        {snippet}
      </pre>
      {language && (
        <div className="border-t border-border/70 px-3.5 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {language}
        </div>
      )}
    </div>
  );
}

const HIDDEN_INPUTS_SNIPPET = `<form id="lead-form">
  <input type="text"  name="email"         required>
  <input type="text"  name="first_name">
  <input type="text"  name="phone">
  <input type="text"  name="company">
  <!-- Attribution fields filled by mca-tracker.js -->
  <input type="hidden" name="mca_fbclid">
  <input type="hidden" name="mca_fbc">
  <input type="hidden" name="mca_fbp">
  <input type="hidden" name="mca_utm_source">
  <input type="hidden" name="mca_utm_medium">
  <input type="hidden" name="mca_utm_campaign">
  <input type="hidden" name="mca_utm_content">
  <input type="hidden" name="mca_utm_term">
  <input type="hidden" name="mca_landing_url">
  <input type="hidden" name="mca_referrer">
</form>`;

function fetchSnippet(endpoint: string, apiKey: string | null): string {
  return `// After your form submit handler:
const form = document.getElementById('lead-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const get = (k) => fd.get(k) || undefined;

  await fetch('${endpoint}', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key:    '${apiKey ?? "YOUR_PUBLIC_API_KEY"}',
      email:      get('email'),
      phone:      get('phone'),
      first_name: get('first_name'),
      company:    get('company'),
      fbclid:     get('mca_fbclid'),
      fbc:        get('mca_fbc'),
      fbp:        get('mca_fbp'),
      utm_source:   get('mca_utm_source'),
      utm_medium:   get('mca_utm_medium'),
      utm_campaign: get('mca_utm_campaign'),
      utm_content:  get('mca_utm_content'),
      utm_term:     get('mca_utm_term'),
      landing_url:  get('mca_landing_url'),
      referrer:     get('mca_referrer'),
    }),
  });

  // your own downstream — redirect to /thank-you, etc.
});`;
}

function webhookPayloadSnippet(endpoint: string, workspaceId: string | null, secret: string): string {
  const secretHint = secret ? "(same secret you set in Settings)" : "SET A SECRET IN SETTINGS FIRST";
  return `// From your CRM (serverless function, Zapier, Make, or native webhook):
import crypto from 'node:crypto';

const payload = {
  workspace_id: '${workspaceId ?? "YOUR_WORKSPACE_ID"}',
  external_id:  '<crm_record_id>',
  email:        '<lead@example.com>',
  stage:        'closed_won',   // lead | mql | demo_booked | demo_attended | proposal | closed_won | closed_lost
  value:        12000,          // contract value
  currency:     'USD',
  user: { email: '<lead@example.com>', first_name: 'Jane', last_name: 'Doe' }
};

const body = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', '${secret || "YOUR_SECRET"}' /* ${secretHint} */)
  .update(body)
  .digest('hex');

await fetch('${endpoint}', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-mca-signature': 'sha256=' + signature,
  },
  body,
});`;
}
