"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { groupCreatives } from "@/lib/analytics";
import { formatInt, formatMoney, formatPercent, formatRoas } from "@/lib/utils";
import type { GroupByKey } from "@/types";

const TABS: { value: Exclude<GroupByKey, "none" | "campaign">; label: string }[] = [
  { value: "assetType", label: "Asset Type" },
  { value: "messagingAngle", label: "Messaging Angle" },
  { value: "hookTactic", label: "Hook Tactic" },
  { value: "visualFormat", label: "Visual Format" },
  { value: "funnelStage", label: "Funnel Stage" },
  { value: "adType", label: "Ad Type" },
];

export function GroupedBreakdown() {
  const creatives = useStore((s) => s.creatives);
  const settings = useStore((s) => s.settings);
  const global = useStore((s) => s.global);

  const scoped =
    global.accountId === "all"
      ? creatives
      : creatives.filter((c) => c.accountId === global.accountId);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <h2 className="text-[15px] font-semibold">Performance by Creative Dimension</h2>
          <p className="text-xs text-muted-foreground">
            Identify which creative dimensions win most often across your portfolio.
          </p>
        </div>
      </div>
      <Tabs defaultValue="assetType" className="w-full">
        <div className="border-b border-border px-5 py-2.5">
          <TabsList className="w-full justify-start overflow-x-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {TABS.map((t) => {
          const rows = groupCreatives(scoped, t.value, settings);
          return (
            <TabsContent key={t.value} value={t.value} className="mt-0">
              <div className="overflow-x-auto">
                <table className="data-table w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-2.5 font-medium">{t.label}</th>
                      <th className="px-5 py-2.5 text-right font-medium">Ads</th>
                      <th className="px-5 py-2.5 text-right font-medium">Winners</th>
                      <th className="px-5 py-2.5 text-right font-medium">Win rate</th>
                      <th className="px-5 py-2.5 text-right font-medium">Avg spend</th>
                      <th className="px-5 py-2.5 text-right font-medium">Blended ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                          No data in this scope.
                        </td>
                      </tr>
                    )}
                    {rows.map((row, i) => (
                      <tr
                        key={row.key}
                        className={`transition-colors hover:bg-muted/40 ${i !== rows.length - 1 ? "border-b border-border/70" : ""}`}
                      >
                        <td className="px-5 py-3">
                          <span className="font-medium text-foreground">{row.key}</span>
                        </td>
                        <td className="px-5 py-3 text-right tabular text-muted-foreground">
                          {formatInt(row.ads)}
                        </td>
                        <td className="px-5 py-3 text-right tabular text-muted-foreground">
                          {formatInt(row.winners)}
                        </td>
                        <td className="px-5 py-3 text-right tabular">
                          <WinRateBar rate={row.winRate} />
                        </td>
                        <td className="px-5 py-3 text-right tabular text-muted-foreground">
                          {formatMoney(row.avgSpend)}
                        </td>
                        <td className="px-5 py-3 text-right tabular font-medium">
                          {formatRoas(row.blendedRoas)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function WinRateBar({ rate }: { rate: number }) {
  const pct = Math.min(1, Math.max(0, rate));
  return (
    <div className="inline-flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground/80"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className="min-w-[48px] text-right tabular font-medium">
        {formatPercent(rate, 1)}
      </span>
    </div>
  );
}
