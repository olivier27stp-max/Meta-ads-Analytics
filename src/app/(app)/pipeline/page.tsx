"use client";

import * as React from "react";
import {
  GitBranch,
  RefreshCw,
  ArrowRight,
  GripVertical,
} from "lucide-react";
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
  displayName,
  type LeadRow,
} from "@/lib/leads-client";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { LeadStage } from "@/types";

/**
 * Pipeline D2D — 5-column board. Each column maps one or more canonical
 * LeadStage values from Postgres. Moving a card writes the column's primary
 * stage and (if Pixel+Token are configured) fires the mapped Meta CAPI event.
 */
interface Column {
  id: string;
  label: string;
  stages: LeadStage[];
  primary: LeadStage;
  dot: string; // tailwind color class on the dot
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

type TempTone = "danger" | "info" | "muted";
interface LeadTag {
  label: string;
  tone: TempTone;
}

function deriveTag(lead: LeadRow): LeadTag {
  const ageDays =
    (Date.now() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  if (lead.stage === "demo_booked" || lead.stage === "demo_attended") {
    return { label: "Follow-up", tone: "info" };
  }
  if ((lead.stage === "lead" || lead.stage === "mql") && ageDays < 3) {
    return { label: "Hot", tone: "danger" };
  }
  return { label: "Pending", tone: "muted" };
}

function formatDaysShort(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

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
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: target } : l)));
    const res = await updateLeadStage(leadId, target);
    setMovingId(null);
    if (!res.ok) await refresh();
  };

  const totalDeals = leads.length;
  const totalValue = leads.reduce((a, l) => a + (l.value ?? 0), 0);

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

      {loading ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-16 text-center text-sm text-muted-foreground shadow-card">
          Chargement…
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <GitBranch className="h-4 w-4" />
          </div>
          <h3 className="mt-3 text-sm font-semibold">Aucun lead pour le moment</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Dès qu&apos;un formulaire est soumis sur ta landing (ou depuis
            Settings → Attribution → Run simulation), il apparaîtra dans
            &ldquo;New Lead&rdquo;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
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
  return (
    <section className="flex min-h-[480px] flex-col gap-2 rounded-2xl border border-border bg-muted/20 p-3">
      <header className="flex items-center justify-between gap-2 px-1 pt-1">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn("h-2 w-2 shrink-0 rounded-full", column.dot)}
            aria-hidden
          />
          <span className="truncate text-[13px] font-semibold text-foreground">
            {column.label}
          </span>
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold tabular text-muted-foreground">
            {leads.length}
          </span>
        </div>
        {value > 0 && (
          <span className="shrink-0 text-[11px] font-medium tabular text-muted-foreground">
            {formatMoney(value)}
          </span>
        )}
      </header>

      {leads.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8 text-[12px] text-muted-foreground">
          Aucun deal
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
  const tag = deriveTag(lead);
  const tagTone =
    tag.tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-600"
      : tag.tone === "info"
        ? "border-blue-200 bg-blue-50 text-blue-600"
        : "border-border bg-muted/60 text-muted-foreground";
  return (
    <div
      className={cn(
        "group flex gap-2 rounded-xl border border-border bg-surface p-3 shadow-card transition-opacity",
        moving && "opacity-60",
      )}
    >
      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-muted-foreground/60" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-[13px] font-semibold text-foreground">
            {displayName(lead)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-ring group-hover:opacity-100">
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
        <div className="mt-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium",
              tagTone,
            )}
          >
            {tag.label}
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-semibold tabular text-foreground">
            {lead.value ? formatMoney(lead.value) : "—"}
          </span>
          <span className="text-[10.5px] text-muted-foreground tabular">
            {formatDaysShort(lead.updated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
