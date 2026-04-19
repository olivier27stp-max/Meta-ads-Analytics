"use client";

import { RefreshCw, Clock3 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { SettingsCard } from "./SettingsCard";
import { Button } from "@/components/ui/button";

export function SyncFrequencyCard() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  return (
    <SettingsCard
      title="Sync Frequency"
      description="Controls how often we pull fresh creative and performance data from Meta."
      icon={<RefreshCw className="h-4 w-4" />}
      footer={
        <Button variant="primary" onClick={() => update({ syncFrequency: settings.syncFrequency })}>
          Save
        </Button>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium">Frequency</span>
          <span className="text-xs text-muted-foreground">
            Manual pulls give you deterministic numbers; scheduled pulls keep dashboards live.
          </span>
        </div>
        <Select
          value={settings.syncFrequency}
          onValueChange={(v) => update({ syncFrequency: v as typeof settings.syncFrequency })}
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual only</SelectItem>
            <SelectItem value="daily">Daily (02:00 UTC)</SelectItem>
            <SelectItem value="hourly">Hourly</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </SettingsCard>
  );
}

export function ReportAutomationCard() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  return (
    <SettingsCard
      title="Report Automation"
      description="Automatically generate creative performance reports on a schedule."
      icon={<Clock3 className="h-4 w-4" />}
      footer={
        <Button
          variant="primary"
          onClick={() => update({ reportAutomation: settings.reportAutomation })}
        >
          Save
        </Button>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium">Automation</span>
          <span className="text-xs text-muted-foreground">
            Scheduled reports are generated at 09:00 UTC and delivered to workspace members.
          </span>
        </div>
        <Select
          value={settings.reportAutomation}
          onValueChange={(v) =>
            update({ reportAutomation: v as typeof settings.reportAutomation })
          }
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual only</SelectItem>
            <SelectItem value="weekly">Weekly summary</SelectItem>
            <SelectItem value="monthly">Monthly summary</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </SettingsCard>
  );
}
