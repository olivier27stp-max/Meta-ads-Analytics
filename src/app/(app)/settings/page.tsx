import { PageHeader } from "@/components/layout/PageHeader";
import { MetaApiCard } from "@/components/settings/MetaApiCard";
import {
  SyncFrequencyCard,
  ReportAutomationCard,
} from "@/components/settings/SyncAndAutomationCards";
import {
  WinningLogicCard,
  MinSpendForAiCard,
} from "@/components/settings/WinningLogicCard";
import {
  CoachingPreferencesCard,
  CoachingFeedbackSummaryCard,
} from "@/components/settings/CoachingPreferencesCard";
import { AttributionCard } from "@/components/settings/AttributionCard";
import { AttributionActivityCard } from "@/components/settings/AttributionActivityCard";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Configure integrations, sync cadence, coaching persona, and the logic that powers Win Rate and Scale / Watch / Kill."
      />
      <div className="flex flex-col gap-4">
        <AttributionCard />
        <AttributionActivityCard />
        <CoachingPreferencesCard />
        <CoachingFeedbackSummaryCard />
        <MetaApiCard />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SyncFrequencyCard />
          <ReportAutomationCard />
        </div>
        <WinningLogicCard />
        <MinSpendForAiCard />
      </div>
    </div>
  );
}
