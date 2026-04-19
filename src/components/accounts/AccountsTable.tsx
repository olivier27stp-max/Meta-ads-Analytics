"use client";

import * as React from "react";
import { RefreshCw, Trash2, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { formatRelative } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { AccountStatusBadge } from "@/components/shared/StatusBadges";
import { AddAccountDialog } from "./AddAccountDialog";

export function AccountsTable() {
  const accounts = useStore((s) => s.accounts);
  const creatives = useStore((s) => s.creatives);
  const syncAccount = useStore((s) => s.syncAccount);
  const removeAccount = useStore((s) => s.removeAccount);
  const syncingAccountIds = useStore((s) => s.syncingAccountIds);
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);

  const countFor = (accountId: string) =>
    creatives.filter((c) => c.accountId === accountId).length;

  if (accounts.length === 0) {
    return (
      <EmptyState
        title="No accounts connected"
        description="Connect a Meta ad account to begin syncing creatives and performance data."
        action={<AddAccountDialog />}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <h2 className="text-[15px] font-semibold">Ad Accounts</h2>
          <p className="text-xs text-muted-foreground">
            {accounts.length} connected · {accounts.filter((a) => a.isActive).length} active
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-2.5 font-medium">Account</th>
              <th className="px-5 py-2.5 font-medium">Account ID</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5 font-medium">Last synced</th>
              <th className="px-5 py-2.5 text-right font-medium">Creatives</th>
              <th className="px-5 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a, i) => {
              const syncing = syncingAccountIds.includes(a.id);
              return (
                <tr
                  key={a.id}
                  className={`group transition-colors hover:bg-muted/40 ${i !== accounts.length - 1 ? "border-b border-border" : ""}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">{a.name}</span>
                      {a.accessTokenMask && (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {a.accessTokenMask}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      {a.metaAccountId}
                      <button
                        type="button"
                        className="rounded p-0.5 text-muted-foreground/60 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                        onClick={() => navigator.clipboard?.writeText(a.metaAccountId)}
                        aria-label="Copy account ID"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <AccountStatusBadge active={a.isActive} />
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground tabular">
                    {formatRelative(a.lastSyncedAt)}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular">
                    <Badge tone="muted" size="md">
                      {countFor(a.id)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => syncAccount(a.id)}
                        disabled={syncing || !a.isActive}
                      >
                        <RefreshCw className={syncing ? "animate-spin" : ""} />
                        {syncing ? "Syncing…" : "Sync"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                      >
                        <a
                          href={`https://adsmanager.facebook.com/adsmanager/manage/accounts?act=${a.metaAccountId.replace("act_", "")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink />
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDelete(a.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-[2px]"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">Disconnect this account?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              All creatives and reports tied to this account will be removed from the workspace. The Meta account itself is untouched.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  removeAccount(confirmDelete);
                  setConfirmDelete(null);
                }}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
