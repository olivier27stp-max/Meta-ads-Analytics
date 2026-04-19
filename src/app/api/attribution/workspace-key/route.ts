import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("workspaces")
    .select("public_api_key")
    .eq("id", userRes.user.id)
    .maybeSingle();
  return NextResponse.json({
    ok: true,
    workspaceId: userRes.user.id,
    publicApiKey: data?.public_api_key ?? null,
  });
}
