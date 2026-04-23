"use client";

import * as React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Users2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/* --------------------------------------------------------------------------
 * Team members — each user has a distinct solid opaque color applied to
 * EVERY appointment they own. Tailwind utility maps kept here so the swatch
 * + chip + cell share the exact same color.
 * ------------------------------------------------------------------------ */

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  /** Solid background class (500 tier). */
  bg: string;
  /** Dot / swatch background — same hue. */
  dot: string;
  /** Text color when shown on white surface. */
  text: string;
}

const TEAM: TeamMember[] = [
  { id: "olivier", name: "Olivier",  initials: "OS", bg: "bg-indigo-500",  dot: "bg-indigo-500",  text: "text-indigo-600" },
  { id: "sarah",   name: "Sarah",    initials: "SB", bg: "bg-rose-500",    dot: "bg-rose-500",    text: "text-rose-600" },
  { id: "marcus",  name: "Marcus",   initials: "MK", bg: "bg-emerald-500", dot: "bg-emerald-500", text: "text-emerald-600" },
  { id: "priya",   name: "Priya",    initials: "PK", bg: "bg-amber-500",   dot: "bg-amber-500",   text: "text-amber-600" },
  { id: "diego",   name: "Diego",    initials: "DA", bg: "bg-violet-500",  dot: "bg-violet-500",  text: "text-violet-600" },
  { id: "tanya",   name: "Tanya",    initials: "TB", bg: "bg-sky-500",     dot: "bg-sky-500",     text: "text-sky-600" },
];

const TEAM_BY_ID = new Map(TEAM.map((m) => [m.id, m]));

/* --------------------------------------------------------------------------
 * Events — seeded so the calendar isn't empty on first view. Each event
 * is owned by one team member and inherits that member's color.
 * ------------------------------------------------------------------------ */

type EventKind = "meeting" | "call" | "task" | "launch";
const KIND_LABEL: Record<EventKind, string> = {
  meeting: "Meeting",
  call: "Call",
  task: "Task",
  launch: "Launch",
};

interface CalendarEvent {
  id: string;
  dateIso: string; // YYYY-MM-DD
  hour: string; // "10:00"
  title: string;
  kind: EventKind;
  ownerId: string;
  description?: string;
}

