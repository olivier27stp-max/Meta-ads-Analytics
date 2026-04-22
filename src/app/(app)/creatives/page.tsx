"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { ControlBar } from "@/components/layout/ControlBar";
import { GlobalKpiStrip } from "@/components/kpi/GlobalKpiStrip";
import { CreativesFilters } from "@/components/creatives/CreativesFilters";
import { CreativesTable } from "@/components/creatives/CreativesTable";
import { CreativesGrid } from "@/components/creatives/CreativesGrid";
import { BatchAnalyzeBanner } from "@/components/creatives/BatchAnalyzeButton";
import { SyncResultBanner } from "@/components/accounts/SyncResultBanner";
import { useStore } from "@/lib/store";

export default function CreativesPage() {
  const viewMode = useStore((s) => s.viewMode);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Creatives"
        description="Every creative, enriched with AI taxonomy and stage-aware performance signal."
      />
      <ControlBar />
      <GlobalKpiStrip />
      <SyncResultBanner />
      <CreativesFilters />
      <BatchAnalyzeBanner />
      {viewMode === "table" ? <CreativesTable /> : <CreativesGrid />}
    </div>
  );
}
