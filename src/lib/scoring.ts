import type {
  Creative,
  Decision,
  DecisionConfidence,
  DecisionReason,
  DecisionUrgency,
  DecisionVerdict,
  FunnelStage,
  Recommendation,
  Settings,
  WinningThresholds,
} from "@/types";

export function isWinner(creative: Creative, thresholds: WinningThresholds): boolean {
  const { metrics, ai } = creative;
  const stage: FunnelStage = ai.funnelStage;
  switch (stage) {
    case "TOF": {
      const t = thresholds.tof;
      return (
        metrics.spend >= t.minSpend &&
        metrics.hookRate >= t.minHookRate &&
        metrics.holdRate >= t.minHoldRate &&
        metrics.ctr >= t.minCtr
      );
    }
    case "MOF": {
      const t = thresholds.mof;
      return metrics.spend >= t.minSpend && metrics.ctr >= t.minCtr && metrics.roas >= t.minRoas;
    }
    case "BOF": {
      const t = thresholds.bof;
      const cpaOk = metrics.cpa > 0 ? metrics.cpa <= t.maxCpa : metrics.purchases >= t.minPurchases;
      return (
        metrics.spend >= t.minSpend &&
        metrics.roas >= t.minRoas &&
        metrics.purchases >= t.minPurchases &&
        cpaOk
      );
    }
    default:
      return false;
  }
}

/**
 * Stage-aware score from 0-100. Used to rank creatives and to bucket them
 * into Scale / Watch / Kill.
 */
export function scoreCreative(creative: Creative, thresholds: WinningThresholds): number {
  const { metrics, ai } = creative;
  const stage = ai.funnelStage;
  const norm = (x: number, target: number) => Math.max(0, Math.min(1, x / (target || 1)));

  if (stage === "TOF") {
    const t = thresholds.tof;
    const parts = [
      norm(metrics.hookRate, t.minHookRate * 1.5),
      norm(metrics.holdRate, t.minHoldRate * 1.5),
      norm(metrics.ctr, t.minCtr * 1.5),
      norm(metrics.spend, t.minSpend),
    ];
    const weights = [0.35, 0.3, 0.2, 0.15];
    return (
      100 *
      parts.reduce((acc, part, idx) => acc + part * (weights[idx] ?? 0), 0)
    );
  }

  if (stage === "MOF") {
    const t = thresholds.mof;
    const parts = [
      norm(metrics.ctr, t.minCtr * 1.5),
      norm(metrics.roas, t.minRoas * 1.5),
      norm(metrics.landingPageViews / Math.max(1, metrics.clicks), 0.7),
      norm(metrics.spend, t.minSpend),
    ];
    const weights = [0.3, 0.4, 0.2, 0.1];
    return (
      100 *
      parts.reduce((acc, part, idx) => acc + part * (weights[idx] ?? 0), 0)
    );
  }

  // BOF
  const t = thresholds.bof;
  const cpaScore = metrics.cpa > 0 ? Math.max(0, Math.min(1, t.maxCpa / metrics.cpa)) : 0;
  const parts = [
    norm(metrics.roas, t.minRoas * 1.6),
    norm(metrics.purchases, t.minPurchases * 3),
    cpaScore,
    norm(metrics.spend, t.minSpend),
  ];
  const weights = [0.4, 0.25, 0.25, 0.1];
  return (
    100 *
    parts.reduce((acc, part, idx) => acc + part * (weights[idx] ?? 0), 0)
  );
}

export function classify(creative: Creative, settings: Settings): Recommendation {
  const score = scoreCreative(creative, settings.winningThresholds);
  const winner = isWinner(creative, settings.winningThresholds);
  if (winner && score >= 70) return "scale";
  if (!winner && score < 32) return "kill";
  if (creative.metrics.spend < settings.minSpendForAi) return "watch";
  return score >= 55 ? "scale" : score < 38 ? "kill" : "watch";
}

/**
 * Rich per-creative decision — what the buyer should do, why, with what
 * confidence and urgency. Built on the same score as `classify` but adds
 * the reasoning and prescription the UI surfaces.
 */