function offsetDate(base: Date, days: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function seedEvents(today: Date): CalendarEvent[] {
  return [
    { id: "e1",  dateIso: offsetDate(today, 0),  hour: "09:30", title: "Weekly pipeline review", kind: "meeting", ownerId: "olivier", description: "Go through every deal in Must Recall." },
    { id: "e2",  dateIso: offsetDate(today, 0),  hour: "14:00", title: "Call — Nova Skin",       kind: "call",    ownerId: "sarah",   description: "Quote follow-up with Sarah as SDR." },
    { id: "e3",  dateIso: offsetDate(today, 1),  hour: "11:00", title: "Discovery — Summit",     kind: "call",    ownerId: "marcus",  description: "First intro call with CMO." },
    { id: "e4",  dateIso: offsetDate(today, 2),  hour: "10:00", title: "Demo — Mornthreads",     kind: "meeting", ownerId: "priya",   description: "Full product walkthrough." },
    { id: "e5",  dateIso: offsetDate(today, 2),  hour: "15:30", title: "Creative shoot",         kind: "launch",  ownerId: "olivier", description: "Studio booked. Founder POV scripts ready." },
    { id: "e6",  dateIso: offsetDate(today, 3),  hour: "09:00", title: "Quote sent follow-up",   kind: "task",    ownerId: "sarah" },
    { id: "e7",  dateIso: offsetDate(today, 4),  hour: "10:30", title: "Closing call",           kind: "call",    ownerId: "priya",   description: "Proposal → contract." },
    { id: "e8",  dateIso: offsetDate(today, 5),  hour: "13:00", title: "Ad batch launch",        kind: "launch",  ownerId: "diego" },
    { id: "e9",  dateIso: offsetDate(today, 6),  hour: "11:00", title: "Team standup",           kind: "meeting", ownerId: "olivier" },
    { id: "e10", dateIso: offsetDate(today, 7),  hour: "14:30", title: "Call — Halocraft",       kind: "call",    ownerId: "tanya" },
    { id: "e11", dateIso: offsetDate(today, 9),  hour: "10:00", title: "Demo — Luxe Beauty",     kind: "meeting", ownerId: "marcus" },
    { id: "e12", dateIso: offsetDate(today, 10), hour: "16:00", title: "Renewal push",           kind: "task",    ownerId: "sarah" },
    { id: "e13", dateIso: offsetDate(today, -1), hour: "10:00", title: "Kickoff",                kind: "meeting", ownerId: "olivier" },
    { id: "e14", dateIso: offsetDate(today, -3), hour: "09:00", title: "Shoot recap",            kind: "task",    ownerId: "diego" },
    { id: "e15", dateIso: offsetDate(today, 11), hour: "14:00", title: "QBR",                    kind: "meeting", ownerId: "olivier" },
  ];
}

/* --------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------ */

export default function CalendarPage() {
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [viewDate, setViewDate] = React.useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const events = React.useMemo(() => seedEvents(today), [today]);

  // Multi-select of team members. Default: everyone visible.
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(
    () => new Set(TEAM.map((m) => m.id)),
  );
  const toggleUser = (id: string) =>
    setActiveUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = activeUsers.size === TEAM.length;

  const filtered = React.useMemo(
    () => events.filter((e) => activeUsers.has(e.ownerId)),
    [events, activeUsers],
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rawDow = firstDay.getDay();
  const startPad = (rawDow + 6) % 7; // Monday-first

  const todayIso = today.toISOString().slice(0, 10);
  const cells: Array<{ dateIso: string | null; day: number | null; isToday: boolean }> = [];
  for (let i = 0; i < startPad; i++) cells.push({ dateIso: null, day: null, isToday: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(year, month, d).toISOString().slice(0, 10);
    cells.push({ dateIso: iso, day: d, isToday: iso === todayIso });
  }
  while (cells.length % 7 !== 0) cells.push({ dateIso: null, day: null, isToday: false });

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of filtered) {
      if (!map.has(e.dateIso)) map.set(e.dateIso, []);
      map.get(e.dateIso)!.push(e);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.hour.localeCompare(b.hour));
    }
    return map;
  }, [filtered]);

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
        description={`${filtered.length} rendez-vous ce mois · ${activeUsers.size}/${TEAM.length} users visibles`}
        actions={
          <Button variant="primary" size="md" disabled>
            <Plus />
            New event
          </Button>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        {/* Toolbar: month + users + nav */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/5">
              <CalendarDays className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-[15px] font-semibold tracking-tight">
              {monthLabel}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <UserFilter
              activeUsers={activeUsers}
              onToggle={toggleUser}
              onAll={() => setActiveUsers(new Set(TEAM.map((m) => m.id)))}
              onNone={() => setActiveUsers(new Set())}
              allSelected={allSelected}
            />
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

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/20 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-3 py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {cells.map((c, i) => {
            const dayEvents = c.dateIso ? (eventsByDate.get(c.dateIso) ?? []) : [];
            const selected = c.dateIso && c.dateIso === selectedIso;
            const colStart = i % 7;
            const rowCount = cells.length / 7;
            const rowStart = Math.floor(i / 7);
            return (
              <button
                type="button"
                key={i}
                onClick={() => c.dateIso && setSelectedIso(c.dateIso)}
                disabled={!c.dateIso}
                className={cn(
                  "flex min-h-[140px] flex-col gap-1 border-b border-l border-border p-2 text-left transition-colors focus-ring",
                  colStart === 0 && "border-l-0",
                  rowStart === rowCount - 1 && "border-b-0",
                  selected && "bg-muted/60",
                  !selected && c.dateIso && "hover:bg-muted/30",
                  !c.dateIso && "bg-muted/10",
                )}
              >
                {c.day && (
                  <>
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] tabular",
                        c.isToday
                          ? "bg-foreground text-background font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      {c.day}
                    </span>
                    <div className="flex flex-col gap-1">
                      {dayEvents.slice(0, 4).map((e) => {
                        const m = TEAM_BY_ID.get(e.ownerId);
                        return (
                          <span
                            key={e.id}
                            className="flex flex-col overflow-hidden rounded-md border border-foreground/80 bg-surface text-[10.5px] font-medium text-foreground"
                            title={`${e.hour} · ${e.title} · ${m?.name ?? ""}`}
                          >
                            {/* Colored bar at the top */}
                            <span
                              className={cn(
                                "block h-1 w-full",
                                m?.bg ?? "bg-slate-500",
                              )}
                              aria-hidden
                            />
                            <span className="flex min-w-0 items-center gap-1 px-1.5 py-0.5">
                              <span className="tabular text-muted-foreground">
                                {e.hour}
                              </span>
                              <span className="truncate">{e.title}</span>
                            </span>
                          </span>
                        );
                      })}
                      {dayEvents.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{dayEvents.length - 4} more
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

      {/* Selected day detail — below the calendar so the calendar gets max width */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div>
            <h3 className="text-[14px] font-semibold">
              {selectedIso
                ? new Date(selectedIso).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Pick a day"}
            </h3>
            <p className="text-[11.5px] text-muted-foreground">
              {selectedEvents.length} rendez-vous
              {selectedEvents.length > 0 &&
                ` · ${new Set(selectedEvents.map((e) => e.ownerId)).size} user${new Set(selectedEvents.map((e) => e.ownerId)).size === 1 ? "" : "s"}`}
            </p>
          </div>
        </header>
        <div className="p-5">
          {selectedEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-10 text-center text-[12.5px] text-muted-foreground">
              Aucun rendez-vous prévu.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {selectedEvents.map((e) => {
                const m = TEAM_BY_ID.get(e.ownerId);
                return (
                  <li
                    key={e.id}
                    className={cn(
                      "flex gap-3 rounded-xl border border-border bg-surface p-3 shadow-card",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-white",
                        m?.bg ?? "bg-slate-500",
                      )}
                    >
                      {m?.initials ?? "—"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold text-foreground">
                          {e.title}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">{e.hour}</span>
                        <span>·</span>
                        <span>{m?.name ?? "—"}</span>
                        <Badge tone="muted" size="sm">
                          {KIND_LABEL[e.kind]}
                        </Badge>
                      </div>
                      {e.description && (
                        <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
                          {e.description}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * User filter — multi-select dropdown with a colored swatch per user.
 * ------------------------------------------------------------------------ */

function UserFilter({
  activeUsers,
  onToggle,
  onAll,
  onNone,
  allSelected,
}: {
  activeUsers: Set<string>;
  onToggle: (id: string) => void;
  onAll: () => void;
  onNone: () => void;
  allSelected: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-[12.5px] font-medium transition-colors hover:bg-muted/60 focus-ring">
        <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span>
          {allSelected
            ? "All users"
            : activeUsers.size === 0
              ? "No users"
              : `${activeUsers.size} user${activeUsers.size === 1 ? "" : "s"}`}
        </span>
        <div className="flex -space-x-1">
          {TEAM.filter((m) => activeUsers.has(m.id))
            .slice(0, 4)
            .map((m) => (
              <span
                key={m.id}
                className={cn(
                  "h-4 w-4 rounded-full ring-2 ring-surface",
                  m.bg,
                )}
              />
            ))}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-1">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Team members</DropdownMenuLabel>
          <div className="flex gap-1 text-[11px]">
            <button
              type="button"
              onClick={onAll}
              className="rounded px-1.5 py-0.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              All
            </button>
            <button
              type="button"
              onClick={onNone}
              className="rounded px-1.5 py-0.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              None
            </button>
          </div>
        </div>
        <DropdownMenuSeparator />
        {TEAM.map((m) => {
          const active = activeUsers.has(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onToggle(m.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-foreground transition-colors hover:bg-muted"
            >
              <span className={cn("h-3 w-3 shrink-0 rounded-full", m.bg)} />
              <span className="flex-1 text-left">{m.name}</span>
              {active && <Check className="h-3.5 w-3.5 text-foreground" />}
            </button>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
