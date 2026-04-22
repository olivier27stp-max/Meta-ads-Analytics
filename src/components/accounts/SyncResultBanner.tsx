"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, XCircle, X, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatRelative } from "@/lib/utils";
import type { SyncSummary } from "@/types";

export function SyncResultBanner() {
  const summaries = useStore((s) => s.lastSyncSummaries);
  const accounts = useStore((s) => s.accounts);
  const dismiss = useStore((s) => s.dismissSyncSummary);
  const entries = Object.values(summaries);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {entries.map((summary) => {
        const account = accounts.find((a) => a.id === summary.accountId);
        return (
          <SyncRow
            key={summary.accountId}
            summary={summary}
            accountName={account?.name ?? summary.metaAccountId}
            onDismiss={() => dismiss(summary.accountId)}
          />
        );
      })}
    </div>
  );
}

function SyncRow({
  summary,
  accountName,
  onDismiss,
}: {
  summary: SyncSummary;
  accountName: string;
  onDismiss: () => void;
}) {
  const tone =
    summary.mode === "live"
      ? summary.added > 0
        ? "success"
        : "info"
      : summary.mode === "demo"
        ? "warning"
        : "danger";

  const cls: Record<string, { bg: string; border: string; text: string; icon: React.ElementType }> = {
    success: {
      bg: "bg-success-soft",
      border: "border-success/30",
      text: "text-success",
      icon: CheckCircle2,
    },
    info: {
      bg: "bg-info-soft",
      border: "border-info/25",
      text: "text-info",
      icon: RefreshCw,
    },
    warning: {
      bg: "bg-warning-soft",
      border: "border-warning/30",
      text: "text-warning",
      icon: AlertTriangle,
    },
    danger: {
      bg: "bg-danger-soft",
      border: "border-danger/30",
      text: "text-danger",
      icon: XCircle,
    },
  };
  const { bg, border, text, icon: Icon } = cls[tone]!;

  const headline =
    summary.mode === "live"
      ? summary.added > 0
        ? `${summary.added} new creative${summary.added === 1 ? "" : "s"} imported · ${summary.updated} updated`
        : summary.updated > 0
          ? `${summary.updated} creatives refreshed · no new ads`
          : `No changes — ${summary.total} ads all current`
      : summary.mode === "demo"
        ? "Demo mode — no Meta token configured"
        : "Sync failed";

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl border ${border} ${bg} px-3.5 py-2.5`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${text}`} />
        <div className="flex flex-col gap-0.5">
          <div className={`text-[13px] font-semibold ${text}`}>
            {accountName} · {headline}
          </div>
          <div className="text-[11.5px] opacity-85 text-foreground">
            {summary.message}
          </div>
          <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
            {formatRelative(summary.syncedAt)}
          </div>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
