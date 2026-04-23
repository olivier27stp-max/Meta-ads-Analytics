"use client";

import * as React from "react";
import {
  PhoneCall,
  Sparkles,
  ExternalLink,
  Search,
  X,
  Play,
  Clock,
  Plus,
  Trash2,
  Check,
  ContactRound,
  ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/auth/session-context";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { LeadStage } from "@/types";
import { fetchLeads, displayName as leadDisplayName, type LeadRow } from "@/lib/leads-client";

/* --------------------------------------------------------------------------
 * Pipeline stage label + color (same 5 columns as the Pipeline page)
 * ------------------------------------------------------------------------ */

const PIPELINE_COLUMN: Record<
  LeadStage,
  {
    label: string;
    bg: string;
    text: string;
  }
> = {
  lead: { label: "New Lead", bg: "bg-blue-500", text: "text-white" },
  mql: { label: "New Lead", bg: "bg-blue-500", text: "text-white" },
  demo_booked: { label: "Must Recall", bg: "bg-orange-500", text: "text-white" },
  demo_attended: { label: "Must Recall", bg: "bg-orange-500", text: "text-white" },
  proposal: { label: "Quote Sent", bg: "bg-slate-500", text: "text-white" },
  closed_won: { label: "Closed Won", bg: "bg-emerald-500", text: "text-white" },
  closed_lost: { label: "Closed Lost", bg: "bg-rose-500", text: "text-white" },
};

const PIPELINE_STAGE_OPTIONS: Array<{ value: LeadStage; label: string }> = [
  { value: "lead", label: "New Lead" },
  { value: "demo_booked", label: "Must Recall" },
  { value: "proposal", label: "Quote Sent" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

/* --------------------------------------------------------------------------
 * Types + seed
 * ------------------------------------------------------------------------ */

type Provider = "aircall" | "gong" | "fathom" | "otter" | "tldv" | "zoom" | "manual";

const PROVIDER_LABEL: Record<Provider, string> = {
  aircall: "Aircall",
  gong: "Gong",
  fathom: "Fathom",
  otter: "Otter.ai",
  tldv: "tl;dv",
  zoom: "Zoom",
  manual: "Manuel",
};

interface CallRecording {
  id: string;
  provider: Provider;
  leadId: string | null;
  leadName: string;
  leadEmail: string;
  company: string;
  occurredAt: string;
  durationSec: number;
  pipelineStage: LeadStage;
  summary: string;
  isManual?: boolean;
}

function daysAgoIso(days: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function seedCalls(): CallRecording[] {
  return [
    {
      id: "c1",
      provider: "fathom",
      leadName: "Sarah Chen",
      leadEmail: "sarah@novaskin.com",
      company: "Nova Skin",
      occurredAt: daysAgoIso(0, 14),
      durationSec: 32 * 60 + 14,
      leadId: null,
      pipelineStage: "demo_booked",
      summary:
        "Strong demo reception. Lead engaged on custom-audience workflow. Next step: proposal call with CFO Thursday.",
    },
    {
      id: "c2",
      provider: "gong",
      leadName: "Marcus Whitford",
      leadEmail: "marcus@summit-supps.co",
      company: "Summit Supplements",
      occurredAt: daysAgoIso(1, 10),
      durationSec: 48 * 60 + 2,
      leadId: null,
      pipelineStage: "mql",
      summary:
        "Discovery reveals unclear ownership of ad spend decisions. Re-engage in 2 weeks with case study.",
    },
    {
      id: "c3",
      provider: "tldv",
      leadName: "Priya Kaur",
      leadEmail: "priya@mornthreads.com",
      company: "Mornthreads Apparel",
      occurredAt: daysAgoIso(2, 15),
      durationSec: 21 * 60 + 45,
      leadId: null,
      pipelineStage: "closed_won",
      summary: "Contract signed on the call. Kickoff Monday. ACV $36k/annual.",
    },
    {
      id: "c4",
      provider: "otter",
      leadName: "Diego Alvarez",
      leadEmail: "diego@kinetic.coffee",
      company: "Kinetic Coffee Co.",
      occurredAt: daysAgoIso(3, 11),
      durationSec: 14 * 60 + 30,
      leadId: null,
      pipelineStage: "proposal",
      summary:
        "Technical questions around Supabase RLS + CAPI rotation. Wants architecture diagram before exec meeting.",
    },
    {
      id: "c5",
      provider: "zoom",
      leadName: "Tanya Brooks",
      leadEmail: "tanya@halocraft.com",
      company: "Halocraft Tools",
      occurredAt: daysAgoIso(4, 9),
      durationSec: 18 * 60 + 6,
      leadId: null,
      pipelineStage: "closed_lost",
      summary: "Lost to competitor on price. Worth reconnecting post-renewal in 9 months.",
    },
    {
      id: "c6",
      provider: "fathom",
      leadName: "Jordan Lin",
      leadEmail: "jordan@luxebeauty.io",
      company: "Luxe Beauty",
      occurredAt: daysAgoIso(5, 16),
      durationSec: 11 * 60 + 12,
      leadId: null,
      pipelineStage: "demo_attended",
      summary: "No-show. Re-booked for next Thursday 10am. Slack ping before the call.",
    },
    {
      id: "c7",
      provider: "gong",
      leadName: "Élodie Moreau",
      leadEmail: "elodie@moreau-group.fr",
      company: "Moreau Group",
      occurredAt: daysAgoIso(6, 13),
      durationSec: 26 * 60,
      leadId: null,
      pipelineStage: "lead",
      summary: "First inbound. Referred by a customer. Quick intro.",
    },
    {
      id: "c8",
      provider: "fathom",
      leadName: "Ben Hale",
      leadEmail: "ben@halestudios.co",
      company: "Hale Studios",
      occurredAt: daysAgoIso(7, 10),
      durationSec: 34 * 60,
      leadId: null,
      pipelineStage: "proposal",
      summary: "Quote sent yesterday. Awaiting sign-off from co-founder.",
    },
  ];
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Short timestamp for the tile: "Aujourd'hui · 14:32", "Hier · 10:00",
 * "18 avr. · 14:32". French locale.
 */
function formatCallTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const time = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (d >= todayStart) return `Aujourd'hui · ${time}`;
  if (d >= yesterdayStart) return `Hier · ${time}`;
  const datePart = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
  return `${datePart} · ${time}`;
}

/** "2026-04-22T14:30" format compatible with <input type=datetime-local>. */
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* --------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------ */

const INTEGRATIONS: Array<{ id: Provider; name: string; hint: string }> = [
  { id: "gong", name: "Gong", hint: "Enterprise call intelligence" },
  { id: "fathom", name: "Fathom", hint: "Free AI meeting notes" },
  { id: "aircall", name: "Aircall", hint: "Cloud phone" },
  { id: "otter", name: "Otter.ai", hint: "Transcription + summaries" },
  { id: "tldv", name: "tl;dv", hint: "Zoom/Meet recorder" },
  { id: "zoom", name: "Zoom", hint: "Native cloud recordings" },
];

const MANUAL_STORAGE_KEY = "mca-manual-calls-v1";

export default function CallsPage() {
  const session = useSession();
  const seed = React.useMemo(seedCalls, []);
  const [manualCalls, setManualCalls] = React.useState<CallRecording[]>([]);
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);

  // Load manual calls from localStorage, scoped by workspace id so users
  // can't see each other's manual entries even on shared devices.
  const storageKey = `${MANUAL_STORAGE_KEY}::${session.workspaceId}`;
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CallRecording[];
        if (Array.isArray(parsed)) setManualCalls(parsed);
      }
    } catch {}
  }, [storageKey]);

  const persistManual = React.useCallback(
    (next: CallRecording[]) => {
      setManualCalls(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    },
    [storageKey],
  );

  const allCalls = React.useMemo(
    () =>
      [...manualCalls, ...seed].sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      ),
    [manualCalls, seed],
  );

  const filtered = allCalls.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !c.leadName.toLowerCase().includes(q) &&
        !c.company.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const selected = allCalls.find((c) => c.id === selectedId) ?? null;

  const addCall = (input: CallRecording) => {
    persistManual([input, ...manualCalls]);
  };

  const removeManual = (id: string) => {
    persistManual(manualCalls.filter((c) => c.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Call recordings"
        description={`${allCalls.length} appel${allCalls.length === 1 ? "" : "s"} · ${manualCalls.length} manuel${manualCalls.length === 1 ? "" : "s"} · cliquer pour voir les détails`}
        actions={
          <AddCallDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            onSubmit={(c) => {
              addCall(c);
              setAddOpen(false);
            }}
          />
        }
      />

      <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning-soft px-3.5 py-2 text-[12.5px] text-warning">
        <Sparkles className="h-3.5 w-3.5" />
        <span>
          <span className="font-semibold">Scaffold mode.</span> Les 8 échantillons viennent du seed. Tes appels manuels sont sauvés localement dans ce navigateur (en attente d&apos;une table Supabase dédiée).
        </span>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface p-2.5 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un lead ou une entreprise"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-[320px] pl-8"
          />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
            <X />
            Reset
          </Button>
        )}
        <span className="ml-auto text-[11.5px] text-muted-foreground tabular">
          {filtered.length} / {allCalls.length}
        </span>
      </div>

      {/* Grid of square call boxes */}
      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface/60 px-6 py-14 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <PhoneCall className="h-4 w-4" />
          </div>
          <p className="mt-3 text-[13px] text-muted-foreground">
            Aucun appel ne correspond à cette recherche.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((c) => (
            <CallBox key={c.id} call={c} onOpen={() => setSelectedId(c.id)} />
          ))}
        </div>
      )}

      {/* Connect provider */}
      <section className="rounded-md border border-border bg-surface p-5 shadow-card">
        <h3 className="text-[14px] font-semibold">Connect a provider</h3>
        <p className="mt-1 text-[11.5px] text-muted-foreground">
          Auto-ingest transcripts + summaries when a call ends.
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {INTEGRATIONS.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-[12.5px]"
            >
              <div className="min-w-0">
                <div className="font-semibold">{i.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {i.hint}
                </div>
              </div>
              <Button variant="ghost" size="sm" disabled>
                <ExternalLink />
                Connect
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <CallDetailModal
        call={selected}
        onClose={() => setSelectedId(null)}
        onDelete={
          selected?.isManual
            ? () => {
                removeManual(selected.id);
                setSelectedId(null);
              }
            : undefined
        }
      />
    </div>
  );
}

