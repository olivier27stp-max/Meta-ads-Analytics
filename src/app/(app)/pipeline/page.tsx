"use client";

import * as React from "react";
import { RefreshCw, ArrowRight, GripVertical } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchLeads,
  updateLeadStage,
  type LeadRow,
} from "@/lib/leads-client";
import { formatMoney, cn } from "@/lib/utils";
import type { LeadStage } from "@/types";

/* --------------------------------------------------------------------------
 * Columns (Pipeline D2D — matches the Entiore screenshot exactly)
 * ------------------------------------------------------------------------ */

interface Column {
  id: string;
  label: string;
  stages: LeadStage[];
  primary: LeadStage;
  /** Dot color class. Solid-color dot used in the column header. */
  dot: string;
}

const COLUMNS: Column[] = [
  {
    id: "new_lead",
    label: "New Lead",
    stages: ["lead", "mql"],
    primary: "lead",
    dot: "bg-blue-500",
  },
  {
    id: "must_recall",
    label: "Must Recall",
    stages: ["demo_booked", "demo_attended"],
    primary: "demo_booked",
    dot: "bg-orange-500",
  },
  {
    id: "quote_sent",
    label: "Quote Sent",
    stages: ["proposal"],
    primary: "proposal",
    dot: "bg-slate-400",
  },
  {
    id: "closed_won",
    label: "Closed Won",
    stages: ["closed_won"],
    primary: "closed_won",
    dot: "bg-emerald-500",
  },
  {
    id: "closed_lost",
    label: "Closed Lost",
    stages: ["closed_lost"],
    primary: "closed_lost",
    dot: "bg-rose-500",
  },
];

const STAGE_TO_COL: Record<LeadStage, string> = {
  lead: "new_lead",
  mql: "new_lead",
  demo_booked: "must_recall",
  demo_attended: "must_recall",
  proposal: "quote_sent",
  closed_won: "closed_won",
  closed_lost: "closed_lost",
};

/* --------------------------------------------------------------------------
 * Display card — a lightweight shape independent of the Supabase row, so
 * seed data and real rows share one rendering path.
 * ------------------------------------------------------------------------ */

interface DealCard {
  id: string;
  name: string;
  company: string | null;
  value: number | null;
  currency: string;
  stage: LeadStage;
  ageDays: number;
  /** Real leads carry their Supabase id so moves can persist. */
  realId: string | null;
}

function toDealCard(lead: LeadRow): DealCard {
  const first = [lead.first_name, lead.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const name = first || lead.email || "(no name)";
  const ageDays = Math.max(
    1,
    Math.floor(
      (Date.now() - new Date(lead.updated_at).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
  return {
    id: lead.id,
    name,
    company: lead.company,
    value: lead.value,
    currency: lead.currency,
    stage: lead.stage,
    ageDays,
    realId: lead.id,
  };
}

function formatAge(days: number): string {
  if (days < 1) return "<1j";
  if (days < 30) return `${Math.floor(days)}j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

/* --------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------ */

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

  const deals: DealCard[] = React.useMemo(
    () => leads.map(toDealCard),
    [leads],
  );

  const byColumn = React.useMemo(() => {
    const m = new Map<string, DealCard[]>();
    for (const c of COLUMNS) m.set(c.id, []);
    for (const d of deals) {
      const colId = STAGE_TO_COL[d.stage];
      m.get(colId)?.push(d);
    }
    return m;
  }, [deals]);

  const move = async (deal: DealCard, targetColId: string) => {
    const col = COLUMNS.find((c) => c.id === targetColId);
    if (!col || !deal.realId) return;
    setMovingId(deal.id);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === deal.realId ? { ...l, stage: col.primary } : l,
      ),
    );
    const res = await updateLeadStage(deal.realId, col.primary);
    setMovingId(null);
    if (!res.ok) await refresh();
  };

  const totalDeals = deals.length;
  // Only closed_won contract values are counted toward the header total,
  // since open-stage deals don't have a confirmed contract value yet.
  const closedValue = deals
    .filter((d) => d.stage === "closed_won")
    .reduce((a, d) => a + (d.value ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pipeline D2D"
        description={`${totalDeals} deal${totalDeals === 1 ? "" : "s"}${closedValue > 0 ? ` · ${formatMoney(closedValue)} closed` : ""}`}
        actions={
          <Button variant="secondary" size="md" onClick={refresh} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-5 gap-3">
        {COLUMNS.map((col) => {
          const colDeals = byColumn.get(col.id) ?? [];
          return (
            <Lane
              key={col.id}
              column={col}
              deals={colDeals}
              movingId={movingId}
              onMove={move}
            />
          );
        })}
      </div>
    </div>
  );
}

function Lane({
  column,
  deals,
  movingId,
  onMove,
}: {
  column: Column;
  deals: DealCard[];
  movingId: string | null;
  onMove: (deal: DealCard, colId: string) => void;
}) {
  // Only Closed Won shows a total value in its header — open stages have
  // no confirmed contract value.
  const headerValue =
    column.id === "closed_won"
      ? deals.reduce((a, d) => a + (d.value ?? 0), 0)
      : 0;
  return (
    <section className="flex min-h-[460px] flex-col gap-2 rounded-2xl border border-border bg-muted/15 p-2.5">
      <header className="flex items-center justify-between gap-2 px-1 pt-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn("h-2 w-2 shrink-0 rounded-full", column.dot)}
            aria-hidden
          />
          <span className="truncate text-[13px] font-semibold text-foreground">
            {column.label}
          </span>
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold tabular text-muted-foreground">
            {deals.length}
          </span>
        </div>
        {headerValue > 0 && (
          <span className="shrink-0 text-[10.5px] font-medium tabular text-muted-foreground">
            {formatMoney(headerValue)}
          </span>
        )}
      </header>

      {deals.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-10 text-[12px] text-muted-foreground">
          Aucun deal
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {deals.map((deal) => (
            <DealCardView
              key={deal.id}
              deal={deal}
              currentColId={column.id}
              moving={movingId === deal.id}
              onMove={onMove}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DealCardView({
  deal,
  currentColId,
  moving,
  onMove,
}: {
  deal: DealCard;
  currentColId: string;
  moving: boolean;
  onMove: (deal: DealCard, colId: string) => void;
}) {
  // Contract value is only meaningful once the deal is closed-won.
  const showValue = deal.stage === "closed_won" && deal.value !== null;
  return (
    <div
      className={cn(
        "group flex gap-2 rounded-xl border border-border bg-surface p-3 shadow-card transition-opacity",
        moving && "opacity-60",
      )}
    >
      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-muted-foreground/55" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-[13px] font-semibold text-foreground">
            {deal.name}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-ring group-hover:opacity-100">
              <ArrowRight className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMNS.filter((c) => c.id !== currentColId).map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => onMove(deal, c.id)}>
                  {c.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-2">
          {showValue ? (
            <span className="text-[13px] font-semibold tabular text-foreground">
              {formatMoney(deal.value!)}
            </span>
          ) : (
            <span />
          )}
          <span className="text-[10.5px] text-muted-foreground tabular">
            {formatAge(deal.ageDays)}
          </span>
        </div>
      </div>
    </div>
  );
}
