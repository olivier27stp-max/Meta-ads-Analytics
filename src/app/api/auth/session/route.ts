import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ ok: true, user: null });
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "",
      workspaceId: user.id,
    },
  });
}