function CallBox({
  call,
  onOpen,
}: {
  call: CallRecording;
  onOpen: () => void;
}) {
  const stage = PIPELINE_COLUMN[call.pipelineStage];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex aspect-square flex-col gap-2 rounded-md border border-border bg-surface p-3 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-pop focus-ring"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-[11px] font-semibold text-foreground">
          {initials(call.leadName)}
        </span>
        {call.isManual ? (
          <span className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            Manuel
          </span>
        ) : (
          <PhoneCall className="h-3 w-3 text-muted-foreground/60" />
        )}
      </div>
      <div className="flex-1 min-h-0">
        <div className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground">
          {call.leadName}
        </div>
        <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
          {call.company}
        </div>
      </div>
      {/* Time */}
      <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span className="truncate">{formatCallTime(call.occurredAt)}</span>
      </div>
      {/* Pipeline stage */}
      <span
        className={cn(
          "mt-auto inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold",
          stage.bg,
          stage.text,
        )}
      >
        {stage.label}
      </span>
    </button>
  );
}

function CallDetailModal({
  call,
  onClose,
  onDelete,
}: {
  call: CallRecording | null;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const stage = call ? PIPELINE_COLUMN[call.pipelineStage] : null;
  return (
    <Dialog open={Boolean(call)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        {call && stage && (
          <div className="flex flex-col">
            <div className="flex flex-col gap-1.5 border-b border-border px-6 pb-4 pt-6">
              <DialogDescription className="text-[11px] uppercase tracking-wide">
                {call.company}
              </DialogDescription>
              <DialogTitle className="text-[17px]">{call.leadName}</DialogTitle>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted-foreground">
                {call.leadEmail && (
                  <>
                    <span className="font-mono">{call.leadEmail}</span>
                    <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
                  </>
                )}
                <span>{PROVIDER_LABEL[call.provider]}</span>
                <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(call.durationSec)}
                </span>
                <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
                <span>{formatCallTime(call.occurredAt)}</span>
                <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
                <span>{formatRelative(call.occurredAt)}</span>
              </div>
              <div className="mt-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold",
                    stage.bg,
                    stage.text,
                  )}
                >
                  {stage.label}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-4 p-6">
              <section>
                <h4 className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {call.isManual ? "Notes" : "AI summary"}
                </h4>
                <p className="rounded-md border border-border bg-muted/20 px-3 py-3 text-[13px] leading-relaxed text-foreground">
                  {call.summary || "(aucune note)"}
                </p>
              </section>
              <div className="flex items-center justify-between gap-2">
                {onDelete ? (
                  <Button variant="ghost" size="sm" onClick={onDelete}>
                    <Trash2 />
                    Supprimer
                  </Button>
                ) : (
                  <span />
                )}
                <Button variant="secondary" size="md" disabled>
                  <Play />
                  Play recording
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddCallDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (c: CallRecording) => void;
}) {
  const [leads, setLeads] = React.useState<LeadRow[] | null>(null);
  const [loadingLeads, setLoadingLeads] = React.useState(false);
  const [selectedLead, setSelectedLead] = React.useState<LeadRow | null>(null);
  const [datetime, setDatetime] = React.useState(() => toDatetimeLocal(new Date()));
  const [durationMin, setDurationMin] = React.useState<number>(15);
  const [stage, setStage] = React.useState<LeadStage>("demo_booked");
  const [summary, setSummary] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [pickerOpen, setPickerOpen] = React.useState(false);

  // Load leads when the dialog opens (or when it reopens)
  React.useEffect(() => {
    if (!open) return;
    setLoadingLeads(true);
    void (async () => {
      const rows = await fetchLeads();
      setLeads(rows);
      setLoadingLeads(false);
    })();
  }, [open]);

  const reset = () => {
    setSelectedLead(null);
    setDatetime(toDatetimeLocal(new Date()));
    setDurationMin(15);
    setStage("demo_booked");
    setSummary("");
    setSearch("");
    setPickerOpen(false);
  };

  // When a lead is picked, default the stage to their current pipeline stage.
  React.useEffect(() => {
    if (selectedLead) {
      setStage(selectedLead.stage);
    }
  }, [selectedLead]);

  const filteredLeads = React.useMemo(() => {
    if (!leads) return [];
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) => {
      const hay = [
        l.email,
        l.first_name,
        l.last_name,
        l.company,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [leads, search]);

  const submit = () => {
    if (!selectedLead) return;
    const occurredAt = datetime
      ? new Date(datetime).toISOString()
      : new Date().toISOString();
    onSubmit({
      id: `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      provider: "manual",
      leadId: selectedLead.id,
      leadName: leadDisplayName(selectedLead),
      company: selectedLead.company ?? "",
      leadEmail: selectedLead.email ?? "",
      occurredAt,
      durationSec: Math.max(0, Math.round(durationMin * 60)),
      pipelineStage: stage,
      summary: summary.trim(),
      isManual: true,
    });
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="primary" size="md">
          <Plus />
          Ajouter un appel
        </Button>
      </DialogTrigger>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Ajouter un appel manuellement</DialogTitle>
          <DialogDescription>
            Sélectionne un lead existant, puis précise la date, la durée et
            les notes. Le nom, l&apos;entreprise et l&apos;email du lead sont
            repris automatiquement.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3 px-6 pb-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {/* Lead picker */}
          <div className="flex flex-col gap-1.5">
            <Label>Lead</Label>
            {selectedLead ? (
              <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/5 text-[10.5px] font-semibold">
                  {initials(leadDisplayName(selectedLead))}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-[13px] font-semibold">
                    {leadDisplayName(selectedLead)}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {[selectedLead.company, selectedLead.email]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedLead(null);
                    setPickerOpen(true);
                  }}
                >
                  Changer
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 rounded-md border border-border bg-surface">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus={pickerOpen}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un lead (email, nom, entreprise)…"
                    className="h-9 rounded-b-none border-0 border-b border-border pl-8"
                  />
                </div>
                <div className="max-h-[220px] overflow-y-auto">
                  {loadingLeads ? (
                    <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                      Chargement des leads…
                    </div>
                  ) : filteredLeads.length === 0 ? (
                    <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                      {leads?.length === 0
                        ? "Aucun lead dans ta Supabase — crée-en un d'abord (page Leads → Ajouter un lead)."
                        : "Aucun lead ne correspond à cette recherche."}
                    </div>
                  ) : (
                    <ul className="flex flex-col p-1">
                      {filteredLeads.map((l) => {
                        const name = leadDisplayName(l);
                        const subtitle = [l.company, l.email]
                          .filter(Boolean)
                          .join(" · ");
                        const colorMeta = PIPELINE_COLUMN[l.stage];
                        return (
                          <li key={l.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLead(l);
                                setPickerOpen(false);
                              }}
                              className="group flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/5 text-[10.5px] font-semibold">
                                {initials(name)}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block truncate text-[12.5px] font-medium">
                                  {name}
                                </span>
                                {subtitle && (
                                  <span className="block truncate text-[11px] text-muted-foreground">
                                    {subtitle}
                                  </span>
                                )}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-semibold",
                                  colorMeta.bg,
                                  colorMeta.text,
                                )}
                              >
                                {colorMeta.label}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Date et heure de l&apos;appel</Label>
              <Input
                type="datetime-local"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Durée (minutes)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={durationMin}
                onChange={(e) =>
                  setDurationMin(Math.max(0, parseInt(e.target.value || "0", 10)))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Stage pipeline à l&apos;instant de l&apos;appel</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as LeadStage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[11px] text-muted-foreground">
              Par défaut : le stage actuel du lead sélectionné.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Résumé de l'appel, prochaines étapes, contexte..."
              className="min-h-[90px]"
            />
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={submit}
            disabled={!selectedLead}
          >
            <Plus />
            Ajouter l&apos;appel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
