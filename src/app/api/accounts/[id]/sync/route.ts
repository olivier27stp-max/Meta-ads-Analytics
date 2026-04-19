import { NextResponse } from "next/server";
import { fetchAccountCreatives, hasMetaCredentials } from "@/lib/meta-sync";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const result = await fetchAccountCreatives(id);
    return NextResponse.json({
      ok: true,
      mode: hasMetaCredentials() ? "live" : "demo",
      result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Sync failed",
      },
      { status: 500 },
    );
  }
}
