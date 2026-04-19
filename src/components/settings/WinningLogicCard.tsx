"use client";

import * as React from "react";
import { Trophy, Sparkles } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { SettingsCard } from "./SettingsCard";

function NumberInput({
  label,
  hint,
  value,
  onChange,
  step = 0.01,
  prefix,
  suffix,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value || "0"))}
          className={`${prefix ? "pl-7" : ""} ${suffix ? "pr-9" : ""} tabular`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function WinningLogicCard() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const [local, setLocal] = React.useState(settings.winningThresholds);

  const save = () => update({ winningThresholds: local });
  const reset = () => setLocal(settings.winningThresholds);

  return (
    <SettingsCard
      title="What counts as a winning ad?"
      description="Stage-aware thresholds. These drive Win Rate Analysis and Scale / Watch / Kill bucketing."
      icon={<Trophy className="h-4 w-4" />}
      footer={
        <>
          <Button variant="ghost" onClick={reset}>
            Reset
          </Button>
          <Button variant="primary" onClick={save}>
            Save thresholds
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <StageBlock label="Top of Funnel (Awareness)" stage="TOF">
          <NumberInput
            label="Min hook rate"
            value={local.tof.minHookRate}
            onChange={(n) => setLocal({ ...local, tof: { ...local.tof, minHookRate: n } })}
            suffix="%"
            step={0.005}
          />
          <NumberInput
            label="Min hold rate"
            value={local.tof.minHoldRate}
            onChange={(n) => setLocal({ ...local, tof: { ...local.tof, minHoldRate: n } })}
            suffix="%"
            step={0.005}
          />
          <NumberInput
            label="Min CTR"
            value={local.tof.minCtr}
            onChange={(n) => setLocal({ ...local, tof: { ...local.tof, minCtr: n } })}
            suffix="%"
            step={0.001}
          />
          <NumberInput
            label="Min spend"
            value={local.tof.minSpend}
            onChange={(n) => setLocal({ ...local, tof: { ...local.tof, minSpend: n } })}
            prefix="$"
            step={25}
          />
        </StageBlock>

        <StageBlock label="Middle of Funnel (Consideration)" stage="MOF">
          <NumberInput
            label="Min CTR"
            value={local.mof.minCtr}
            onChange={(n) => setLocal({ ...local, mof: { ...local.mof, minCtr: n } })}
            suffix="%"
            step={0.001}
          />
          <NumberInput
            label="Min ROAS"
            value={local.mof.minRoas}
            onChange={(n) => setLocal({ ...local, mof: { ...local.mof, minRoas: n } })}
            step={0.1}
            suffix="×"
          />
          <NumberInput
            label="Min spend"
            value={local.mof.minSpend}
            onChange={(n) => setLocal({ ...local, mof: { ...local.mof, minSpend: n } })}
            prefix="$"
            step={25}
          />
        </StageBlock>

        <StageBlock label="Bottom of Funnel (Conversion)" stage="BOF">
          <NumberInput
            label="Min ROAS"
            value={local.bof.minRoas}
            onChange={(n) => setLocal({ ...local, bof: { ...local.bof, minRoas: n } })}
            step={0.1}
            suffix="×"
          />
          <NumberInput
            label="Min purchases"
            value={local.bof.minPurchases}
            onChange={(n) => setLocal({ ...local, bof: { ...local.bof, minPurchases: n } })}
            step={1}
          />
          <NumberInput
            label="Max CPA"
            value={local.bof.maxCpa}
            onChange={(n) => setLocal({ ...local, bof: { ...local.bof, maxCpa: n } })}
            prefix="$"
            step={1}
          />
          <NumberInput
            label="Min spend"
            value={local.bof.minSpend}
            onChange={(n) => setLocal({ ...local, bof: { ...local.bof, minSpend: n } })}
            prefix="$"
            step={25}
          />
        </StageBlock>
      </div>
    </SettingsCard>
  );
}

function StageBlock({
  stage,
  label,
  children,
}: {
  stage: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-4 py-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="inline-flex h-5 items-center rounded-md bg-foreground/5 px-2 text-[10px] font-semibold tracking-wide">
          {stage}
        </div>
        <div className="text-sm font-semibold">{label}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{children}</div>
    </div>
  );
}

export function MinSpendForAiCard() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const [value, setValue] = React.useState(settings.minSpendForAi);
  return (
    <SettingsCard
      title="AI recommendation threshold"
      description="Minimum spend a creative must reach before iteration recommendations are generated."
      icon={<Sparkles className="h-4 w-4" />}
      footer={
        <Button variant="primary" onClick={() => update({ minSpendForAi: value })}>
          Save
        </Button>
      }
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-md text-[13px] text-muted-foreground">
          Ads below this threshold are classified as <span className="font-medium text-foreground">Watch</span>{" "}
          because spend hasn't been significant enough to signal with confidence. Increasing the threshold reduces noise; lowering it surfaces more creatives earlier.
        </div>
        <div className="w-full md:w-56">
          <Label className="mb-1.5 block">Minimum spend</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              value={value}
              step={25}
              onChange={(e) => setValue(parseFloat(e.target.value || "0"))}
              className="pl-7 tabular"
            />
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
