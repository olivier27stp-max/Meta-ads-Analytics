import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { hasGoogleOAuthConfig } from "@/lib/integrations/google-oauth";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("google_oauth_tokens")
    .select("google_email,connected_at,last_synced_at,last_sync_error")
    .eq("workspace_id", userRes.user.id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    configured: hasGoogleOAuthConfig(),
    status: data
      ? {
          connected: true,
          email: data.google_email,
          connectedAt: data.connected_at,
          lastSyncedAt: data.last_synced_at,
          lastSyncError: data.last_sync_error,
        }
      : {
          connected: false,
          email: null,
          connectedAt: null,
          lastSyncedAt: null,
          lastSyncError: null,
        },
  });
}
