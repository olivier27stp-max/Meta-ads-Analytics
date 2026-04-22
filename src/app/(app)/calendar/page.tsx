"use client";

import * as React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clapperboard,
  Rocket,
  Video,
  Users2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type EventKind = "launch" | "shoot" | "meeting" | "edit";
const EVENT_META: Record<EventKind, { label: string; icon: React.ElementType; tone: string; bg: string; border: string }> = {
  launch: {
    label: "Launch",
    icon: Rocket,
    tone: "text-success",
    bg: "bg-success-soft/70",
    border: "border-success/30",
  },
  shoot: {
    label: "Shoot",
    icon: Clapperboard,
    tone: "text-warning",
    bg: "bg-warning-soft/70",
    border: "border-warning/30",
  },
  meeting: {
    label: "Meeting",
    icon: Users2,
    tone: "text-info",
    bg: "bg-info-soft/70",
    border: "border-info/25",
  },
  edit: {
    label: "Edit",
    icon: Video,
    tone: "text-foreground",
    bg: "bg-muted/60",
    border: "border-border",
  },
};

interface CalendarEvent {
  id: string;
  dateIso: string; // YYYY-MM-DD
  kind: EventKind;
  title: string;
  description?: string;
}

function offsetDate(base: Date, days: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function seedEvents(today: Date): CalendarEvent[] {
  return [
    {
      id: "e1",
      dateIso: offsetDate(today, 1),
      kind: "launch",
      title: "Prospecting | US | Broad — new UGC batch",
      description: "Push 3 fresh UGC cuts to TOF set. Budget bump +20%.",
    },
    {
      id: "e2",
      dateIso: offsetDate(today, 3),
      kind: "shoot",
      title: "Founder POV · 45s direct testimonial",
      description: "Studio booked 10am. Script v3 finalized.",
    },
    {
      id: "e3",
      dateIso: offsetDate(today, 4),
      kind: "meeting",
      title: "Weekly creative review",
      description: "Go through Kill/Scale board + iterate on top 3.",
    },
    {
      id: "e4",
      dateIso: offsetDate(today, 7),
      kind: "edit",
      title: "Before/After edit — Skincare hero angle",
      description: "Two cuts: 15s and 30s. Subtitle-only variant.",
    },
    {
      id: "e5",
      dateIso: offsetDate(today, 10),
      kind: "launch",
      title: "Retargeting | 30D PV — price-objection cut",
      description: "Counter-narrative hook variant. Test against control for 7d.",
    },
    {
      id: "e6",
      dateIso: offsetDate(today, -2),
      kind: "meeting",
      title: "Kickoff — MOF funnel refresh",
      description: "Scope the mid-funnel creative push with the ops team.",
    },
  ];
}

export default function CalendarPage() {
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [viewDate, setViewDate] = React.useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const events = React.useMemo(() => seedEvents(today), [today]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first week index (0-6), where 0 = Mon
  const rawDow = firstDay.getDay(); // 0 Sun .. 6 Sat
  const startPad = (rawDow + 6) % 7;

  const cells: Array<{ dateIso: string | null; day: number | null; isToday: boolean }> = [];
  for (let i = 0; i < startPad; i++) cells.push({ dateIso: null, day: null, isToday: false });
  const todayIso = today.toISOString().slice(0, 10);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(year, month, d).toISOString().slice(0, 10);
    cells.push({ dateIso: iso, day: d, isToday: iso === todayIso });
  }
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push({ dateIso: null, day: null, isToday: false });

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      if (!map.has(e.dateIso)) map.set(e.dateIso, []);
      map.get(e.dateIso)!.push(e);
    }
    return map;
  }, [events]);

  const [selectedIso, setSelectedIso] = React.useState<string | null>(todayIso);
  const selectedEvents = selectedIso ? (eventsByDate.get(selectedIso) ?? []) : [];

  const monthLabel = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const goPrev = () => setViewDate(new Date(year, month - 1, 1));
  const goNext = () => setViewDate(new Date(year, month + 1, 1));
  const goToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendrier"
        description="Plan creative shoots, ad launches, team reviews. Same workspace, shared with your sales calendar."
        actions={
          <Button variant="primary" size="md" disabled>
            <Plus />
            New event
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/5">
                <CalendarDays className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-[15px] font-semibold tabular tracking-tight">
                {monthLabel}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={goToday}>
                Today
              </Button>
              <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={goPrev}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-7 border-b border-border bg-muted/20 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-2 py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((c, i) => {
              const dayEvents = c.dateIso ? (eventsByDate.get(c.dateIso) ?? []) : [];
              const selected = c.dateIso && c.dateIso === selectedIso;
              const colStart = i % 7;
              const rowStart = Math.floor(i / 7);
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => c.dateIso && setSelectedIso(c.dateIso)}
                  disabled={!c.dateIso}
                  className={cn(
                    "flex min-h-[96px] flex-col gap-1 border-b border-l border-border p-1.5 text-left transition-colors focus-ring",
                    colStart === 0 && "border-l-0",
                    rowStart === Math.floor((cells.length - 1) / 7) && "border-b-0",
                    selected && "bg-muted/70",
                    !selected && c.dateIso && "hover:bg-muted/40",
                    !c.dateIso && "bg-muted/10",
                  )}
                >
                  {c.day && (
                    <>
                      <span
                        className={cn(
                          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] tabular",
                          c.isToday
                            ? "bg-foreground text-background font-semibold"
                            : "text-muted-foreground",
                        )}
                      >
                        {c.day}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {dayEvents.slice(0, 3).map((e) => {
                          const m = EVENT_META[e.kind];
                          return (
                            <span
                              key={e.id}
                              className={cn(
                                "line-clamp-1 rounded-md border px-1.5 py-0.5 text-[10.5px]",
                                m.bg,
                                m.border,
                                m.tone,
                              )}
                            >
                              {e.title}
                            </span>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{dayEvents.length - 3} more
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h3 className="text-[14px] font-semibold">
                  {selectedIso
                    ? new Date(selectedIso).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })
                    : "Pick a day"}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {selectedEvents.length} event{selectedEvents.length === 1 ? "" : "s"}
                </p>
              </div>
            </header>
            <div className="flex flex-col gap-2 p-4">
              {selectedEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-[12.5px] text-muted-foreground">
                  No events on this day.
                </div>
              ) : (
                selectedEvents.map((e) => {
                  const m = EVENT_META[e.kind];
                  const Icon = m.icon;
                  return (
                    <div
                      key={e.id}
                      className={cn(
                        "flex flex-col gap-1 rounded-xl border px-3 py-2.5",
                        m.bg,
                        m.border,
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-3.5 w-3.5", m.tone)} />
                        <Badge tone="muted" size="sm">
                          {m.label}
                        </Badge>
                      </div>
                      <div className="text-[13px] font-semibold text-foreground">
                        {e.title}
                      </div>
                      {e.description && (
                        <div className="text-[11.5px] leading-relaxed text-muted-foreground">
                          {e.description}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-dashed border-border bg-muted/10 p-4">
            <h3 className="text-[13px] font-semibold">Heads up</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              Calendar is scaffolded with sample events for UX review. Real event
              creation + CRM sync (HubSpot / Close / Pipedrive stage changes → auto-added)
              ship once you wire your CRM webhook.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
