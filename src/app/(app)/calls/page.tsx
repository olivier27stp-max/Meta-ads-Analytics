"use client";

import * as React from "react";
import {
  PhoneCall,
  Play,
  Mic,
  Clock,
  Sparkles,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard, KpiStrip } from "@/components/kpi/KpiCard";
import { useSession } from "@/lib/auth/session-context";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";

type CallOutcome =
  | "meeting_booked"
  | "followup"
  | "closed_won"
  | "closed_lost"
  | "no_show";

type CallSentiment = "positive" | "neutral" | "negative";

type CallStage =
  | "discovery"
  | "demo"
  | "technical"
  | "negotiation"
  | "close"
  | "lost";

interface CallRecording {
  id: string;
  provider: "aircall" | "gong" | "fathom" | "otter" | "tldv" | "zoom";
  leadName: string;
  leadEmail: string;
  company: string;
  occurredAt: string; // ISO
  durationSec: number;
  stage: CallStage;
  outcome: CallOutcome;
  sentiment: CallSentiment;
  summary: string;
  keyPoints: string[];
}

const OUTCOME_LABEL: Record<CallOutcome, string> = {
  meeting_booked: "Meeting booked",
  followup: "Follow-up",
  closed_won: "Closed-won",
  closed_lost: "Closed-lost",
  no_show: "No-show",
};

const OUTCOME_TONE: Record<CallOutcome, "success" | "warning" | "danger" | "muted" | "info"> = {
  meeting_booked: "info",
  followup: "warning",
  closed_won: "success",
  closed_lost: "danger",
  no_show: "muted",
};

const STAGE_LABEL: Record<CallStage, string> = {
  discovery: "Discovery",
  demo: "Demo",
  technical: "Technical",
  negotiation: "Negotiation",
  close: "Close",
  lost: "Lost",
};

const PROVIDER_LABEL: Record<CallRecording["provider"], string> = {
  aircall: "Aircall",
  gong: "Gong",
  fathom: "Fathom",
  otter: "Otter.ai",
  tldv: "tl;dv",
  zoom: "Zoom",
};

