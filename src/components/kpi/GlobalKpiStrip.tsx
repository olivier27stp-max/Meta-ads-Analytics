"use client";

import { BarChart3, FileText, LayoutGrid, Sparkles, Users2, DollarSign } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatInt, formatMoney, formatCompact } from "@/lib/utils";
import { KpiCard, KpiStrip } from "./KpiCard";

export function GlobalKpiStrip() {
  const accounts = useStore((s) => s.accounts);
  const creatives = useStore((s) => s.creatives);
  const reports = useStore((s) => s.reports);
  const global = useStore((s) => s.global);

  const scopedCreatives =
    global.accountId === "all"
      ? creatives
      : creatives.filter((c) => c.accountId === global.accountId);

  const analyzed = scopedCreatives.filter((c) => c.ai.status === "complete").length;
  const totalSpend = scopedCreatives.reduce((acc, c) => acc + c.metrics.spend, 0);

  return (
    <KpiStrip>
      <KpiCard
        label="Accounts"
        value={formatInt(accounts.length)}
        hint={`${accounts.filter((a) => a.isActive).length} active`}
        icon={<Users2 className="h-3.5 w-3.5" />}
      />
      <KpiCard
        label="Creatives"
        value={formatInt(scopedCreatives.length)}
        hint={`${formatInt(scopedCreatives.filter((c) => c.mediaType === "video").length)} video · ${formatInt(scopedCreatives.filter((c) => c.mediaType === "image").length)} image`}
        icon={<LayoutGrid className="h-3.5 w-3.5" />}
      />
      <KpiCard
        label="Analyzed"
        value={formatInt(analyzed)}
        hint={`${scopedCreatives.length > 0 ? Math.round((analyzed / scopedCreatives.length) * 100) : 0}% coverage`}
        icon={<Sparkles className="h-3.5 w-3.5" />}
      />
      <KpiCard
        label="Reports"
        value={formatInt(reports.length)}
        hint={`${reports.filter((r) => r.status === "ready").length} ready`}
        icon={<FileText className="h-3.5 w-3.5" />}
      />
      <KpiCard
        label="Total Spend"
        value={
          <span className="flex items-baseline gap-1">
            {totalSpend >= 1_000_000 ? formatCompact(totalSpend) : formatMoney(totalSpend)}
          </span>
        }
        hint={`${global.dateRange.replace(/_/g, " ")}`}
        icon={<DollarSign className="h-3.5 w-3.5" />}
      />
    </KpiStrip>
  );
}
