import { Badge } from "@/components/ui/badge";
import type { AIStatus, FunnelStage, Recommendation } from "@/types";

export function AnalysisStatusBadge({ status }: { status: AIStatus }) {
  if (status === "complete") return <Badge tone="success">● Complete</Badge>;
  if (status === "pending") return <Badge tone="warning">● Pending</Badge>;
  return <Badge tone="danger">● Failed</Badge>;
}

export function AccountStatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge tone="success">● Active</Badge>
  ) : (
    <Badge tone="muted">● Disconnected</Badge>
  );
}

export function FunnelBadge({ stage }: { stage: FunnelStage }) {
  return <Badge tone="funnel">{stage}</Badge>;
}

export function RecommendationBadge({ rec }: { rec: Recommendation }) {
  if (rec === "scale") return <Badge tone="success">Scale</Badge>;
  if (rec === "watch") return <Badge tone="warning">Watch</Badge>;
  return <Badge tone="danger">Kill</Badge>;
}

export function TaxonomyChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-[12px] font-medium text-foreground">{value}</span>
    </div>
  );
}
