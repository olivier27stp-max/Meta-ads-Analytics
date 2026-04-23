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

type TagKind = "hot" | "followup" | "pending";

interface DealCard {
  id: string;
  name: string;
  company: string | null;
  value: number | null;
  currency: string;
  stage: LeadStage;
  tag: TagKind;
  ageDays: number;
  /** Real leads carry their Supabase id so moves can persist. */
  realId: string | null;
}

const TAG_LABEL: Record<TagKind, string> = {
  hot: "Hot",
  followup: "Follow-up",
  pending: "Pending",
};

const TAG_CLASS: Record<TagKind, string> = {
  hot: "border-rose-200 bg-rose-50 text-rose-600",
  followup: "border-blue-200 bg-blue-50 text-blue-600",
  pending: "border-border bg-muted/60 text-muted-foreground",
};

/* --------------------------------------------------------------------------
 * Seed — mirrors the provided reference screenshot (7 deals, $7,000,000).
 * Used when the workspace has zero real leads.
 * ------------------------------------------------------------------------ */

const SEED_DEALS: DealCard[] = [
  {
    id: "seed-1",
    name: "[QA] Alexandre Fortin",
    company: null,
    value: 250_000,
    currency: "USD",
    stage: "lead",
    tag: "hot",
    ageDays: 9,
    realId: null,
  },
  {
    id: "seed-2",
    name: "[QA] Émilie Bergeron",
    company: null,
    value: 850_000,
    currency: "USD",
    stage: "lead",
    tag: "pending",
    ageDays: 9,
    realId: null,
  },
  {
    id: "seed-3",
    name: "[QA] Marie Tremblay",
    company: null,
    value: 320_000,
    currency: "USD",
    stage: "demo_booked",
    tag: "followup",
    ageDays: 9,
    realId: null,
  },
  {
    id: "seed-4",
    name: "[QA] Patrick Bélanger",
    company: null,
    value: 1_500_000,
    currency: "USD",
    stage: "demo_booked",
    tag: "hot",
    ageDays: 9,
    realId: null,
  },
  {
    id: "seed-5",
    name: "[QA] Sophie Bouchard",
    company: null,
    value: 2_200_000,
    currency: "USD",
    stage: "proposal",
    tag: "pending",
    ageDays: 9,
    realId: null,
  },
  {
    id: "seed-6",
    name: "[QA] François Gauthier",
    company: null,
    value: 680_000,
    currency: "USD",
    stage: "proposal",
    tag: "hot",
    ageDays: 9,
    realId: null,
  },
  {
    id: "seed-7",
    name: "[QA] Isabelle Roy",
    company: null,
    value: 1_200_000,
    currency: "USD",
    stage: "closed_won",
    tag: "pending",
    ageDays: 9,
    realId: null,
  },
];

function deriveTag(lead: LeadRow): TagKind {
  const ageDays =
    (Date.now() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  if (lead.stage === "demo_booked" || lead.stage === "demo_attended")
    return "followup";
  if ((lead.stage === "lead" || lead.stage === "mql") && ageDays < 3)
    return "hot";
  return "pending";
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
    tag: deriveTag(lead),
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
  /**
   * Seed cards live in state so the Move-to menu can mutate them optimistically
   * (lets the user see the screenshot UX work even before the DB has leads).
   */
  const [seedCards, setSeedCards] = React.useState<DealCard[]>(() => [
    ...SEED_DEALS,
  ]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setLeads(await fetchLeads());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const deals: DealCard[] = React.useMemo(() => {
    if (leads.length > 0) return leads.map(toDealCard);
    return seedCards;
  }, [leads, seedCards]);

  const usingSeed = leads.length === 0;

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
    if (!col) return;
    setMovingId(deal.id);

    if (deal.realId) {
      // Real lead — optimistic UI + persist via API
      setLeads((prev) =>
        prev.map((l) =>
          l.id === deal.realId ? { ...l, stage: col.primary } : l,
        ),
      );
      const res = await updateLeadStage(deal.realId, col.primary);
      setMovingId(null);
      if (!res.ok) await refresh();
    } else {
      // Seed card — local-only move
      setSeedCards((prev) =>
        prev.map((d) =>
          d.id === deal.id ? { ...d, stage: col.primary } : d,
        ),
      );
      setMovingId(null);
    }
  };

  const totalDeals = deals.length;
  const totalValue = deals.reduce((a, d) => a + (d.value ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pipeline D2D"
        description={`${totalDeals} deal${totalDeals === 1 ? "" : "s"} · ${formatMoney(totalValue)}`}
        actions={
          <Button variant="secondary" size="md" onClick={refresh} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      {usingSeed && (
        <div className="rounded-xl border border-warning/25 bg-warning-soft/60 px-3 py-2 text-[11.5px] text-warning">
          <span className="font-semibold">Aperçu.</span> Aucun lead réel dans ta
          Supabase — les 7 deals ci-dessous sont des données de démonstration
          pour que tu voies la mise en page. Ils disparaîtront dès qu&apos;un
          vrai lead sera capturé.
        </div>
      )}

      <div className="grid grid-cols-5 gap-3">
        {COLUMNS.map((col) => {
          const colDeals = byColumn.get(col.id) ?? [];
          const colValue = colDeals.reduce((a, d) => a + (d.value ?? 0), 0);
          return (
            <Lane
              key={col.id}
              column={col}
              deals={colDeals}
              value={colValue}
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
  value,
  movingId,
  onMove,
}: {
  column: Column;
  deals: DealCard[];
  value: number;
  movingId: string | null;
  onMove: (deal: DealCard, colId: string) => void;
}) {
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
        {value > 0 && (
          <span className="shrink-0 text-[10.5px] font-medium tabular text-muted-foreground">
            {formatMoney(value)}
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

        <div className="mt-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium",
              TAG_CLASS[deal.tag],
            )}
          >
            {TAG_LABEL[deal.tag]}
          </span>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-semibold tabular text-foreground">
            {deal.value ? formatMoney(deal.value) : "—"}
          </span>
          <span className="text-[10.5px] text-muted-foreground tabular">
            {formatAge(deal.ageDays)}
          </span>
        </div>
      </div>
    </div>
  );
}
