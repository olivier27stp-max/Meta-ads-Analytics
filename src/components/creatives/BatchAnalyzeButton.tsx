"use client";

import * as React from "react";
import { Sparkles, StopCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFilteredCreatives, useStore } from "@/lib/store";
import { formatInt } from "@/lib/utils";

export function BatchAnalyzeButton() {
  const filtered = useFilteredCreatives();
  const startBatch = useStore((s) => s.startBatchAnalyze);
  const batch = useStore((s) => s.batchAnalyze);
  const [open, setOpen] = React.useState(false);

  const confirmStart = () => {
    setOpen(false);
    void startBatch(filtered.map((c) => c.id));
  };

  if (batch.running) return null;

  return (
    <>
      <Button
        variant="secondary"
        size="md"
        onClick={() => setOpen(true)}
        disabled={filtered.length === 0}
      >
        <Sparkles />
        Analyze all
        {filtered.length > 0 && (
          <Badge tone="muted" size="sm" className="ml-0.5">
            {formatInt(filtered.length)}
          </Badge>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Re-analyze {formatInt(filtered.length)} creatives?</DialogTitle>
            <DialogDescription>
              Each creative is sent to Gemini 2.0 Flash with its metrics and
              (when available) its media asset. Videos are uploaded via the
              Files API and deleted after the analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2.5 px-6 pb-2">
            <InfoRow label="Model">Gemini 2.0 Flash</InfoRow>
            <InfoRow label="Throttling">~14 requests / minute (free tier cap is 15)</InfoRow>
            <InfoRow label="Estimated duration">
              ~{Math.ceil((filtered.length * 4.2) / 60)} minutes
            </InfoRow>
            <InfoRow label="Scope">
              Currently filtered creatives only. Adjust your filters to narrow the batch.
            </InfoRow>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmStart}>
              <Sparkles />
              Start analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-border/70 pt-2 text-[13px] first:border-0 first:pt-0">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-right text-foreground">{children}</span>
    </div>
  );
}

export function BatchAnalyzeBanner() {
  const batch = useStore((s) => s.batchAnalyze);
  const cancel = useStore((s) => s.cancelBatchAnalyze);

  if (!batch.running && batch.total === 0) return null;

  const pct = batch.total > 0 ? (batch.done / batch.total) * 100 : 0;
  const finished = !batch.running && batch.total > 0;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3.5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full ${
              finished ? "bg-success-soft text-success" : "bg-info-soft text-info"
            }`}
          >
            {finished ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            )}
          </span>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold">
              {finished
                ? batch.cancelRequested
                  ? `Batch cancelled at ${batch.done}/${batch.total}`
                  : `Batch complete — ${batch.done}/${batch.total}`
                : `Analyzing ${batch.done}/${batch.total}…`}
            </span>
            <span className="line-clamp-1 text-[11px] text-muted-foreground tabular">
              {batch.currentName
                ? `Current: ${batch.currentName}`
                : finished && batch.failed > 0
                  ? `${batch.failed} failed — re-click the creative to retry`
                  : "Throttled to 14 req/min"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {finished && batch.failed > 0 && (
            <Badge tone="danger" size="sm">
              {batch.failed} failed
            </Badge>
          )}
          {batch.running && (
            <Button variant="ghost" size="sm" onClick={cancel}>
              <StopCircle />
              Cancel
            </Button>
          )}
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            finished ? "bg-success" : "bg-foreground/80"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
