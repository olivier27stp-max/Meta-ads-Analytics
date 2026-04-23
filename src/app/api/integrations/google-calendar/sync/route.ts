import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  fetchCalendarEvents,
  refreshAccessToken,
} from "@/lib/integrations/google-oauth";

export const runtime = "nodejs";
export const maxDuration = 45;

/**
 * Pulls the last-30 / next-60 days of events from the user's Google Calendar,
 * refreshing the access token via the stored refresh token when expired.
 * Each event is upserted into `calendar_events` on (workspace_id, google_event_id).
 */
export async function POST() {
  const supabase = await getServerSupabase();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const admin = getAdminSupabase();
  const { data: tokenRow, error: tokenErr } = await admin
    .from("google_oauth_tokens")
    .select("access_token,refresh_token,token_expires_at,google_email")
    .eq("workspace_id", userRes.user.id)
    .maybeSingle();

  if (tokenErr || !tokenRow) {
    return NextResponse.json(
      { ok: false, error: "not_connected" },
      { status: 400 },
    );
  }

  // Refresh if the token is expired / about to expire.
  let accessToken = tokenRow.access_token as string;
  const expires = tokenRow.token_expires_at
    ? new Date(tokenRow.token_expires_at).getTime()
    : 0;
  if (Date.now() + 60_000 > expires && tokenRow.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token as string);
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(
        Date.now() + refreshed.expires_in * 1000,
      ).toISOString();
      await admin
        .from("google_oauth_tokens")
        .update({
          access_token: accessToken,
          token_expires_at: newExpiresAt,
          last_sync_error: null,
        })
        .eq("workspace_id", userRes.user.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "refresh_failed";
      await admin
        .from("google_oauth_tokens")
        .update({ last_sync_error: msg })
        .eq("workspace_id", userRes.user.id);
      return NextResponse.json(
        { ok: false, error: "refresh_failed", detail: msg },
        { status: 502 },
      );
    }
  }

  try {
    const events = await fetchCalendarEvents(accessToken);
    // Upsert each event
    const rows = events.map((e) => {
      const start = e.start?.dateTime ?? e.start?.date ?? null;
      const end = e.end?.dateTime ?? e.end?.date ?? null;
      const isAllDay = Boolean(e.start?.date && !e.start?.dateTime);
      return {
        workspace_id: userRes.user.id,
        google_event_id: e.id,
        calendar_id: "primary",
        title: e.summary ?? null,
        description: e.description ?? null,
        location: e.location ?? null,
        start_time: start,
        end_time: end,
        is_all_day: isAllDay,
        status: e.status ?? null,
        attendees: e.attendees ?? null,
        organizer_email: e.organizer?.email ?? null,
        html_link: e.htmlLink ?? null,
      };
    });

    if (rows.length > 0) {
      const { error } = await admin
        .from("calendar_events")
        .upsert(rows, { onConflict: "workspace_id,google_event_id" });
      if (error) throw new Error(error.message);
    }

    await admin
      .from("google_oauth_tokens")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_error: null,
      })
      .eq("workspace_id", userRes.user.id);

    return NextResponse.json({
      ok: true,
      count: rows.length,
      email: tokenRow.google_email,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "sync_failed";
    await admin
      .from("google_oauth_tokens")
      .update({ last_sync_error: msg })
      .eq("workspace_id", userRes.user.id);
    return NextResponse.json(
      { ok: false, error: "sync_failed", detail: msg },
      { status: 502 },
    );
  }
}
