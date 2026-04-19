"use client";

import * as React from "react";
import { Brain } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "./SettingsCard";
import { useStore } from "@/lib/store";
import type { BrandVoice, RiskTolerance, Vertical } from "@/types";

const VERTICALS: { value: Vertical; label: string }[] = [
  { value: "dtc", label: "Direct-to-consumer (DTC)" },
  { value: "saas", label: "SaaS / software" },
  { value: "lead_gen", label: "Lead generation" },
  { value: "fintech", label: "Fintech" },
  { value: "supplements", label: "Supplements / health" },
  { value: "apparel", label: "Apparel / fashion" },
  { value: "beauty", label: "Beauty / skincare" },
  { value: "education", label: "Education / info products" },
  { value: "other", label: "Other" },
];

const BRAND_VOICES: { value: BrandVoice; label: string; hint: string }[] = [
  { value: "plain_spoken", label: "Plain-spoken", hint: "Direct, no jargon" },
  { value: "playful", label: "Playful", hint: "Witty, self-aware" },
  { value: "authoritative", label: "Authoritative", hint: "Expert, declarative" },
  { value: "minimal", label: "Minimal", hint: "Ultra-tight copy" },
  { value: "luxury", label: "Luxury", hint: "Restrained, aspirational" },
  { value: "founder_led", label: "Founder-led", hint: "Personal, first-person" },
  { value: "custom", label: "Custom (use notes)", hint: "Follow notes verbatim" },
];

const RISKS: { value: RiskTolerance; label: string; hint: string }[] = [
  { value: "aggressive", label: "Aggressive", hint: "Bold bets, CPA spikes OK" },
  { value: "balanced", label: "Balanced", hint: "EV-first, upside second" },
  { value: "conservative", label: "Conservative", hint: "Protect ROAS first" },
];

export function CoachingPreferencesCard() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const [local, setLocal] = React.useState(settings.coaching);

  // Sync local when workspace rehydrates
  React.useEffect(() => {
    setLocal(settings.coaching);
  }, [settings.coaching]);

  const save = () => updateSettings({ coaching: local });
  const isDirty = JSON.stringify(local) !== JSON.stringify(settings.coaching);

  return (
    <SettingsCard
      title="Coaching Preferences"
      description="Calibrates how the AI coach critiques your creatives. Applied to every analysis."
      icon={<Brain className="h-4 w-4" />}
      footer={
        <>
          <Button variant="ghost" onClick={() => setLocal(settings.coaching)} disabled={!isDirty}>
            Reset
          </Button>
          <Button variant="primary" onClick={save} disabled={!isDirty}>
            Save preferences
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label>Vertical</Label>
          <Select
            value={local.vertical}
            onValueChange={(v) => setLocal({ ...local, vertical: v as Vertical })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VERTICALS.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[11px] text-muted-foreground">
            Shapes benchmarks the coach references.
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Brand voice</Label>
          <Select
            value={local.brandVoice}
            onValueChange={(v) => setLocal({ ...local, brandVoice: v as BrandVoice })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BRAND_VOICES.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[11px] text-muted-foreground">
            {BRAND_VOICES.find((v) => v.value === local.brandVoice)?.hint}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Risk tolerance</Label>
          <Select
            value={local.riskTolerance}
            onValueChange={(v) => setLocal({ ...local, riskTolerance: v as RiskTolerance })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RISKS.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[11px] text-muted-foreground">
            {RISKS.find((v) => v.value === local.riskTolerance)?.hint}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <Label>Coach notes (free-form)</Label>
        <Textarea
          value={local.notes}
          onChange={(e) => setLocal({ ...local, notes: e.target.value })}
          placeholder="e.g. 'Our brand always speaks in 2nd person, never &quot;we&quot;. Avoid mentioning price unless ROAS is below 1.5x. Retargeting audiences convert best with UGC testimonials.'"
          className="min-h-[120px] font-mono text-[12.5px]"
        />
        <span className="text-[11px] text-muted-foreground">
          Injected verbatim into the coach's prompt. Use it for brand rules, taboo topics, audience quirks, or anything a new hire would need to know on day one.
        </span>
      </div>
    </SettingsCard>
  );
}

export function CoachingFeedbackSummaryCard() {
  const exemplars = useStore((s) => s.coachingExemplars);
  const approved = exemplars.filter((e) => e.rating === "up").length;
  const rejected = exemplars.filter((e) => e.rating === "down").length;

  return (
    <SettingsCard
      title="Coach learning memory"
      description="The last 20 analyses you rated. Up to 3 approved + 3 rejected are injected as few-shot exemplars on every call."
      icon={<Brain className="h-4 w-4" />}
    >
      {exemplars.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
          <p className="text-[13px] text-muted-foreground">
            No ratings yet. Open a creative detail, use the thumbs up / down on the
            AI analysis to teach the coach your taste.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 text-[12px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-success">
              <span className="font-semibold">{approved}</span> approved
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger-soft px-2.5 py-1 text-danger">
              <span className="font-semibold">{rejected}</span> rejected
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {exemplars.slice(0, 6).map((e) => (
              <li
                key={e.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12.5px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{e.creativeName}</div>
                  {e.note && (
                    <div className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground">
                      &ldquo;{e.note}&rdquo;
                    </div>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
                    e.rating === "up"
                      ? "border-success/30 bg-success-soft text-success"
                      : "border-danger/30 bg-danger-soft text-danger"
                  }`}
                >
                  {e.rating === "up" ? "👍 approved" : "👎 rejected"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SettingsCard>
  );
}
