"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useStore, useFilteredCreatives } from "@/lib/store";
import { cn, formatMoney, formatPercent, formatRoas, formatInt } from "@/lib/utils";
import { AnalysisStatusBadge } from "@/components/shared/StatusBadges";
import { Badge } from "@/components/ui/badge";
import { CreativePreview } from "@/components/shared/CreativePreview";
import type { Creative, GroupByKey } from "@/types";

type SortKey = "spend" | "roas" | "hookRate" | "ctr" | "lpv" | "name";

const GROUP_ACCESSOR: Record<Exclude<GroupByKey, "none">, (c: Creative) => string> = {
  assetType: (c) => c.ai.assetType,
  messagingAngle: (c) => c.ai.messagingAngle,
  hookTactic: (c) => c.ai.hookTactic,
  visualFormat: (c) => c.ai.visualFormat,
  funnelStage: (c) => c.ai.funnelStage,
  campaign: (c) => c.campaignName,
  adType: (c) => (c.mediaType === "video" ? "Video" : "Image"),
};

function groupCreatives(creatives: Creative[], key: GroupByKey) {
  if (key === "none") return null;
  const accessor = GROUP_ACCESSOR[key];
  const groups = new Map<string, Creative[]>();
  for (const c of creatives) {
    const k = accessor(c);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(c);
  }
  return groups;
}

