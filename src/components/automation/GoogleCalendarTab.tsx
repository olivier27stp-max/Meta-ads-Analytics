"use client";

import * as React from "react";
import {
  CalendarDays,
  RefreshCw,
  LogOut,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutomationCard, Banner } from "./shared";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { formatRelative } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

interface CalendarEventRow {
  id: string;
  google_event_id: string;
  title: string | null;
  start_time: string | null;
  end_time: string | null;
  html_link: string | null;
  organizer_email: string | null;
}

interface ConnectionStatus {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}

export function GoogleCalendarTab() {
  const search = useSearchParams();
  const connectedEmailParam = search.get("google_connected");
  const errorParam = search.get("google_error");

  const [configured, setConfigured] = React.useState<boolean | null>(null);
  const [status, setStatus] = React.useState<ConnectionStatus | null>(null);
  const [events, setEvents] = React.useState<CalendarEventRow[]>([]);
  const [syncing, setSyncing] = React.useState(false);
  const [syncResult, setSyncResult] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const statusRes = await fetch("/api/integrations/google-calendar/status");
    if (statusRes.ok) {
      const body = await statusRes.json();
      setConfigured(Boolean(body.configured));
      setStatus(body.status);
    }
    const supabase = getBrowserSupabase();
    const { data } = await supabase
      .from("calendar_events")
      .select("id,google_event_id,title,start_time,end_time,html_link,organizer_email")
      .order("start_time", { ascending: true })
      .limit(12);
    setEvents((data as CalendarEventRow[]) ?? []);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = () => {
    window.location.href = "/api/auth/google/start";
  };

  const disconnect = async () => {
    const res = await fetch("/api/auth/google/disconnect", { method: "POST" });
    if (res.ok) {
      setStatus({ connected: false, email: null, connectedAt: null, lastSyncedAt: null, lastSyncError: null });
      setEvents([]);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/integrations/google-calendar/sync", {
        method: "POST",
      });
      const body = await res.json();
      if (body.ok) {
        setSyncResult(`✓ Synced ${body.count} events from ${body.email}`);
        await refresh();
      } else {
        setSyncResult(`✗ ${body.detail ?? body.error ?? "sync_failed"}`);
      }
    } catch (err) {
      setSyncResult(`✗ ${err instanceof Error ? err.message : "network_error"}`);
    } finally {
      setSyncing(false);
    }
  };

  const connectionStatus =
    configured === false
      ? "disconnected"
      : status?.connected
        ? "connected"
        : configured
          ? "pending"
          : "disconnected";

  return (
    <div className="flex flex-col gap-4">
      {connectedEmailParam && (
        <Banner tone="success">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Connected as <span className="font-semibold">{connectedEmailParam}</span>. Run a sync
            to pull your upcoming events.
          </span>
        </Banner>
      )}
      {errorParam && (
        <Banner tone="danger">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>OAuth failed: {errorParam}</span>
        </Banner>
      )}

      <AutomationCard
        title="Google Calendar — per user"
        description="Each Entiore user connects their own Google account. The sync only pulls events where that user is an attendee, so everyone sees just the jobs assigned to them."
        status={connectionStatus}
        icon={<CalendarDays className="h-3.5 w-3.5" />}
        footer={
          status?.connected ? (
            <>
              <Button variant="ghost" size="sm" onClick={disconnect}>
                <LogOut />
                Disconnect
              </Button>
              <Button variant="primary" size="sm" onClick={syncNow} disabled={syncing}>
                <RefreshCw className={syncing ? "animate-spin" : ""} />
                {syncing ? "Syncing…" : "Sync now"}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={connect}
              disabled={configured === false}
            >
              <ExternalLink />
              Connect Google Calendar
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-3">
          {configured === false && (
            <Banner tone="warning">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <div className="font-semibold">
                  Google OAuth not configured on the server.
                </div>
                <div>
                  Set <span className="font-mono">GOOGLE_OAUTH_CLIENT_ID</span>,{" "}
                  <span className="font-mono">GOOGLE_OAUTH_CLIENT_SECRET</span>, and{" "}
                  <span className="font-mono">GOOGLE_OAUTH_REDIRECT_URI</span> in{" "}
                  <span className="font-mono">.env.local</span>, then restart.
                </div>
              </div>
            </Banner>
          )}

          {status?.connected && (
            <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/20 px-3 py-2 text-[12.5px]">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Connected as</span>
                <span className="font-semibold">{status.email}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>
                  Connected {status.connectedAt ? formatRelative(status.connectedAt) : "—"}
                </span>
                <span>·</span>
                <span>
                  Last sync{" "}
                  {status.lastSyncedAt ? formatRelative(status.lastSyncedAt) : "never"}
                </span>
              </div>
              {status.lastSyncError && (
                <div className="mt-1 text-[11px] text-danger">
                  Last sync error: {status.lastSyncError}
                </div>
              )}
            </div>
          )}

          {syncResult && (
            <Banner tone={syncResult.startsWith("✓") ? "success" : "danger"}>
              {syncResult}
            </Banner>
          )}
        </div>
      </AutomationCard>

      <AutomationCard
        title="Upcoming events (synced)"
        description="Next 60 days from your connected Google Calendar."
        icon={<CalendarDays className="h-3.5 w-3.5" />}
      >
        {events.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-6 text-center text-[12px] text-muted-foreground">
            No events yet. Connect your Google account and click &ldquo;Sync now&rdquo;.
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-[12.5px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-foreground">
                    {e.title ?? "(no title)"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {e.start_time
                      ? new Date(e.start_time).toLocaleString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                    {e.organizer_email && (
                      <>
                        {" "}
                        · <Badge tone="muted" size="sm">
                          {e.organizer_email}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                {e.html_link && (
                  <a
                    href={e.html_link}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-md border border-border bg-muted/40 p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Open in Google Calendar"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </AutomationCard>
    </div>
  );
}
