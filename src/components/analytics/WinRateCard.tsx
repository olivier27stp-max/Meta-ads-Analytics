"use client";

import { TrendingUp, Award, Target, Flame } from "lucide-react";
import { useStore } from "@/lib/store";
import { winRateSummary } from "@/lib/analytics";
import { formatInt, formatMoney, formatPercent, formatRoas } from "@/lib/utils";

export function WinRateCard() {
  const creatives = useStore((s) => s.creatives);
  const settings = useStore((s) => s.settings);
  const global = useStore((s) => s.global);
  const scoped =
    global.accountId === "all"
      ? creatives
      : creatives.filter((c) => c.accountId === global.accountId);

  const s = winRateSummary(scoped, settings);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <h2 className="text-[15px] font-semibold">Win Rate Analysis</h2>
          <p className="text-xs text-muted-foreground">
            Evaluated against stage-aware thresholds defined in Settings.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0">
        <Tile
          label="Total Analyzed"
          value={formatInt(s.ads)}
          hint={`${formatInt(scoped.filter((c) => c.ai.status === "complete").length)} complete`}
          icon={<Target className="h-3.5 w-3.5" />}
        />
        <Tile
          label="Winners"
          value={formatInt(s.winners)}
          hint={`${formatMoney(s.totalSpend)} spend`}
          icon={<Award className="h-3.5 w-3.5" />}
        />
        <Tile
          label="Win Rate"
          value={formatPercent(s.winRate, 1)}
          hint={`${s.winners}/${s.ads} creatives`}
          icon={<Flame className="h-3.5 w-3.5" />}
          highlight
        />
        <Tile
          label="Blended ROAS"
          value={formatRoas(s.blendedRoas)}
          hint={`${formatMoney(s.totalRevenue)} revenue`}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          highlight
        />
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between gap-1.5 px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className={highlight ? "text-[26px] font-semibold tracking-tight tabular" : "text-[22px] font-semibold tracking-tight tabular"}>
        {value}
      </div>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}