const INTEGRATIONS: Array<{
  id: CallRecording["provider"];
  name: string;
  hint: string;
}> = [
  { id: "gong", name: "Gong", hint: "Enterprise call intelligence" },
  { id: "fathom", name: "Fathom", hint: "Free AI meeting notes" },
  { id: "aircall", name: "Aircall", hint: "Cloud phone" },
  { id: "otter", name: "Otter.ai", hint: "Transcription + summaries" },
  { id: "tldv", name: "tl;dv", hint: "Zoom/Meet recorder + summaries" },
  { id: "zoom", name: "Zoom", hint: "Native cloud recordings" },
];

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
      stage: "demo",
      outcome: "meeting_booked",
      sentiment: "positive",
      summary:
        "Strong demo reception. Lead engaged on custom-audience workflow, asked sharp questions about Meta CAPI attribution latency. Next step: proposal call with CFO Thursday.",
      keyPoints: [
        "Budget confirmed: $40k–$80k annual",
        "Decision timeline: within 3 weeks",
        "Technical stakeholder needs SOC2 doc",
      ],
    },
    {
      id: "c2",
      provider: "gong",
      leadName: "Marcus Whitford",
      leadEmail: "marcus@summit-supps.co",
      company: "Summit Supplements",
      occurredAt: daysAgoIso(1, 10),
      durationSec: 48 * 60 + 2,
      stage: "discovery",
      outcome: "followup",
      sentiment: "neutral",
      summary:
        "Discovery reveals unclear ownership of ad spend decisions — Marcus runs ops but CMO signs off. Creative pipeline is stuck on video turnaround (2 weeks/cut). Pain is real, but buying signal soft.",
      keyPoints: [
        "Current tool: spreadsheets + Ads Manager",
        "Blocker: internal creative team bandwidth",
        "Re-engage in 2 weeks with case study",
      ],
    },
    {
      id: "c3",
      provider: "tldv",
      leadName: "Priya Kaur",
      leadEmail: "priya@mornthreads.com",
      company: "Mornthreads Apparel",
      occurredAt: daysAgoIso(2, 15),
      durationSec: 21 * 60 + 45,
      stage: "close",
      outcome: "closed_won",
      sentiment: "positive",
      summary:
        "Contract signed on the call. Priya wants full onboarding next week including team training. Asked for a case study she can show her board.",
      keyPoints: [
        "ACV: $36,000 / annual",
        "Kickoff: Monday Apr 28",
        "Expansion likely in Q3",
      ],
    },
    {
      id: "c4",
      provider: "otter",
      leadName: "Diego Alvarez",
      leadEmail: "diego@kinetic.coffee",
      company: "Kinetic Coffee Co.",
      occurredAt: daysAgoIso(3, 11),
      durationSec: 14 * 60 + 30,
      stage: "technical",
      outcome: "followup",
      sentiment: "neutral",
      summary:
        "Technical questions around Supabase RLS + the CAPI secret rotation policy. Diego is thorough — wants architecture diagram before exec-level meeting.",
      keyPoints: [
        "Asked for RLS policy docs",
        "Wants SSO (SAML) roadmap",
        "Next step: architecture session with solution eng",
      ],
    },
    {
      id: "c5",
      provider: "zoom",
      leadName: "Tanya Brooks",
      leadEmail: "tanya@halocraft.com",
      company: "Halocraft Tools",
      occurredAt: daysAgoIso(4, 9),
      durationSec: 18 * 60 + 6,
      stage: "negotiation",
      outcome: "closed_lost",
      sentiment: "negative",
      summary:
        "Price was the blocker — competitor came in at 60% of our rate. Tanya was honest: the feature set matters but procurement wouldn't approve the delta. Worth reconnecting post-renewal.",
      keyPoints: [
        "Lost to Triplebar",
        "Procurement cap: $15k/year",
        "Revisit in 9 months when they renew",
      ],
    },
    {
      id: "c6",
      provider: "fathom",
      leadName: "Jordan Lin",
      leadEmail: "jordan@luxebeauty.io",
      company: "Luxe Beauty",
      occurredAt: daysAgoIso(5, 16),
      durationSec: 11 * 60 + 12,
      stage: "discovery",
      outcome: "no_show",
      sentiment: "neutral",
      summary:
        "Jordan didn't join. Auto-scheduled re-invite sent. Calendar tool shows the invite was accepted last Wednesday — likely schedule conflict.",
      keyPoints: [
        "Re-booked for next Thursday 10am",
        "Slack ping before the call",
      ],
    },
  ];
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

