import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { fetchAccountCreatives, hasMetaCredentials } from "@/lib/meta-sync";
import { mergeSyncedCreatives } from "@/lib/sync-merge";
import type { Account, Creative } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — many accounts x pagination

/**
 * Scheduled sync endpoint. Iterates every workspace with at least one active
 * Meta account and runs a full Meta → local merge per account.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` header, OR `?token=<CRON_SECRET>`
 * query param. The secret is configured via the `CRON_SECRET` env var.
 *
 * Hit with any scheduler: Supabase pg_cron, Vercel Cron, GitHub Actions,
 * or plain curl from your Mac. Idempotent — ad_id dedup prevents duplicates
 * even if two schedulers fire concurrently.
 *
 * Rate limiting: runs accounts sequentially within a workspace and
 * workspaces sequentially to stay under Meta's 200 calls/user/hour cap.
 */
export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "cron_not_configured", message: "Set CRON_SECRET in env" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token") ?? "";
  if (auth !== `Bearer ${secret}` && queryToken !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!hasMetaCredentials()) {
    return NextResponse.json({
      ok: true,
      mode: "demo",
      message:
        "META_ACCESS_TOKEN not set — cron endpoint is reachable but no real sync was performed",
      workspacesProcessed: 0,
    });
  }

  const admin = getAdminSupabase();
  const { data: workspaces, error: wsErr } = await admin
    .from("workspaces")
    .select("id, state_json");

  if (wsErr || !workspaces) {
    return NextResponse.json(
      { ok: false, error: "workspaces_fetch_failed", detail: wsErr?.message },
      { status: 500 },
    );
  }

  const summary: Array<{
    workspaceId: string;
    accounts: Array<{
      accountId: string;
      added?: number;
      updated?: number;
      unchanged?: number;
      error?: string;
    }>;
  }> = [];

  for (const ws of workspaces) {
    const fullState = (ws.state_json as Record<string, unknown> | null) ?? {};
    // Zustand persist wraps actual state under `.state`; support either shape.
    const inner =
      fullState && typeof fullState === "object" && "state" in fullState
        ? ((fullState as { state: Record<string, unknown> }).state ?? {})
        : fullState;
    const accounts = ((inner as { accounts?: Account[] }).accounts ?? []).map((a) => ({ ...a }));
    let creatives = ((inner as { creatives?: Creative[] }).creatives ?? []).slice();
    if (accounts.length === 0) continue;

    const perAccount: Array<{
      accountId: string;
      added?: number;
      updated?: number;
      unchanged?: number;
      error?: string;
    }> = [];

    let anySuccess = false;

    for (const account of accounts) {
      if (!account.isActive || !account.metaAccountId) continue;
      if (!/^act_/.test(account.metaAccountId)) continue; // skip demo-seed accounts unless real
      try {
        const result = await fetchAccountCreatives(account.metaAccountId);
        const merge = mergeSyncedCreatives({
          existing: creatives,
          incoming: result.creatives,
          accountId: account.id,
          metaAccountId: account.metaAccountId,
          syncedAtIso: result.syncedAt,
        });
        creatives = merge.creatives;
        const idx = accounts.findIndex((a) => a.id === account.id);
        if (idx >= 0) {
          accounts[idx] = {
            ...accounts[idx]!,
            lastSyncedAt: result.syncedAt,
            updatedAt: result.syncedAt,
          };
        }
        perAccount.push({
          accountId: account.id,
          added: merge.added,
          updated: merge.updated,
          unchanged: merge.unchanged,
        });
        anySuccess = true;
      } catch (err) {
        perAccount.push({
          accountId: account.id,
          error: err instanceof Error ? err.message : "sync_failed",
        });
      }
    }

    if (anySuccess) {
      const nextInner = { ...(inner as object), accounts, creatives };
      const nextStateJson =
        fullState && typeof fullState === "object" && "state" in fullState
          ? { ...(fullState as object), state: nextInner }
          : nextInner;
      await admin
        .from("workspaces")
        .update({ state_json: nextStateJson as object })
        .eq("id", ws.id);
    }

    summary.push({ workspaceId: ws.id, accounts: perAccount });
  }

  return NextResponse.json({
    ok: true,
    workspacesProcessed: summary.length,
    summary,
  });
}
