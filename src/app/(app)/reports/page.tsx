import { PageHeader } from "@/components/layout/PageHeader";
import { ControlBar } from "@/components/layout/ControlBar";
import { GlobalKpiStrip } from "@/components/kpi/GlobalKpiStrip";
import { ReportsTable } from "@/components/reports/ReportsTable";

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Generated creative performance summaries with winners, losers and iteration ideas."
      />
      <ControlBar />
      <GlobalKpiStrip />
      <ReportsTable />
    </div>
  );
}
