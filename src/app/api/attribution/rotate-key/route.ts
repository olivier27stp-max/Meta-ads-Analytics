import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await getServerSupabase();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const newKey = crypto.randomBytes(24).toString("hex");
  const admin = getAdminSupabase();
  const { error } = await admin
    .from("workspaces")
    .update({ public_api_key: newKey })
    .eq("id", userRes.user.id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, publicApiKey: newKey });
}
