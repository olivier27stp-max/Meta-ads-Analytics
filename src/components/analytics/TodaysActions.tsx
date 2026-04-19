"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Flame,
  RefreshCw,
  Sparkles,
  Trash2,
  Clock3,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { decideAction } from "@/lib/scoring";
import { cn, formatMoney } from "@/lib/utils";
import type { Creative, Decision, DecisionVerdict } from "@/types";

const VERDICT_META: Record<
  DecisionVerdict,
  { label: string; icon: React.ElementType; tone: "success" | "danger" | "warning" | "muted" | "info" }
> = {
  scale: { label: "Scale", icon: ArrowUpRight, tone: "success" },
  kill: { label: "Kill", icon: Trash2, tone: "danger" },
  refresh: { label: "Refresh", icon: RefreshCw, tone: "warning" },
  hold_for_data: { label: "Hold", icon: Clock3, tone: "muted" },
  monitor: { label: "Monitor", icon: Sparkles, tone: "info" },
};

const TONE_CLASSES: Record<string, { border: string; bg: string; text: string }> = {
  success: { border: "border-success/30", bg: "bg-success-soft/60", text: "text-success" },
  danger: { border: "border-danger/30", bg: "bg-danger-soft/60", text: "text-danger" },
  warning: { border: "border-warning/30", bg: "bg-warning-soft/60", text: "text-warning" },
  muted: { border: "border-border", bg: "bg-muted/40", text: "text-muted-foreground" },
  info: { border: "border-info/25", bg: "bg-info-soft/60", text: "text-info" },
};

function urgencyRank(d: Decision): number {
  if (d.urgency === "immediate") return 3;
  if (d.urgency === "soon") return 2;
  return 1;
}

function verdictRank(v: DecisionVerdict): number {
  switch (v) {
    case "kill":
      return 4;
    case "scale":
      return 3;
    case "refresh":
      return 2;
    case "monitor":
      return 1;
    case "hold_for_data":
      return 0;
  }
}

export function TodaysActions() {
  const creatives = useStore((s) => s.creatives);
  const settings = useStore((s) => s.settings);
  const global = useStore((s) => s.global);
  const openCreative = useStore((s) => s.openCreative);

  const decisions = React.useMemo(() => {
    const scoped =
      global.accountId === "all"
        ? creatives
        : creatives.filter((c) => c.accountId === global.accountId);
    return scoped
      .map((c) => ({ creative: c, decision: decideAction(c, settings) }))
      .filter(({ decision }) => decision.verdict === "kill" || decision.verdict === "scale" || decision.verdict === "refresh")
      .sort((a, b) => {
        const u = urgencyRank(b.decision) - urgencyRank(a.decision);
        if (u !== 0) return u;
        const v = verdictRank(b.decision.verdict) - verdictRank(a.decision.verdict);
        if (v !== 0) return v;
        return (b.decision.estimatedDailyLoss ?? 0) - (a.decision.estimatedDailyLoss ?? 0);
      })
      .slice(0, 6);
  }, [creatives, settings, global.accountId]);

  const killLoss = decisions
    .filter((d) => d.decision.verdict === "kill")
    .reduce((acc, d) => acc + (d.decision.estimatedDailyLoss ?? 0), 0);
  const scaleGain = decisions
    .filter((d) => d.decision.verdict === "scale")
    .reduce((acc, d) => acc + (d.decision.estimatedDailyGain ?? 0), 0);

  if (decisions.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-card">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success-soft text-success">
            <Flame className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-[14px] font-semibold">No urgent moves right now</h3>
            <p className="text-[12px] text-muted-foreground">
              Every scoped creative is either holding steady or doesn&apos;t yet have enough spend to conclude.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-2 border-b border-border px-5 py-3.5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/5">
            <Flame className="h-3.5 w-3.5" />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight">Today&apos;s priority actions</h3>
            <p className="text-[11.5px] text-muted-foreground">
              Stage-aware decisions. Ordered by urgency + estimated daily $ impact.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {killLoss > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger-soft px-2.5 py-1 text-danger">
              <AlertTriangle className="h-3 w-3" />
              ~{formatMoney(killLoss)}/day bleeding
            </span>
          )}
          {scaleGain > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-success">
              <ArrowUpRight className="h-3 w-3" />
              ~{formatMoney(scaleGain)}/day upside unlocked
            </span>
          )}
        </div>
      </div>
      <ul className="divide-y divide-border">
        {decisions.map(({ creative, decision }) => (
          <ActionRow
            key={creative.id}
            creative={creative}
            decision={decision}
            onOpen={() => openCreative(creative.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function ActionRow({
  creative,
  decision,
  onOpen,
}: {
  creative: Creative;
  decision: Decision;
  onOpen: () => void;
}) {
  const meta = VERDICT_META[decision.verdict];
  const tone = TONE_CLASSES[meta.tone]!;
  const Icon = meta.icon;
  return (
    <li
      className="group flex cursor-pointer flex-col gap-2 px-5 py-3.5 transition-colors hover:bg-muted/40 md:flex-row md:items-center md:gap-4"
      onClick={onOpen}
    >
      <div
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
          tone.border,
          tone.bg,
          tone.text,
        )}
      >
        <Icon className="h-3 w-3" />
        {meta.label}
        {decision.urgency === "immediate" && (
          <span className="ml-1 h-1 w-1 animate-pulse rounded-full bg-danger" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[13.5px] font-semibold">{creative.name}</span>
          <span className="shrink-0 text-[10.5px] uppercase tracking-wide text-muted-foreground">
            {creative.ai.funnelStage} · {creative.mediaType}
          </span>
        </div>
        <p className="mt-0.5 text-[12.5px] text-foreground">{decision.headline}</p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">{decision.action}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {decision.reasons.slice(0, 3).map((r, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-1.5 py-0.5 text-[10.5px]",
                r.tone === "positive" && "border-success/20 bg-success-soft/40 text-success",
                r.tone === "negative" && "border-danger/20 bg-danger-soft/40 text-danger",
              )}
            >
              <span className="text-muted-foreground">{r.signal}:</span>
              <span className="font-medium">{r.value}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-[11px] tabular text-muted-foreground md:flex-col md:items-end md:gap-0.5">
        {decision.estimatedDailyLoss && (
          <span className="font-semibold text-danger">
            −{formatMoney(decision.estimatedDailyLoss)}/day
          </span>
        )}
        {decision.estimatedDailyGain && (
          <span className="font-semibold text-success">
            +{formatMoney(decision.estimatedDailyGain)}/day
          </span>
        )}
        <span className="uppercase tracking-wide">
          {decision.confidence} confidence
        </span>
      </div>
    </li>
  );
}
