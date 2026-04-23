"use client";

import * as React from "react";
import {
  GitBranch,
  RefreshCw,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Target,
  Flame,
  Trophy,
  Clock3,
  XCircle,
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
  type LeadRow,
} from "@/lib/leads-client";
import { formatMoney, formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { LeadStage } from "@/types";

/**
 * Four-column pipeline. Each column groups one or more of the underlying
 * LeadStage values stored in Postgres so the UI stays simple while the data
 * model stays flexible.
 *
 * Move-to buckets write the column's primary stage — which in turn fires
 * the CAPI event mapped for that stage in Settings.
 */
interface Column {
  id: string;
  label: string;
  icon: React.ElementType;
  stages: LeadStage[];
  primary: LeadStage; // stage written when moving into this column
  accent: {
    bg: string;
    border: string;
    text: string;
    dot: string;
  };
}

const COLUMNS: Column[] = [
  {
    id: "new_leads",
    label: "New Leads",
    icon: Flame,
    stages: ["lead", "mql"],
    primary: "lead",
    accent: {
      bg: "bg-muted/30",
      border: "border-border",
      text: "text-foreground",
      dot: "bg-muted-foreground/60",
    },
  },
  {
    id: "deal_lost",
    label: "Deal Lost",
    icon: XCircle,
    stages: ["closed_lost"],
    primary: "closed_lost",
    accent: {
      bg: "bg-danger-soft/50",
      border: "border-danger/25",
      text: "text-danger",
      dot: "bg-danger",
    },
  },
  {
    id: "follow_up",
    label: "Follow up",
    icon: Clock3,
    stages: ["demo_booked", "demo_attended", "proposal"],
    primary: "demo_booked",
    accent: {
      bg: "bg-warning-soft/50",
      border: "border-warning/25",
      text: "text-warning",
      dot: "bg-warning",
    },
  },
  {
    id: "deal_won",
    label: "Deal Won",
    icon: Trophy,
    stages: ["closed_won"],
    primary: "closed_won",
    accent: {
      bg: "bg-success-soft/50",
      border: "border-success/25",
      text: "text-success",
      dot: "bg-success",
    },
  },
];

// Map every LeadStage → its column index
const STAGE_TO_COL: Record<LeadStage, string> = {
  lead: "new_leads",
  mql: "new_leads",
  demo_booked: "follow_up",
  demo_attended: "follow_up",
  proposal: "follow_up",
  closed_won: "deal_won",
  closed_lost: "deal_lost",
};

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

  const byColumn = React.useMemo(() => {
    const m = new Map<string, LeadRow[]>();
    for (const c of COLUMNS) m.set(c.id, []);
    for (const lead of leads) {
      const colId = STAGE_TO_COL[lead.stage];
      m.get(colId)?.push(lead);
    }
    return m;
  }, [leads]);

  const move = async (leadId: string, targetColId: string) => {
    const col = COLUMNS.find((c) => c.id === targetColId);
    if (!col) return;
    const target = col.primary;
    setMovingId(leadId);
    // Optimistic
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: target } : l)));
    const res = await updateLeadStage(leadId, target);
    setMovingId(null);
    if (!res.ok) await refresh();
  };

  const inPipeline =
    (byColumn.get("new_leads")?.length ?? 0) + (byColumn.get("follow_up")?.length ?? 0);
  const pipelineValue = leads
    .filter((l) => STAGE_TO_COL[l.stage] === "new_leads" || STAGE_TO_COL[l.stage] === "follow_up")
    .reduce((a, l) => a + (l.value ?? 0), 0);
  const won = byColumn.get("deal_won")?.length ?? 0;
  const wonValue = (byColumn.get("deal_won") ?? []).reduce(
    (a, l) => a + (l.value ?? 0),
    0,
  );
  const lost = byColumn.get("deal_lost")?.length ?? 0;
  const resolved = won + lost;
  const winRate = resolved > 0 ? won / resolved : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pipeline"
        description="Board in 4 columns. Move a card to write the canonical stage + fire Meta CAPI for attribution."
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
          value={inPipeline.toString()}
          hint={inPipeline > 0 ? `${formatMoney(pipelineValue)} forecast` : "Empty"}
          icon={<Target className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Deal Won"
          value={won.toString()}
          hint={won > 0 ? formatMoney(wonValue) : "—"}
          icon={<Trophy className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Win rate"
          value={resolved > 0 ? `${(winRate * 100).toFixed(1)}%` : "—"}
          hint={resolved > 0 ? `${won}/${resolved} resolved` : "No resolved"}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Total leads"
          value={leads.length.toString()}
          hint={`Across all ${COLUMNS.length} columns`}
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
            Capture your first lead (landing → Simulation in Settings → Attribution, or a real form submit) to see it land in &ldquo;New Leads&rdquo;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const colLeads = byColumn.get(col.id) ?? [];
            const colValue = colLeads.reduce((a, l) => a + (l.value ?? 0), 0);
            return (
              <Lane
                key={col.id}
                column={col}
                leads={colLeads}
                value={colValue}
                movingId={movingId}
                onMove={move}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function Lane({
  column,
  leads,
  value,
  movingId,
  onMove,
}: {
  column: Column;
  leads: LeadRow[];
  value: number;
  movingId: string | null;
  onMove: (leadId: string, colId: string) => void;
}) {
  const Icon = column.icon;
  const { accent } = column;
  return (
    <section
      className={cn(
        "flex min-h-[540px] flex-col gap-2.5 rounded-2xl border p-3",
        accent.bg,
        accent.border,
      )}
    >
      <header className="flex items-center justify-between gap-2 px-1 pt-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-md border bg-surface",
              accent.border,
              accent.text,
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className={cn("text-[12.5px] font-semibold", accent.text)}>
              {column.label}
            </span>
            <span className="text-[10.5px] text-muted-foreground tabular">
              {leads.length} · {formatMoney(value)}
            </span>
          </div>
        </div>
        <span
          className={cn("h-1.5 w-1.5 rounded-full", accent.dot)}
          aria-hidden
        />
      </header>

      <div className="h-px bg-border/70" />

      {leads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-surface/60 px-3 py-6 text-center text-[11px] text-muted-foreground">
          No leads here.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              currentColId={column.id}
              moving={movingId === lead.id}
              onMove={onMove}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LeadCard({
  lead,
  currentColId,
  moving,
  onMove,
}: {
  lead: LeadRow;
  currentColId: string;
  moving: boolean;
  onMove: (leadId: string, colId: string) => void;
}) {
  return (
    <div
      className={cn(
        "group flex flex-col gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-card transition-opacity",
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
          <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-ring">
            <ArrowRight className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {COLUMNS.filter((c) => c.id !== currentColId).map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => onMove(lead.id, c.id)}>
                {c.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {lead.value && (
        <div className="text-[12.5px] font-semibold tabular text-foreground">
          {formatMoney(lead.value)}
        </div>
      )}
      {(leadSource(lead) || lead.fbclid) && (
        <div className="flex flex-wrap items-center gap-1">
          {leadSource(lead) && (
            <span className="truncate rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
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
