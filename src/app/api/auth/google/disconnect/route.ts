import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await getServerSupabase();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const admin = getAdminSupabase();
  await admin.from("google_oauth_tokens").delete().eq("workspace_id", userRes.user.id);
  await admin.from("calendar_events").delete().eq("workspace_id", userRes.user.id);
  return NextResponse.json({ ok: true });
}
