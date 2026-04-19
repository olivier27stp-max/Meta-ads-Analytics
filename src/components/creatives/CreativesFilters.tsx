"use client";

import * as React from "react";
import { Search, SlidersHorizontal, Grid3x3, List, X } from "lucide-react";
import { BatchAnalyzeButton } from "./BatchAnalyzeButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/store";
import {
  ASSET_TYPES,
  MESSAGING_ANGLES,
  FUNNEL_STAGES,
  GROUP_BY_OPTIONS,
} from "@/lib/taxonomy";

const COLUMN_LABELS: { key: keyof ReturnType<typeof useStore.getState>["visibleColumns"]; label: string }[] = [
  { key: "preview", label: "Preview" },
  { key: "name", label: "Ad Name" },
  { key: "spend", label: "Spend" },
  { key: "type", label: "Type" },
  { key: "analysis", label: "Analysis" },
  { key: "assetType", label: "Asset Type" },
  { key: "visualFormat", label: "Visual Format" },
  { key: "hookTactic", label: "Hook Tactic" },
  { key: "roas", label: "ROAS" },
  { key: "hookRate", label: "Hook Rate" },
  { key: "ctr", label: "CTR" },
  { key: "lpv", label: "LPV" },
];

export function CreativesFilters() {
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const resetFilters = useStore((s) => s.resetFilters);
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const visibleColumns = useStore((s) => s.visibleColumns);
  const toggleColumn = useStore((s) => s.toggleColumn);

  const activeFilterCount =
    (filters.delivery !== "all" ? 1 : 0) +
    (filters.mediaType !== "all" ? 1 : 0) +
    (filters.aiStatus !== "all" ? 1 : 0) +
    (filters.assetType !== "all" ? 1 : 0) +
    (filters.angle !== "all" ? 1 : 0) +
    (filters.funnel !== "all" ? 1 : 0) +
    (filters.groupBy !== "none" ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-2.5 shadow-card">
        {/* Delivery */}
        <Select
          value={filters.delivery}
          onValueChange={(v) => setFilters({ delivery: v as typeof filters.delivery })}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ads</SelectItem>
            <SelectItem value="had_delivery">Had Delivery</SelectItem>
            <SelectItem value="active">Active Ads</SelectItem>
          </SelectContent>
        </Select>

        {/* Group by */}
        <Select
          value={filters.groupBy}
          onValueChange={(v) => setFilters({ groupBy: v as typeof filters.groupBy })}
        >
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            {GROUP_BY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.value === "none" ? "Group by: none" : `Group: ${o.label}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mx-1 hidden h-5 w-px bg-border md:block" />

        {/* Media type */}
        <Select
          value={filters.mediaType}
          onValueChange={(v) => setFilters({ mediaType: v as typeof filters.mediaType })}
        >
          <SelectTrigger className="h-9 w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="image">Image</SelectItem>
          </SelectContent>
        </Select>

        {/* AI status */}
        <Select
          value={filters.aiStatus}
          onValueChange={(v) => setFilters({ aiStatus: v as typeof filters.aiStatus })}
        >
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">AI: All</SelectItem>
            <SelectItem value="complete">AI: Complete</SelectItem>
            <SelectItem value="pending">AI: Pending</SelectItem>
            <SelectItem value="failed">AI: Failed</SelectItem>
          </SelectContent>
        </Select>

        {/* Asset type */}
        <Select
          value={filters.assetType}
          onValueChange={(v) => setFilters({ assetType: v as typeof filters.assetType })}
        >
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All asset types</SelectItem>
            {ASSET_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Angle */}
        <Select
          value={filters.angle}
          onValueChange={(v) => setFilters({ angle: v as typeof filters.angle })}
        >
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All angles</SelectItem>
            {MESSAGING_ANGLES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Funnel stage */}
        <Select
          value={filters.funnel}
          onValueChange={(v) => setFilters({ funnel: v as typeof filters.funnel })}
        >
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {FUNNEL_STAGES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X />
              Reset ({activeFilterCount})
            </Button>
          )}

          <BatchAnalyzeButton />

          {/* Columns */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="md">
                <SlidersHorizontal />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMN_LABELS.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleColumns[col.key]}
                  onCheckedChange={() => toggleColumn(col.key)}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search creatives"
              className="h-9 w-[220px] pl-8"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>

          {/* View toggle */}
          <div className="ml-1 inline-flex overflow-hidden rounded-lg border border-border bg-muted/60 p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${viewMode === "table" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${viewMode === "grid" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Grid3x3 className="h-3.5 w-3.5" /> Grid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
