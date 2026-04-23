"use client";

import * as React from "react";
import {
  GitBranch,
  RefreshCw,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KpiCard, KpiStrip } from "@/components/kpi/KpiCard";
import {
  fetchLeads,
  updateLeadStage,
  displayName,
  leadSource,
  PIPELINE_STAGES,
  STAGE_LABEL,
  ACTIVE_STAGES,
  type LeadRow,
} from "@/lib/leads-client";
import { formatMoney, formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { LeadStage } from "@/types";

// Lane order + lane-specific tone
const LANES: Array<{
  stage: LeadStage;
  tone: "muted" | "info" | "warning" | "success" | "danger";
  bg: string;
  border: string;
}> = [
  { stage: "lead", tone: "muted", bg: "bg-muted/30", border: "border-border" },
  { stage: "mql", tone: "info", bg: "bg-info-soft/40", border: "border-info/20" },
  { stage: "demo_booked", tone: "info", bg: "bg-info-soft/40", border: "border-info/20" },
  { stage: "demo_attended", tone: "info", bg: "bg-info-soft/40", border: "border-info/20" },
  { stage: "proposal", tone: "warning", bg: "bg-warning-soft/40", border: "border-warning/20" },
  { stage: "closed_won", tone: "success", bg: "bg-success-soft/40", border: "border-success/20" },
  { stage: "closed_lost", tone: "danger", bg: "bg-danger-soft/40", border: "border-danger/20" },
];

export default function PipelinePage() {
  const [leads, setLeads] = React.useState<LeadRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [movingId, setMovingId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setLeads(await fetchLeads());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const byStage = React.useMemo(() => {
    const m = new Map<LeadStage, LeadRow[]>();
    for (const s of PIPELINE_STAGES) m.set(s, []);
    for (const l of leads) m.get(l.stage)?.push(l);
    return m;
  }, [leads]);

  const move = async (id: string, to: LeadStage) => {
    setMovingId(id);
    // Optimistic
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: to } : l)));
    const res = await updateLeadStage(id, to);
    setMovingId(null);
    if (!res.ok) {
      // Rollback
      await refresh();
    }
  };

  const activeLeads = leads.filter((l) =>
    (ACTIVE_STAGES as string[]).includes(l.stage),
  );
  const activeCount = activeLeads.length;
  const activeValue = activeLeads.reduce((a, l) => a + (l.value ?? 0), 0);
  const wonLeads = leads.filter((l) => l.stage === "closed_won");
  const wonValue = wonLeads.reduce((a, l) => a + (l.value ?? 0), 0);
  const resolved = leads.filter(
    (l) => l.stage === "closed_won" || l.stage === "closed_lost",
  ).length;
  const winRate = resolved > 0 ? wonLeads.length / resolved : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pipeline"
        description="Kanban view of your sales funnel. Move a card to trigger Meta CAPI event for attribution."
        actions={
          <Button variant="secondary" size="md" onClick={refresh} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      <KpiStrip>
        <KpiCard
          label="In pipeline"
          value={activeCount.toString()}
          hint={activeCount > 0 ? `${formatMoney(activeValue)} forecast` : "Empty"}
          icon={<Target className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Closed-won"
          value={wonLeads.length.toString()}
          hint={wonLeads.length > 0 ? formatMoney(wonValue) : "—"}
          icon={<DollarSign className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Win rate"
          value={resolved > 0 ? `${(winRate * 100).toFixed(1)}%` : "—"}
          hint={resolved > 0 ? `${wonLeads.length}/${resolved} resolved` : "No resolved"}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Total leads"
          value={leads.length.toString()}
          hint="Across all stages"
          icon={<GitBranch className="h-3.5 w-3.5" />}
        />
      </KpiStrip>

      {loading ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-16 text-center text-sm text-muted-foreground shadow-card">
          Loading pipeline…
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <GitBranch className="h-4 w-4" />
          </div>
          <h3 className="mt-3 text-sm font-semibold">Pipeline is empty</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Capture your first lead (landing → Simulation in Settings, or real
            form submit) to see it flow across the stages here.
          </p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {LANES.map(({ stage, bg, border }) => {
            const laneLeads = byStage.get(stage) ?? [];
            const laneValue = laneLeads.reduce((a, l) => a + (l.value ?? 0), 0);
            return (
              <div
                key={stage}
                className={cn(
                  "flex min-h-[500px] w-[280px] shrink-0 flex-col gap-2 rounded-2xl border p-2.5",
                  bg,
                  border,
                )}
              >
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex flex-col">
                    <span className="text-[11.5px] font-semibold uppercase tracking-wide text-foreground">
                      {STAGE_LABEL[stage]}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground tabular">
                      {laneLeads.length} · {formatMoney(laneValue)}
                    </span>
                  </div>
                </div>

                {laneLeads.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-surface/60 px-3 py-6 text-center text-[11px] text-muted-foreground">
                    No leads here.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {laneLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        moving={movingId === lead.id}
                        onMove={(to) => move(lead.id, to)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeadCard({
  lead,
  moving,
  onMove,
}: {
  lead: LeadRow;
  moving: boolean;
  onMove: (to: LeadStage) => void;
}) {
  return (
    <div
      className={cn(
        "group flex flex-col gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-2 shadow-card transition-opacity",
        moving && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-semibold text-foreground">
            {displayName(lead)}
          </div>
          {lead.company && (
            <div className="truncate text-[10.5px] text-muted-foreground">
              {lead.company}
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-ring group-hover:opacity-100">
            <ArrowRight className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PIPELINE_STAGES.filter((s) => s !== lead.stage).map((s) => (
              <DropdownMenuItem key={s} onClick={() => onMove(s)}>
                {STAGE_LABEL[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {lead.value && (
        <div className="text-[12px] font-semibold tabular text-foreground">
          {formatMoney(lead.value)}
        </div>
      )}
      {(leadSource(lead) || lead.fbclid) && (
        <div className="flex flex-wrap items-center gap-1">
          {leadSource(lead) && (
            <span className="truncate rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[9.5px] text-muted-foreground">
              {leadSource(lead)}
            </span>
          )}
          {lead.fbclid && (
            <Badge tone="info" size="sm">
              fbclid
            </Badge>
          )}
        </div>
      )}
      <div className="text-[10px] text-muted-foreground tabular">
        {formatRelative(lead.updated_at)}
      </div>
    </div>
  );
}
