import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchAccountCreatives, hasMetaCredentials } from "@/lib/meta-sync";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.object({
  metaAccountId: z.string().min(1),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const supabase = await getServerSupabase();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id: accountId } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 },
    );
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" },
      { status: 400 },
    );
  }

  if (!hasMetaCredentials()) {
    return NextResponse.json({
      ok: true,
      mode: "demo",
      accountId,
      metaAccountId: parsed.data.metaAccountId,
      creatives: [],
      message:
        "META_ACCESS_TOKEN not configured on the server. Add it to .env.local to run a real sync.",
    });
  }

  try {
    const result = await fetchAccountCreatives(parsed.data.metaAccountId);
    return NextResponse.json({
      ok: true,
      mode: result.mode,
      accountId,
      metaAccountId: result.accountId,
      creatives: result.creatives,
      syncedAt: result.syncedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sync_failed";
    return NextResponse.json(
      { ok: false, accountId, error: "meta_sync_failed", detail: message },
      { status: 502 },
    );
  }
}