export function CreativesTable() {
  const creatives = useFilteredCreatives();
  const visibleColumns = useStore((s) => s.visibleColumns);
  const filters = useStore((s) => s.filters);
  const openCreative = useStore((s) => s.openCreative);
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "spend",
    dir: "desc",
  });

  const getVal = (c: Creative, key: SortKey): number | string => {
    switch (key) {
      case "spend":
        return c.metrics.spend;
      case "roas":
        return c.metrics.roas;
      case "hookRate":
        return c.metrics.hookRate;
      case "ctr":
        return c.metrics.ctr;
      case "lpv":
        return c.metrics.landingPageViews;
      case "name":
        return c.name;
    }
  };

  const sorted = React.useMemo(() => {
    const arr = [...creatives];
    arr.sort((a, b) => {
      const va = getVal(a, sort.key);
      const vb = getVal(b, sort.key);
      if (typeof va === "string" && typeof vb === "string") {
        return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sort.dir === "asc"
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number);
    });
    return arr;
  }, [creatives, sort]);

  const grouped = groupCreatives(sorted, filters.groupBy);

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );
  };

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
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[15px] font-semibold">Creatives</h2>
          <span className="text-xs text-muted-foreground tabular">
            {formatInt(sorted.length)} creative{sorted.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {visibleColumns.preview && <th className="w-[52px] px-3 py-2.5"></th>}
              {visibleColumns.name && (
                <Th onClick={() => toggleSort("name")} dir={sort.key === "name" ? sort.dir : null}>
                  Ad Name
                </Th>
              )}
              {visibleColumns.spend && (
                <Th
                  align="right"
                  onClick={() => toggleSort("spend")}
                  dir={sort.key === "spend" ? sort.dir : null}
                >
                  Spend
                </Th>
              )}
              {visibleColumns.type && <Th>Type</Th>}
              {visibleColumns.analysis && <Th>Analysis</Th>}
              {visibleColumns.assetType && <Th>Asset Type</Th>}
              {visibleColumns.visualFormat && <Th>Visual Format</Th>}
              {visibleColumns.hookTactic && <Th>Hook Tactic</Th>}
              {visibleColumns.roas && (
                <Th
                  align="right"
                  onClick={() => toggleSort("roas")}
                  dir={sort.key === "roas" ? sort.dir : null}
                >
                  ROAS
                </Th>
              )}
              {visibleColumns.hookRate && (
                <Th
                  align="right"
                  onClick={() => toggleSort("hookRate")}
                  dir={sort.key === "hookRate" ? sort.dir : null}
                >
                  Hook Rate
                </Th>
              )}
              {visibleColumns.ctr && (
                <Th
                  align="right"
                  onClick={() => toggleSort("ctr")}
                  dir={sort.key === "ctr" ? sort.dir : null}
                >
                  CTR
                </Th>
              )}
              {visibleColumns.lpv && (
                <Th
                  align="right"
                  onClick={() => toggleSort("lpv")}
                  dir={sort.key === "lpv" ? sort.dir : null}
                >
                  LPV
                </Th>
              )}
            </tr>
          </thead>
          <tbody>
            {grouped ? (
              Array.from(grouped.entries()).map(([groupKey, items]) => (
                <React.Fragment key={groupKey}>
                  <tr className="bg-muted/40">
                    <td
                      colSpan={Object.values(visibleColumns).filter(Boolean).length}
                      className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {groupKey}{" "}
                      <span className="font-normal">· {items.length}</span>
                    </td>
                  </tr>
                  {items.map((c) => (
                    <CreativeRow
                      key={c.id}
                      creative={c}
                      visibleColumns={visibleColumns}
                      onOpen={() => openCreative(c.id)}
                    />
                  ))}
                </React.Fragment>
              ))
            ) : (
              sorted.map((c) => (
                <CreativeRow
                  key={c.id}
                  creative={c}
                  visibleColumns={visibleColumns}
                  onOpen={() => openCreative(c.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  dir,
  align = "left",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  dir?: "asc" | "desc" | null;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 font-medium",
        align === "right" ? "text-right" : "text-left",
        onClick && "cursor-pointer select-none",
      )}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-0.5">
        {children}
        {dir === "asc" && <ChevronUp className="h-3 w-3" />}
        {dir === "desc" && <ChevronDown className="h-3 w-3" />}
      </span>
    </th>
  );
}

function CreativeRow({
  creative,
  visibleColumns,
  onOpen,
}: {
  creative: Creative;
  visibleColumns: ReturnType<typeof useStore.getState>["visibleColumns"];
  onOpen: () => void;
}) {
  return (
    <tr
      onClick={onOpen}
      className="group cursor-pointer border-t border-border/70 text-sm transition-colors hover:bg-muted/40"
    >
      {visibleColumns.preview && (
        <td className="px-3 py-2.5">
          <CreativePreview creative={creative} size="sm" />
        </td>
      )}
      {visibleColumns.name && (
        <td className="max-w-[280px] px-3 py-2.5">
          <div className="flex flex-col">
            <span className="truncate font-medium text-foreground">{creative.name}</span>
            <span className="truncate text-[11px] text-muted-foreground">
              {creative.campaignName}
            </span>
          </div>
        </td>
      )}
      {visibleColumns.spend && (
        <td className="px-3 py-2.5 text-right tabular">
          {formatMoney(creative.metrics.spend)}
        </td>
      )}
      {visibleColumns.type && (
        <td className="px-3 py-2.5">
          <Badge tone="muted">
            {creative.mediaType === "video" ? "Video" : "Image"}
          </Badge>
        </td>
      )}
      {visibleColumns.analysis && (
        <td className="px-3 py-2.5">
          <AnalysisStatusBadge status={creative.ai.status} />
        </td>
      )}
      {visibleColumns.assetType && (
        <td className="px-3 py-2.5 text-muted-foreground">{creative.ai.assetType}</td>
      )}
      {visibleColumns.visualFormat && (
        <td className="px-3 py-2.5 text-muted-foreground">
          {creative.ai.visualFormat}
        </td>
      )}
      {visibleColumns.hookTactic && (
        <td className="px-3 py-2.5">
          <Badge tone="neutral">{creative.ai.hookTactic}</Badge>
        </td>
      )}
      {visibleColumns.roas && (
        <td className="px-3 py-2.5 text-right tabular font-medium">
          {formatRoas(creative.metrics.roas)}
        </td>
      )}
      {visibleColumns.hookRate && (
        <td className="px-3 py-2.5 text-right tabular text-muted-foreground">
          {formatPercent(creative.metrics.hookRate, 1)}
        </td>
      )}
      {visibleColumns.ctr && (
        <td className="px-3 py-2.5 text-right tabular text-muted-foreground">
          {formatPercent(creative.metrics.ctr, 2)}
        </td>
      )}
      {visibleColumns.lpv && (
        <td className="px-3 py-2.5 text-right tabular text-muted-foreground">
          {formatInt(creative.metrics.landingPageViews)}
        </td>
      )}
    </tr>
  );
}

