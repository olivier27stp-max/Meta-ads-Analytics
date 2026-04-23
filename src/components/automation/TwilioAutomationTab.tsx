"use client";

import * as React from "react";
import { PhoneCall, RefreshCw, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AutomationCard, CopyRow, SnippetBlock, Banner } from "./shared";
import { useStore } from "@/lib/store";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { formatRelative } from "@/lib/utils";

interface TwilioCallRow {
  id: string;
  twilio_call_sid: string | null;
  direction: string | null;
  from_number: string | null;
  to_number: string | null;
  status: string | null;
  duration_sec: number | null;
  recording_url: string | null;
  created_at: string;
}

export function TwilioAutomationTab() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const twilioSettings = settings.automation?.twilio ?? {
    accountSid: "",
    authToken: "",
    recordingWebhookEnabled: false,
  };

  const [accountSid, setAccountSid] = React.useState(twilioSettings.accountSid);
  const [authToken, setAuthToken] = React.useState(twilioSettings.authToken);
  const [showToken, setShowToken] = React.useState(false);
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [apiKey, setApiKey] = React.useState<string | null>(null);
  const [recent, setRecent] = React.useState<TwilioCallRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://YOUR_APP";

  React.useEffect(() => {
    setAccountSid(twilioSettings.accountSid);
    setAuthToken(twilioSettings.authToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twilioSettings.accountSid, twilioSettings.authToken]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const supabase = getBrowserSupabase();
    const [keyRes, callsRes] = await Promise.all([
      fetch("/api/attribution/workspace-key"),
      supabase
        .from("twilio_calls")
        .select(
          "id,twilio_call_sid,direction,from_number,to_number,status,duration_sec,recording_url,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (keyRes.ok) {
      const body = await keyRes.json();
      setWorkspaceId(body.workspaceId ?? null);
      setApiKey(body.publicApiKey ?? null);
    }
    setRecent((callsRes.data as TwilioCallRow[]) ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const configured = Boolean(accountSid && authToken);
  const status = configured
    ? recent.length > 0
      ? "connected"
      : "pending"
    : "disconnected";
  const dirty =
    accountSid !== twilioSettings.accountSid ||
    authToken !== twilioSettings.authToken;

  const save = () =>
    updateSettings({
      automation: {
        twilio: {
          ...twilioSettings,
          accountSid,
          authToken,
        },
        automations: settings.automation?.automations ?? {
          leads: true,
          twilio: false,
          googleCalendar: false,
          pipeline: true,
          adAnalyst: true,
        },
      },
    });

  const webhookUrl = workspaceId
    ? `${origin}/api/webhooks/twilio/call?workspace_id=${workspaceId}`
    : apiKey
      ? `${origin}/api/webhooks/twilio/call?api_key=${apiKey}`
      : `${origin}/api/webhooks/twilio/call?workspace_id=YOUR_WORKSPACE_ID`;

  return (
    <div className="flex flex-col gap-4">
      <AutomationCard
        title="Twilio — call tracking"
        description="Every completed call from your Twilio number is logged here. If the caller/callee phone number matches an existing lead we link the call to them automatically."
        status={status}
        icon={<PhoneCall className="h-3.5 w-3.5" />}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={refresh}>
              <RefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={save} disabled={!dirty}>
              Save credentials
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Twilio Account SID</Label>
              <Input
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
                placeholder="AC…"
                className="font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Twilio Auth Token</Label>
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="••••••••"
                  className="pr-9 font-mono"
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
                Used to verify webhook signatures. Never leaves your server.
              </span>
            </div>
          </div>

          <CopyRow label="Webhook URL — paste in Twilio phone number settings" value={webhookUrl} />

          {!configured && (
            <Banner tone="warning">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Add your Twilio Account SID + Auth Token then point a Twilio
                phone number&apos;s <span className="font-semibold">Status Callback URL</span> to
                the webhook above. HMAC signature verification kicks in as soon
                as the Auth Token is saved.
              </span>
            </Banner>
          )}
          {configured && recent.length === 0 && (
            <Banner tone="info">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Credentials saved. Still waiting for the first call webhook from
                Twilio — trigger a test call or check the Status Callback URL in
                the Twilio console.
              </span>
            </Banner>
          )}

          <SnippetBlock
            title="Twilio console setup"
            description="Phone Numbers → your number → A CALL COMES IN / Call Status Changes"
            language="text"
            snippet={`Webhook URL:  ${webhookUrl}
HTTP method:  POST
Primary handler fails: (leave empty)

Status Callback URL (important — recordings/completed calls fire here):
${webhookUrl}`}
          />
        </div>
      </AutomationCard>

      <AutomationCard
        title="Recent calls"
        description="Last 10 Twilio webhook deliveries."
        icon={<PhoneCall className="h-3.5 w-3.5" />}
      >
        {recent.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-6 text-center text-[12px] text-muted-foreground">
            No calls recorded yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {recent.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-[12.5px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Badge tone="muted" size="sm">
                      {c.direction ?? "—"}
                    </Badge>
                    <span className="font-mono text-[11px] text-foreground/80">
                      {c.from_number ?? "—"} → {c.to_number ?? "—"}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge
                      tone={
                        c.status === "completed"
                          ? "success"
                          : c.status === "failed" || c.status === "busy" || c.status === "no-answer"
                            ? "danger"
                            : "muted"
                      }
                      size="sm"
                    >
                      {c.status ?? "unknown"}
                    </Badge>
                    {c.duration_sec && <span>{c.duration_sec}s</span>}
                    {c.recording_url && <span>· recording available</span>}
                  </div>
                </div>
                <span className="shrink-0 text-[10.5px] tabular text-muted-foreground">
                  {formatRelative(c.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AutomationCard>
    </div>
  );
}
