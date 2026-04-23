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
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSession } from "@/lib/auth/session-context";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { LeadStage } from "@/types";

/* --------------------------------------------------------------------------
 * Pipeline stage label + color (same 5 columns as the Pipeline page)
 * ------------------------------------------------------------------------ */

const PIPELINE_COLUMN: Record<
  LeadStage,
  {
    label: string;
    bg: string; // solid opaque pill background
    text: string; // text color on the pill
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

/* --------------------------------------------------------------------------
 * Types + seed
 * ------------------------------------------------------------------------ */

type Provider = "aircall" | "gong" | "fathom" | "otter" | "tldv" | "zoom";

const PROVIDER_LABEL: Record<Provider, string> = {
  aircall: "Aircall",
  gong: "Gong",
  fathom: "Fathom",
  otter: "Otter.ai",
  tldv: "tl;dv",
  zoom: "Zoom",
};

interface CallRecording {
  id: string;
  provider: Provider;
  leadName: string;
  leadEmail: string;
  company: string;
  occurredAt: string;
  durationSec: number;
  pipelineStage: LeadStage;
  summary: string;
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
      pipelineStage: "closed_won",
      summary:
        "Contract signed on the call. Kickoff Monday. ACV $36k/annual.",
    },
    {
      id: "c4",
      provider: "otter",
      leadName: "Diego Alvarez",
      leadEmail: "diego@kinetic.coffee",
      company: "Kinetic Coffee Co.",
      occurredAt: daysAgoIso(3, 11),
      durationSec: 14 * 60 + 30,
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
      pipelineStage: "closed_lost",
      summary:
        "Lost to competitor on price. Worth reconnecting post-renewal in 9 months.",
    },
    {
      id: "c6",
      provider: "fathom",
      leadName: "Jordan Lin",
      leadEmail: "jordan@luxebeauty.io",
      company: "Luxe Beauty",
      occurredAt: daysAgoIso(5, 16),
      durationSec: 11 * 60 + 12,
      pipelineStage: "demo_attended",
      summary:
        "No-show. Re-booked for next Thursday 10am. Slack ping before the call.",
    },
    {
      id: "c7",
      provider: "gong",
      leadName: "Élodie Moreau",
      leadEmail: "elodie@moreau-group.fr",
      company: "Moreau Group",
      occurredAt: daysAgoIso(6, 13),
      durationSec: 26 * 60,
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

export default function CallsPage() {
  const calls = React.useMemo(seedCalls, []);
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const session = useSession();
  void session;

  const filtered = calls.filter((c) => {
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

  const selected = calls.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Call recordings"
        description={`${calls.length} appel${calls.length === 1 ? "" : "s"} enregistré${calls.length === 1 ? "" : "s"} · cliquer pour voir les détails`}
      />

      <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-2 text-[12.5px] text-warning">
        <Sparkles className="h-3.5 w-3.5" />
        <span>
          <span className="font-semibold">Scaffold mode.</span> Les appels ci-dessous
          sont des échantillons. Connecte un provider pour auto-ingérer les
          vrais transcripts.
        </span>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-2.5 shadow-card">
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
          {filtered.length} / {calls.length}
        </span>
      </div>

      {/* Grid of square call boxes */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-14 text-center">
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
            <CallBox
              key={c.id}
              call={c}
              onOpen={() => setSelectedId(c.id)}
            />
          ))}
        </div>
      )}

      {/* Connect provider */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <h3 className="text-[14px] font-semibold">Connect a provider</h3>
        <p className="mt-1 text-[11.5px] text-muted-foreground">
          Auto-ingest transcripts + summaries when a call ends.
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {INTEGRATIONS.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12.5px]"
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

      {/* Detail modal */}
      <CallDetailModal call={selected} onClose={() => setSelectedId(null)} />
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
      className="group flex aspect-square flex-col gap-2 rounded-2xl border border-border bg-surface p-3 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-pop focus-ring"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-[11px] font-semibold text-foreground">
          {initials(call.leadName)}
        </span>
        <PhoneCall className="h-3 w-3 text-muted-foreground/60" />
      </div>
      <div className="flex-1 min-h-0">
        <div className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground">
          {call.leadName}
        </div>
        <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
          {call.company}
        </div>
      </div>
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
}: {
  call: CallRecording | null;
  onClose: () => void;
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
                <span className="font-mono">{call.leadEmail}</span>
                <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
                <span>{PROVIDER_LABEL[call.provider]}</span>
                <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(call.durationSec)}
                </span>
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
                  AI summary
                </h4>
                <p className="rounded-xl border border-border bg-muted/20 px-3 py-3 text-[13px] leading-relaxed text-foreground">
                  {call.summary}
                </p>
              </section>
              <div className="flex items-center justify-end">
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
