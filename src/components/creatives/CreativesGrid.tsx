"use client";

import { useFilteredCreatives, useStore } from "@/lib/store";
import { formatMoney, formatPercent, formatRoas } from "@/lib/utils";
import { CreativePreview } from "@/components/shared/CreativePreview";
import { AnalysisStatusBadge, FunnelBadge } from "@/components/shared/StatusBadges";
import { Badge } from "@/components/ui/badge";

export function CreativesGrid() {
  const creatives = useFilteredCreatives();
  const openCreative = useStore((s) => s.openCreative);

  if (creatives.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
        <h3 className="text-sm font-semibold">No creatives match these filters</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try relaxing the delivery filter or switching account scope.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {creatives.map((c) => (
        <button
          key={c.id}
          onClick={() => openCreative(c.id)}
          className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-pop focus-ring"
        >
          <div className="relative aspect-[9/16]">
            <CreativePreview creative={c} size="lg" />
            <div className="absolute left-2 top-2 flex gap-1">
              <FunnelBadge stage={c.ai.funnelStage} />
            </div>
            <div className="absolute right-2 top-2">
              <AnalysisStatusBadge status={c.ai.status} />
            </div>
          </div>
          <div className="flex flex-col gap-2 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="line-clamp-1 text-[13px] font-semibold text-foreground">
                  {c.name}
                </span>
                <span className="line-clamp-1 text-[11px] text-muted-foreground">
                  {c.campaignName}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge tone="muted" size="sm">
                {c.ai.assetType}
              </Badge>
              <Badge tone="muted" size="sm">
                {c.ai.messagingAngle}
              </Badge>
            </div>
            <div className="mt-1 grid grid-cols-3 gap-2 border-t border-border/70 pt-2.5 text-[11px]">
              <Metric label="Spend" value={formatMoney(c.metrics.spend)} />
              <Metric label="ROAS" value={formatRoas(c.metrics.roas)} />
              <Metric label="CTR" value={formatPercent(c.metrics.ctr, 2)} />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-semibold tabular text-foreground">{value}</span>
    </div>
  );
}
