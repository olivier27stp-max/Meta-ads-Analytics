"use client";

import * as React from "react";
import { Info, ArrowUpRight, Eye, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { buildKillScaleBoard } from "@/lib/analytics";
import { cn, formatMoney, formatPercent, formatRoas } from "@/lib/utils";
import { CreativePreview } from "@/components/shared/CreativePreview";
import { FUNNEL_LABEL } from "@/lib/taxonomy";
import type { Creative, FunnelStage, Recommendation } from "@/types";

export function KillScaleBoard() {
  const creatives = useStore((s) => s.creatives);
  const settings = useStore((s) => s.settings);
  const global = useStore((s) => s.global);
  const openCreative = useStore((s) => s.openCreative);
  const scoped =
    global.accountId === "all"
      ? creatives
      : creatives.filter((c) => c.accountId === global.accountId);

  const board = buildKillScaleBoard(scoped, settings);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-2 border-b border-border px-5 py-3.5 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-semibold">Kill / Scale Recommendations</h2>
          <p className="max-w-3xl text-xs text-muted-foreground">
            Scoring depends on the funnel stage. <span className="font-medium text-foreground">TOF</span> is judged more heavily by attention metrics (hook, hold, CTR).
            <span className="font-medium text-foreground"> MOF</span> leans on CTR + ROAS. <span className="font-medium text-foreground">BOF</span> is dominated by ROAS, purchases, and CPA efficiency.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          Thresholds are configurable in Settings.
        </div>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {board.map((group) => (
          <StageSection
            key={group.stage}
            stage={group.stage}
            scale={group.scale}
            watch={group.watch}
            kill={group.kill}
            onOpen={openCreative}
          />
        ))}
      </div>
    </div>
  );
}

function StageSection({
  stage,
  scale,
  watch,
  kill,
  onOpen,
}: {
  stage: FunnelStage;
  scale: Creative[];
  watch: Creative[];
  kill: Creative[];
  onOpen: (id: string) => void;
}) {
  return (
    <section className="px-5 py-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-6 items-center rounded-md bg-foreground/5 px-2 text-[11px] font-semibold tracking-wide">
            {stage}
          </div>
          <h3 className="text-sm font-semibold">{FUNNEL_LABEL[stage]}</h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular">
          <span>{scale.length} scale</span>
          <span>· {watch.length} watch</span>
          <span>· {kill.length} kill</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Column label="Scale" tone="scale" items={scale} onOpen={onOpen} />
        <Column label="Watch" tone="watch" items={watch} onOpen={onOpen} />
        <Column label="Kill" tone="kill" items={kill} onOpen={onOpen} />
      </div>
    </section>
  );
}

function Column({
  label,
  tone,
  items,
  onOpen,
}: {
  label: string;
  tone: Recommendation;
  items: Creative[];
  onOpen: (id: string) => void;
}) {
  const toneClasses =
    tone === "scale"
      ? "bg-success-soft/40 border-success/20"
      : tone === "watch"
        ? "bg-warning-soft/40 border-warning/20"
        : "bg-danger-soft/40 border-danger/20";
  const headerTone =
    tone === "scale"
      ? "text-success"
      : tone === "watch"
        ? "text-warning"
        : "text-danger";
  const Icon = tone === "scale" ? ArrowUpRight : tone === "watch" ? Eye : Trash2;

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border p-2.5", toneClasses)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", headerTone)} />
          <span className={cn("text-[11.5px] font-semibold uppercase tracking-wide", headerTone)}>
            {label}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground tabular">{items.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/70 bg-surface/70 px-3 py-6 text-center text-[11px] text-muted-foreground">
            Nothing here yet.
          </div>
        )}
        {items.slice(0, 6).map((c) => (
          <MiniCard key={c.id} creative={c} onOpen={() => onOpen(c.id)} />
        ))}
        {items.length > 6 && (
          <div className="text-center text-[11px] text-muted-foreground">
            + {items.length - 6} more
          </div>
        )}
      </div>
    </div>
  );
}

function MiniCard({ creative, onOpen }: { creative: Creative; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group flex items-start gap-2.5 rounded-lg border border-border bg-surface p-2.5 text-left transition-all hover:-translate-y-px hover:border-foreground/10 hover:shadow-card focus-ring"
    >
      <CreativePreview creative={creative} size="md" />
      <div className="flex-1 min-w-0">
        <div className="line-clamp-1 text-[12.5px] font-semibold text-foreground">
          {creative.name}
        </div>
        <div className="line-clamp-1 text-[10.5px] text-muted-foreground">
          {creative.ai.assetType} · {creative.ai.messagingAngle}
        </div>
        <div className="mt-1 grid grid-cols-3 gap-1 text-[10.5px]">
          <Stat label="Spend" value={formatMoney(creative.metrics.spend)} />
          <Stat label="ROAS" value={formatRoas(creative.metrics.roas)} />
          <Stat label="CTR" value={formatPercent(creative.metrics.ctr, 2)} />
        </div>
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-semibold tabular text-foreground">{value}</span>
    </div>
  );
}
