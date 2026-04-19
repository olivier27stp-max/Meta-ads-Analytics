import { PageHeader } from "@/components/layout/PageHeader";
import { ControlBar } from "@/components/layout/ControlBar";
import { GlobalKpiStrip } from "@/components/kpi/GlobalKpiStrip";
import { WinRateCard } from "@/components/analytics/WinRateCard";
import { GroupedBreakdown } from "@/components/analytics/GroupedBreakdown";
import { KillScaleBoard } from "@/components/analytics/KillScaleBoard";
import { TodaysActions } from "@/components/analytics/TodaysActions";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description="Strategic view of what's working, what's on probation, and what to cut."
      />
      <ControlBar />
      <GlobalKpiStrip />
      <TodaysActions />
      <WinRateCard />
      <GroupedBreakdown />
      <KillScaleBoard />
    </div>
  );
}
