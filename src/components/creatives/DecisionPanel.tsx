"use client";

import * as React from "react";
import {
  ArrowUpRight,
  Trash2,
  RefreshCw,
  Clock3,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { decideAction } from "@/lib/scoring";
import { useStore } from "@/lib/store";
import { cn, formatMoney } from "@/lib/utils";
import type { Creative, Decision, DecisionVerdict } from "@/types";

const VERDICT_META: Record<
  DecisionVerdict,
  {
    label: string;
    icon: React.ElementType;
    tone: "success" | "danger" | "warning" | "muted" | "info";
  }
> = {
  scale: { label: "SCALE", icon: ArrowUpRight, tone: "success" },
  kill: { label: "KILL", icon: Trash2, tone: "danger" },
  refresh: { label: "REFRESH", icon: RefreshCw, tone: "warning" },
  hold_for_data: { label: "HOLD FOR DATA", icon: Clock3, tone: "muted" },
  monitor: { label: "MONITOR", icon: Sparkles, tone: "info" },
};

const TONE_STYLES: Record<string, string> = {
  success: "border-success/30 bg-success-soft text-success",
  danger: "border-danger/30 bg-danger-soft text-danger",
  warning: "border-warning/30 bg-warning-soft text-warning",
  muted: "border-border bg-muted/40 text-muted-foreground",
  info: "border-info/25 bg-info-soft text-info",
};

export function DecisionPanel({ creative }: { creative: Creative }) {
  const settings = useStore((s) => s.settings);
  const decision: Decision = React.useMemo(
    () => decideAction(creative, settings),
    [creative, settings],
  );
  const meta = VERDICT_META[decision.verdict];
  const Icon = meta.icon;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border",
        TONE_STYLES[meta.tone]!.split(" ")[0],
        "bg-surface",
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-3 border-b px-4 py-2.5",
          TONE_STYLES[meta.tone]!.split(" ")[0],
        )}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full border",
              TONE_STYLES[meta.tone],
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="flex flex-col">
            <span
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wide",
                TONE_STYLES[meta.tone]!.split(" ").slice(-1)[0],
              )}
            >
              Verdict · {meta.label}
              {decision.urgency === "immediate" && (
                <span className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger-soft px-1.5 py-0.5 text-[9.5px] font-bold text-danger">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  URGENT
                </span>
              )}
            </span>
            <span className="text-[13px] font-semibold text-foreground">
              {decision.headline}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right text-[10.5px] uppercase tracking-wide text-muted-foreground">
          <span>{decision.confidence} confidence</span>
          <span className="font-mono tabular">score {Math.round(decision.score)}/100</span>
        </div>
      </header>

      <div className="flex flex-col gap-3 p-4">
        <p className="text-[13px] leading-relaxed text-foreground">{decision.action}</p>

        {(decision.estimatedDailyLoss || decision.estimatedDailyGain) && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px]">
            {decision.estimatedDailyLoss ? (
              <>
                <span className="text-muted-foreground">Est. daily drag</span>
                <span className="font-semibold text-danger tabular">
                  −{formatMoney(decision.estimatedDailyLoss)}/day
                </span>
              </>
            ) : null}
            {decision.estimatedDailyGain ? (
              <>
                <span className="text-muted-foreground">Est. daily upside</span>
                <span className="font-semibold text-success tabular">
                  +{formatMoney(decision.estimatedDailyGain)}/day
                </span>
              </>
            ) : null}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Why
          </span>
          <div className="flex flex-wrap gap-1.5">
            {decision.reasons.map((r, i) => (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]",
                  r.tone === "positive"
                    ? "border-success/25 bg-success-soft/60 text-success"
                    : r.tone === "negative"
                      ? "border-danger/25 bg-danger-soft/60 text-danger"
                      : "border-border bg-muted/40 text-foreground",
                )}
              >
                <span className="text-muted-foreground">{r.signal}:</span>
                <span className="font-medium">{r.value}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