export default function CallsPage() {
  // Scaffold data — replace with a real Supabase table + integration ingest
  // when a provider is connected.
  const calls = React.useMemo(seedCalls, []);
  const [outcomeFilter, setOutcomeFilter] = React.useState<"all" | CallOutcome>("all");
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(calls[0]?.id ?? null);
  const session = useSession();
  void session;

  const filtered = calls.filter((c) => {
    if (outcomeFilter !== "all" && c.outcome !== outcomeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !c.leadName.toLowerCase().includes(q) &&
        !c.leadEmail.toLowerCase().includes(q) &&
        !c.company.toLowerCase().includes(q) &&
        !c.summary.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const selectedCall = calls.find((c) => c.id === selected) ?? null;

  const totalDur = calls.reduce((a, c) => a + c.durationSec, 0);
  const won = calls.filter((c) => c.outcome === "closed_won").length;
  const meetingsBooked = calls.filter((c) => c.outcome === "meeting_booked").length;
  const positive = calls.filter((c) => c.sentiment === "positive").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Call recordings"
        description="AI-transcribed sales calls, surfaced by stage and sentiment. Wire Gong / Fathom / Aircall to auto-ingest."
        actions={
          <Button variant="secondary" size="md" disabled>
            <Mic />
            Connect provider
          </Button>
        }
      />

      <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-2 text-[12.5px] text-warning">
        <Sparkles className="h-3.5 w-3.5" />
        <span>
          <span className="font-semibold">Scaffold mode.</span> Sample calls shown
          below are placeholders. Connect an integration to auto-ingest real
          transcripts + summaries.
        </span>
      </div>

      <KpiStrip>
        <KpiCard
          label="Calls"
          value={calls.length.toString()}
          hint={`${meetingsBooked} booked · ${won} won`}
          icon={<PhoneCall className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Talk time"
          value={formatDuration(totalDur)}
          hint="Total across shown calls"
          icon={<Clock className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Positive sentiment"
          value={calls.length > 0 ? `${Math.round((positive / calls.length) * 100)}%` : "—"}
          hint={`${positive}/${calls.length} calls`}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Closed-won"
          value={won.toString()}
          hint="Deals closed on a call"
          icon={<Sparkles className="h-3.5 w-3.5" />}
        />
      </KpiStrip>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-2.5 shadow-card">
        <Select
          value={outcomeFilter}
          onValueChange={(v) => setOutcomeFilter(v as typeof outcomeFilter)}
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            {Object.entries(OUTCOME_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search lead, company, summary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-[280px] pl-8"
          />
        </div>
        {(outcomeFilter !== "all" || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOutcomeFilter("all");
              setSearch("");
            }}
          >
            <X />
            Reset
          </Button>
        )}
        <span className="ml-auto text-[11.5px] text-muted-foreground tabular">
          {filtered.length} / {calls.length} calls
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* List */}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <ul className="divide-y divide-border">
            {filtered.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "group cursor-pointer px-5 py-3.5 transition-colors hover:bg-muted/40",
                  selected === c.id && "bg-muted/40",
                )}
                onClick={() => setSelected(c.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13.5px] font-semibold text-foreground">
                        {c.leadName}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        · {c.company}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                      {c.summary}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone={OUTCOME_TONE[c.outcome]} size="sm">
                        {OUTCOME_LABEL[c.outcome]}
                      </Badge>
                      <Badge tone="muted" size="sm">
                        {STAGE_LABEL[c.stage]}
                      </Badge>
                      <SentimentBadge sentiment={c.sentiment} />
                      <span className="text-[10.5px] text-muted-foreground">
                        · {PROVIDER_LABEL[c.provider]}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right text-[11px] tabular text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {formatDuration(c.durationSec)}
                    </span>
                    <span>{formatRelative(c.occurredAt)}</span>
                    <Button variant="ghost" size="sm" className="mt-1" disabled>
                      <Play />
                      Play
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Detail + integrations */}
        <aside className="flex flex-col gap-4">
          {selectedCall ? (
            <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[14px] font-semibold">
                    {selectedCall.leadName}
                  </h3>
                  <p className="truncate text-[11.5px] text-muted-foreground">
                    {selectedCall.company} · {selectedCall.leadEmail}
                  </p>
                </div>
                <SentimentBadge sentiment={selectedCall.sentiment} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge tone={OUTCOME_TONE[selectedCall.outcome]} size="sm">
                  {OUTCOME_LABEL[selectedCall.outcome]}
                </Badge>
                <Badge tone="muted" size="sm">
                  {STAGE_LABEL[selectedCall.stage]}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {PROVIDER_LABEL[selectedCall.provider]} · {formatDuration(selectedCall.durationSec)}
                </span>
              </div>

              <div className="mt-4">
                <h4 className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  AI summary
                </h4>
                <p className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-[12.5px] leading-relaxed text-foreground">
                  {selectedCall.summary}
                </p>
              </div>

              <div className="mt-3">
                <h4 className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Key points
                </h4>
                <ul className="flex flex-col gap-1">
                  {selectedCall.keyPoints.map((p, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[12.5px]"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/60" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <h3 className="text-[13px] font-semibold">Connect a provider</h3>
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              Auto-ingest transcripts + summaries when a call ends.
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
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
        </aside>
      </div>
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: CallSentiment }) {
  const map = {
    positive: { label: "Positive", tone: "success" as const, icon: TrendingUp },
    neutral: { label: "Neutral", tone: "muted" as const, icon: Minus },
    negative: { label: "Negative", tone: "danger" as const, icon: TrendingDown },
  };
  const { label, tone, icon: Icon } = map[sentiment];
  return (
    <Badge tone={tone} size="sm">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