export function decideAction(creative: Creative, settings: Settings): Decision {
  const score = scoreCreative(creative, settings.winningThresholds);
  const winner = isWinner(creative, settings.winningThresholds);
  const { metrics, ai } = creative;
  const stage = ai.funnelStage;
  const t = settings.winningThresholds;
  const reasons: DecisionReason[] = [];

  // Confidence: how much we can trust the signal.
  const minSpend =
    stage === "TOF" ? t.tof.minSpend : stage === "MOF" ? t.mof.minSpend : t.bof.minSpend;
  const confidence: DecisionConfidence =
    metrics.spend < minSpend * 0.6
      ? "low"
      : metrics.spend < minSpend * 2
        ? "medium"
        : "high";

  // ---------------------------------------------------------------------
  // Hold-for-data: not enough spend to trust any verdict yet.
  // ---------------------------------------------------------------------
  if (metrics.spend < minSpend * 0.6) {
    const needed = Math.max(0, minSpend - metrics.spend);
    reasons.push({
      signal: "Spend below signal threshold",
      value: `${fmtMoney(metrics.spend)} / ${fmtMoney(minSpend)} ${stage} floor`,
      tone: "neutral",
    });
    if (winner) {
      reasons.push({
        signal: "Early indicators positive",
        value: `${stage === "BOF" ? `ROAS ${metrics.roas.toFixed(2)}×` : `hook ${fmtPct(metrics.hookRate)}`}`,
        tone: "positive",
      });
    }
    return {
      verdict: "hold_for_data",
      confidence,
      urgency: "when_convenient",
      score,
      reasons,
      headline: `Hold for data — ${fmtMoney(needed)} more spend to conclude`,
      action: `Keep current budget. Conclude once cumulative spend crosses ${fmtMoney(minSpend)}.`,
    };
  }

  // ---------------------------------------------------------------------
  // Scale: strong winner with high confidence.
  // ---------------------------------------------------------------------
  if (winner && score >= 65) {
    // Scale lift scales with confidence + headroom
    const lift = confidence === "high" ? 30 : confidence === "medium" ? 20 : 15;
    const dailyGain =
      stage === "BOF" && metrics.cpa > 0
        ? Math.max(0, (metrics.roas - 1) * metrics.spend * 0.05)
        : metrics.revenue * 0.05;
    reasons.push(
      stage === "TOF"
        ? {
            signal: "Hook rate",
            value: `${fmtPct(metrics.hookRate)} (bar ${fmtPct(t.tof.minHookRate)})`,
            tone: "positive",
          }
        : stage === "MOF"
          ? {
              signal: "CTR",
              value: `${fmtPct(metrics.ctr)} (bar ${fmtPct(t.mof.minCtr)})`,
              tone: "positive",
            }
          : {
              signal: "ROAS",
              value: `${metrics.roas.toFixed(2)}× (bar ${t.bof.minRoas.toFixed(2)}×)`,
              tone: "positive",
            },
    );
    if (stage === "TOF") {
      reasons.push({
        signal: "Hold rate",
        value: `${fmtPct(metrics.holdRate)} (bar ${fmtPct(t.tof.minHoldRate)})`,
        tone: metrics.holdRate >= t.tof.minHoldRate ? "positive" : "neutral",
      });
    } else {
      reasons.push({
        signal: "ROAS",
        value: `${metrics.roas.toFixed(2)}×`,
        tone: "positive",
      });
    }
    reasons.push({
      signal: "Spend",
      value: `${fmtMoney(metrics.spend)} — ${confidence} confidence`,
      tone: "positive",
    });
    return {
      verdict: "scale",
      confidence,
      urgency: confidence === "high" ? "soon" : "when_convenient",
      score,
      reasons,
      headline: `Scale candidate — lift budget +${lift}% this week`,
      action: `Increase daily budget by ${lift}% over 48h. Watch frequency + CPM next 72h; if CPM stays flat, lift another 15%.`,
      estimatedDailyGain: Math.round(dailyGain),
    };
  }

  // ---------------------------------------------------------------------
  // Kill: weak creative with enough data to conclude.
  // ---------------------------------------------------------------------
  if (!winner && score < 38 && metrics.spend >= minSpend) {
    const dailyLoss =
      stage === "BOF"
        ? Math.max(0, metrics.spend - metrics.revenue) / 30
        : metrics.spend / 30;
    // Why it's failing — cite the single biggest gap
    if (stage === "TOF" && metrics.hookRate < t.tof.minHookRate) {
      reasons.push({
        signal: "Hook rate",
        value: `${fmtPct(metrics.hookRate)} (needs ${fmtPct(t.tof.minHookRate)})`,
        tone: "negative",
      });
    }
    if (stage === "MOF" && metrics.ctr < t.mof.minCtr) {
      reasons.push({
        signal: "CTR",
        value: `${fmtPct(metrics.ctr)} (needs ${fmtPct(t.mof.minCtr)})`,
        tone: "negative",
      });
    }
    if (stage === "BOF" && metrics.roas < t.bof.minRoas) {
      reasons.push({
        signal: "ROAS",
        value: `${metrics.roas.toFixed(2)}× (needs ${t.bof.minRoas.toFixed(2)}×)`,
        tone: "negative",
      });
    }
    if (metrics.cpa > 0 && metrics.cpa > t.bof.maxCpa * 2) {
      reasons.push({
        signal: "CPA",
        value: `${fmtMoney(metrics.cpa)} (cap ${fmtMoney(t.bof.maxCpa)})`,
        tone: "negative",
      });
    }
    if (metrics.holdRate < t.tof.minHoldRate * 0.6) {
      reasons.push({
        signal: "Hold rate",
        value: `${fmtPct(metrics.holdRate)} — audience bailing early`,
        tone: "negative",
      });
    }
    reasons.push({
      signal: "Spend",
      value: `${fmtMoney(metrics.spend)} — conclusive signal`,
      tone: "neutral",
    });
    const urgency: DecisionUrgency =
      dailyLoss > 75 ? "immediate" : dailyLoss > 25 ? "soon" : "when_convenient";
    return {
      verdict: "kill",
      confidence,
      urgency,
      score,
      reasons,
      headline:
        urgency === "immediate"
          ? `Kill by EOD — bleeding ≈ ${fmtMoney(dailyLoss)}/day`
          : urgency === "soon"
            ? `Kill this week — drag on portfolio ROAS`
            : `Kill when convenient — low-volume drain`,
      action:
        urgency === "immediate"
          ? `Pause the ad set today. Re-run the winning angle with iteration #1 from the AI recommendations.`
          : `Phase spend out over 2–3 days to avoid CBO shock. Reallocate to your strongest scaler in the same stage.`,
      estimatedDailyLoss: Math.round(dailyLoss),
    };
  }

  // ---------------------------------------------------------------------
  // Refresh: mid-score creative that's close to winning — fix and re-enter.
  // ---------------------------------------------------------------------
  if (!winner && score >= 45 && score < 65) {
    // Find what's closest to the bar
    const gaps: Array<{ label: string; value: string; gap: number }> = [];
    if (stage === "TOF") {
      gaps.push({
        label: "Hook rate",
        value: `${fmtPct(metrics.hookRate)} → ${fmtPct(t.tof.minHookRate)}`,
        gap: t.tof.minHookRate - metrics.hookRate,
      });
      gaps.push({
        label: "Hold rate",
        value: `${fmtPct(metrics.holdRate)} → ${fmtPct(t.tof.minHoldRate)}`,
        gap: t.tof.minHoldRate - metrics.holdRate,
      });
    } else if (stage === "MOF") {
      gaps.push({
        label: "CTR",
        value: `${fmtPct(metrics.ctr)} → ${fmtPct(t.mof.minCtr)}`,
        gap: t.mof.minCtr - metrics.ctr,
      });
      gaps.push({
        label: "ROAS",
        value: `${metrics.roas.toFixed(2)}× → ${t.mof.minRoas.toFixed(2)}×`,
        gap: t.mof.minRoas - metrics.roas,
      });
    } else {
      gaps.push({
        label: "ROAS",
        value: `${metrics.roas.toFixed(2)}× → ${t.bof.minRoas.toFixed(2)}×`,
        gap: t.bof.minRoas - metrics.roas,
      });
    }
    const closestGap = gaps.reduce((a, b) => (a.gap < b.gap ? a : b));
    reasons.push({
      signal: "Closest to bar",
      value: `${closestGap.label}: ${closestGap.value}`,
      tone: "neutral",
    });
    reasons.push({
      signal: "Score",
      value: `${Math.round(score)}/100 — room to fix`,
      tone: "neutral",
    });
    return {
      verdict: "refresh",
      confidence,
      urgency: "soon",
      score,
      reasons,
      headline: `Refresh — one iteration away from a winner`,
      action: `Ship iteration #1 from the AI recommendations. Keep spend flat until the new cut has 2× min spend.`,
    };
  }

  // ---------------------------------------------------------------------
  // Default: monitor.
  // ---------------------------------------------------------------------
  reasons.push({
    signal: "Score",
    value: `${Math.round(score)}/100`,
    tone: "neutral",
  });
  reasons.push({
    signal: "Spend",
    value: `${fmtMoney(metrics.spend)}`,
    tone: "neutral",
  });
  return {
    verdict: "monitor",
    confidence,
    urgency: "when_convenient",
    score,
    reasons,
    headline: `Monitor — no decisive action yet`,
    action: `Hold current spend. Re-evaluate at the next weekly review or when spend doubles.`,
  };
}

function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export function recommendationColor(rec: Recommendation): {
  bg: string;
  border: string;
  text: string;
  ring: string;
} {
  switch (rec) {
    case "scale":
      return {
        bg: "bg-success-soft",
        border: "border-success/30",
        text: "text-success",
        ring: "ring-success/20",
      };
    case "watch":
      return {
        bg: "bg-warning-soft",
        border: "border-warning/30",
        text: "text-warning",
        ring: "ring-warning/20",
      };
    case "kill":
      return {
        bg: "bg-danger-soft",
        border: "border-danger/30",
        text: "text-danger",
        ring: "ring-danger/20",
      };
  }
}
