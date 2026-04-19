"use client";

import * as React from "react";
import { ThumbsUp, ThumbsDown, X, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Creative, FeedbackRating } from "@/types";

export function AnalysisFeedbackControls({ creative }: { creative: Creative }) {
  const rate = useStore((s) => s.rateAnalysis);
  const clear = useStore((s) => s.clearAnalysisRating);
  const current = creative.ai.feedback;

  const [pendingRating, setPendingRating] = React.useState<FeedbackRating | null>(null);
  const [note, setNote] = React.useState("");

  const openNote = (rating: FeedbackRating) => {
    setPendingRating(rating);
    setNote(current?.rating === rating ? current.note : "");
  };

  const submit = () => {
    if (!pendingRating) return;
    rate(creative.id, pendingRating, note.trim());
    setPendingRating(null);
  };

  const cancel = () => {
    setPendingRating(null);
    setNote("");
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/30 px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[12px] font-semibold">How's this critique?</span>
          <span className="text-[11px] text-muted-foreground">
            Your ratings train the coach — approved tone is emulated, rejected is avoided.
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={current?.rating === "up" ? "primary" : "secondary"}
            size="sm"
            className={cn(
              "gap-1",
              current?.rating === "up" && "bg-success text-success-foreground hover:bg-success/90",
            )}
            onClick={() => openNote("up")}
          >
            <ThumbsUp />
            {current?.rating === "up" ? "On the money" : "Good"}
          </Button>
          <Button
            variant={current?.rating === "down" ? "primary" : "secondary"}
            size="sm"
            className={cn(
              "gap-1",
              current?.rating === "down" && "bg-danger text-danger-foreground hover:bg-danger/90",
            )}
            onClick={() => openNote("down")}
          >
            <ThumbsDown />
            {current?.rating === "down" ? "Off-base" : "Off"}
          </Button>
          {current && (
            <Button variant="ghost" size="sm" onClick={() => clear(creative.id)}>
              <X />
            </Button>
          )}
        </div>
      </div>

      {pendingRating && (
        <div className="flex flex-col gap-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              pendingRating === "up"
                ? "What made this critique land? (optional — but the more specific, the faster the coach calibrates)"
                : "What was off? Tone? Wrong diagnosis? Too generic? (optional — but helpful)"
            }
            className="min-h-[70px] text-[12.5px]"
          />
          <div className="flex items-center justify-end gap-1.5">
            <Button variant="ghost" size="sm" onClick={cancel}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={submit}>
              <Check />
              Save rating
            </Button>
          </div>
        </div>
      )}

      {current && !pendingRating && current.note && (
        <div className="rounded-lg border border-border/80 bg-surface px-2.5 py-1.5 text-[11.5px] text-muted-foreground">
          <span className="font-medium text-foreground">Your note:</span> {current.note}
        </div>
      )}
    </div>
  );
}
