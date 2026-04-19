"use client";

import { RefreshCw, RefreshCwOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { formatRelative } from "@/lib/utils";
import type { DateRange } from "@/types";

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_14_days", label: "Last 14 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "mtd", label: "Month to date" },
  { value: "qtd", label: "Quarter to date" },
  { value: "ytd", label: "Year to date" },
];

export function ControlBar() {
  const accounts = useStore((s) => s.accounts);
  const global = useStore((s) => s.global);
  const setGlobalAccount = useStore((s) => s.setGlobalAccount);
  const setGlobalDateRange = useStore((s) => s.setGlobalDateRange);
  const syncAccount = useStore((s) => s.syncAccount);
  const syncAll = useStore((s) => s.syncAll);
  const syncingAll = useStore((s) => s.syncingAll);
  const syncingAccountIds = useStore((s) => s.syncingAccountIds);

  const activeAccounts = accounts.filter((a) => a.isActive);
  const selectedAccount =
    global.accountId === "all" ? null : accounts.find((a) => a.id === global.accountId);

  const lastSynced = accounts
    .map((a) => a.lastSyncedAt)
    .filter((x): x is string => Boolean(x))
    .sort()
    .pop();

  const isSyncingSelected = selectedAccount
    ? syncingAccountIds.includes(selectedAccount.id)
    : false;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-card md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={global.accountId}
          onValueChange={(v) => setGlobalAccount(v as "all" | string)}
        >
          <SelectTrigger className="h-9 min-w-[220px] text-sm">
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts ({activeAccounts.length})</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={global.dateRange}
          onValueChange={(v) => setGlobalDateRange(v as DateRange)}
        >
          <SelectTrigger className="h-9 min-w-[180px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="hidden items-center gap-2 pl-1 text-xs text-muted-foreground md:flex">
          <span className="h-1 w-1 rounded-full bg-border" />
          <span className="tabular">
            Last synced {formatRelative(lastSynced)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="md"
          disabled={!selectedAccount || isSyncingSelected}
          onClick={() => selectedAccount && syncAccount(selectedAccount.id)}
        >
          {isSyncingSelected ? (
            <RefreshCw className="animate-spin" />
          ) : (
            <RefreshCwOff />
          )}
          Sync Selected
        </Button>
        <Button
          variant="primary"
          size="md"
          disabled={syncingAll || activeAccounts.length === 0}
          onClick={() => syncAll()}
        >
          <RefreshCw className={syncingAll ? "animate-spin" : ""} />
          Sync All Active
        </Button>
      </div>
    </div>
  );
}
