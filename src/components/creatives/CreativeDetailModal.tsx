"use client";

import * as React from "react";
import { RefreshCw, Sparkles, ExternalLink, ShieldCheck, AlertTriangle, Lightbulb } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnalysisStatusBadge, FunnelBadge, RecommendationBadge, TaxonomyChip } from "@/components/shared/StatusBadges";
import { AnalysisFeedbackControls } from "./AnalysisFeedbackControls";
import { DecisionPanel } from "./DecisionPanel";
import { CreativePreview } from "@/components/shared/CreativePreview";
import { useStore } from "@/lib/store";
import { cn, formatDate, formatMoney, formatPercent, formatRoas, formatInt } from "@/lib/utils";
import { classify } from "@/lib/scoring";
import type { Creative } from "@/types";

export function CreativeDetailModal() {
  const creatives = useStore((s) => s.creatives);
  const settings = useStore((s) => s.settings);
  const accounts = useStore((s) => s.accounts);
  const selectedId = useStore((s) => s.selectedCreativeId);
  const openCreative = useStore((s) => s.openCreative);
  const reanalyze = useStore((s) => s.reanalyzeCreative);
  const reanalyzing = useStore((s) => s.reanalyzingCreativeIds);

  const creative = creatives.find((c) => c.id === selectedId) ?? null;
  const account = creative ? accounts.find((a) => a.id === creative.accountId) : null;
  const open = Boolean(creative);
  const isReanalyzing = creative ? reanalyzing.includes(creative.id) : false;
  const recommendation = creative ? classify(creative, settings) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && openCreative(null)}>
      <DialogContent size="xl" className="max-h-[92vh] overflow-hidden p-0">
        {creative && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] max-h-[92vh] overflow-hidden">
            {/* Left side */}
            <div className="flex flex-col gap-4 border-b border-border bg-muted/20 p-6 lg:border-b-0 lg:border-r overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 pr-6">
                  <DialogDescription className="text-[11px] uppercase tracking-wide">
                    {account?.name ?? "Creative"}
                  </DialogDescription>
                  <DialogTitle className="text-[17px] leading-tight">
                    {creative.name}
                  </DialogTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{creative.campaignName}</span>
                    <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
                    <span>{creative.adSetName}</span>
                    <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
                    <span className="font-mono">{creative.adId}</span>
                  </div>
                </div>
              </div>

              <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-xl shadow-card">
                <CreativePreview creative={creative} size="lg" />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <FunnelBadge stage={creative.ai.funnelStage} />
                {recommendation && <RecommendationBadge rec={recommendation} />}
                <AnalysisStatusBadge status={creative.ai.status} />
                <Badge tone="muted">{creative.mediaType === "video" ? "Video" : "Image"}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <MetricTile label="Spend" value={formatMoney(creative.metrics.spend)} />
                <MetricTile label="ROAS" value={formatRoas(creative.metrics.roas)} emphasis />
                <MetricTile label="Purchases" value={formatInt(creative.metrics.purchases)} />
                <MetricTile label="CTR" value={formatPercent(creative.metrics.ctr, 2)} />
                <MetricTile label="Hook Rate" value={formatPercent(creative.metrics.hookRate, 1)} />
                <MetricTile label="Hold Rate" value={formatPercent(creative.metrics.holdRate, 1)} />
              </div>

              <div className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Delivery window
                  </span>
                  <Badge tone={creative.hadDelivery ? "success" : "muted"} size="sm">
                    {creative.hadDelivery ? "Had delivery" : "No delivery"}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-[12px] text-muted-foreground tabular">
                  <span>Created {formatDate(creative.createdAt)}</span>
                  <span>Updated {formatDate(creative.updatedAt)}</span>
                </div>
              </div>

              <Button variant="secondary" size="sm" asChild>
                <a
                  href={`https://adsmanager.facebook.com/adsmanager/manage/ads?act=${account?.metaAccountId.replace("act_", "")}&selected_ad_ids=${creative.adId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink />
                  Open in Ads Manager
                </a>
              </Button>
            </div>

            {/* Right side */}
            <div className="flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-3.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-[15px] font-semibold">AI analysis</h3>
                  {creative.ai.analyzedAt && (
                    <span className="text-[11px] text-muted-foreground tabular">
                      · {formatDate(creative.ai.analyzedAt)}
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => reanalyze(creative.id)}
                  disabled={isReanalyzing}
                >
                  <RefreshCw className={cn(isReanalyzing && "animate-spin")} />
                  {isReanalyzing ? "Re-analyzing…" : "Re-analyze"}
                </Button>
              </div>

              <div className="flex flex-col gap-5 p-6">
                <DecisionPanel creative={creative} />
                <section>
                  <h4 className="section-title mb-2.5">AI Tags</h4>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    <TaxonomyChip label="Asset Type" value={creative.ai.assetType} />
                    <TaxonomyChip label="Visual Format" value={creative.ai.visualFormat} />
                    <TaxonomyChip label="Messaging Angle" value={creative.ai.messagingAngle} />
                    <TaxonomyChip label="Hook Tactic" value={creative.ai.hookTactic} />
                    <TaxonomyChip label="Offer Type" value={creative.ai.offerType} />
                    <TaxonomyChip label="Funnel Stage" value={creative.ai.funnelStage} />
                  </div>
                </section>

                <section>
                  <h4 className="section-title mb-2.5">AI Summary</h4>
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-[13px] leading-relaxed text-foreground">
                    {creative.ai.summary}
                  </div>
                </section>

                {creative.ai.status === "complete" && creative.ai.summary && (
                  <AnalysisFeedbackControls creative={creative} />
                )}

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <section>
                    <div className="mb-2 flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-success" />
                      <h4 className="section-title">Strengths</h4>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {creative.ai.strengths.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 rounded-lg border border-success/20 bg-success-soft/60 px-3 py-2 text-[13px] text-foreground"
                        >
                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-success" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                      <h4 className="section-title">Areas to Improve</h4>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {creative.ai.areasToImprove.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning-soft/60 px-3 py-2 text-[13px] text-foreground"
                        >
                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-warning" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <section>
                  <div className="mb-2 flex items-center gap-2">
                    <Lightbulb className="h-3.5 w-3.5 text-info" />
                    <h4 className="section-title">Recommended iterations</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {creative.ai.recommendedIterations.map((it) => (
                      <IterationCard key={it.id} iteration={it} />
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetricTile({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-border bg-surface px-3 py-2.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={cn("tabular", emphasis ? "text-[17px] font-semibold" : "text-sm font-semibold")}>
        {value}
      </span>
    </div>
  );
}

function IterationCard({ iteration }: { iteration: Creative["ai"]["recommendedIterations"][number] }) {
  const effortTone = iteration.effort === "Low" ? "success" : iteration.effort === "Medium" ? "warning" : "danger";
  return (
    <div className="rounded-xl border border-border bg-surface p-3.5 transition-colors hover:border-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13.5px] font-semibold text-foreground">{iteration.title}</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {iteration.rationale}
          </p>
        </div>
        <Badge tone={effortTone} size="sm">
          {iteration.effort} effort
        </Badge>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-border/70 pt-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Expected
        </span>
        <span className="text-[12px] text-foreground">{iteration.expectedOutcome}</span>
      </div>
    </div>
  );
}
