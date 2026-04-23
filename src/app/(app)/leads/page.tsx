"use client";

import * as React from "react";
import {
  ContactRound,
  RefreshCw,
  Search,
  X,
  CheckCircle2,
  Flame,
  Target,
  TrendingUp,
  Link as LinkIcon,
  ExternalLink,
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { KpiCard, KpiStrip } from "@/components/kpi/KpiCard";
import {
  fetchLeads,
  updateLeadStage,
  displayName,
  leadSource,
  PIPELINE_STAGES,
  STAGE_LABEL,
  STAGE_TONE,
  ACTIVE_STAGES,
  type LeadRow,
} from "@/lib/leads-client";
import { formatMoney, formatRelative, formatDate, formatInt } from "@/lib/utils";
import type { LeadStage } from "@/types";

export default function LeadsPage() {
  const [leads, setLeads] = React.useState<LeadRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [stageFilter, setStageFilter] = React.useState<"all" | LeadStage>("all");
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const rows = await fetchLeads();
    setLeads(rows);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (q) {
        const hay = [
          l.email,
          l.first_name,
          l.last_name,
          l.company,
          l.utm_campaign,
          l.utm_content,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, stageFilter, search]);

  const total = leads.length;
  const active = leads.filter((l) => (ACTIVE_STAGES as string[]).includes(l.stage)).length;
  const won = leads.filter((l) => l.stage === "closed_won").length;
  const pipelineValue = leads
    .filter((l) => (ACTIVE_STAGES as string[]).includes(l.stage))
    .reduce((acc, l) => acc + (l.value ?? 0), 0);
  const wonValue = leads
    .filter((l) => l.stage === "closed_won")
    .reduce((acc, l) => acc + (l.value ?? 0), 0);
  const resolvable = leads.filter(
    (l) => l.stage === "closed_won" || l.stage === "closed_lost",
  ).length;
  const winRate = resolvable > 0 ? won / resolvable : 0;

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leads"
        description="Every form submission captured from your landing. Attribution + pipeline state in one view."
        actions={
          <Button variant="secondary" size="md" onClick={refresh} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      <KpiStrip>
        <KpiCard
          label="Total leads"
          value={formatInt(total)}
          hint={total > 0 ? `${won} won · ${active} active` : "Waiting for first capture"}
          icon={<ContactRound className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Active pipeline"
          value={formatInt(active)}
          hint={active > 0 ? formatMoney(pipelineValue) : "—"}
          icon={<Target className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Closed-won"
          value={formatInt(won)}
          hint={won > 0 ? formatMoney(wonValue) : "—"}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Win rate"
          value={resolvable > 0 ? `${(winRate * 100).toFixed(1)}%` : "—"}
          hint={resolvable > 0 ? `${won}/${resolvable} resolved` : "No resolved leads"}
          icon={<Flame className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Pipeline value"
          value={formatMoney(pipelineValue + wonValue)}
          hint="Active + won totals"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
      </KpiStrip>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-2.5 shadow-card">
        <Select
          value={stageFilter}
          onValueChange={(v) => setStageFilter(v as typeof stageFilter)}
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search email, company, campaign"
            className="h-9 w-[280px] pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(stageFilter !== "all" || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStageFilter("all");
              setSearch("");
            }}
          >
            <X />
            Reset
          </Button>
        )}
        <span className="ml-auto text-[11.5px] text-muted-foreground tabular">
          {formatInt(filtered.length)} / {formatInt(leads.length)} leads
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-14 text-center text-sm text-muted-foreground">
              Loading leads…
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ContactRound className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold">No leads captured yet</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Drop the <code className="font-mono text-[11px]">mca-tracker.js</code> on
                your landing and connect the lead capture endpoint (see Settings →
                Attribution) to start pulling leads here.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-muted-foreground">
              No leads match your filters.
            </div>
          ) : (
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Lead</th>
                  <th className="px-5 py-2.5 font-medium">Stage</th>
                  <th className="px-5 py-2.5 text-right font-medium">Value</th>
                  <th className="px-5 py-2.5 font-medium">Source</th>
                  <th className="px-5 py-2.5 font-medium">Signal</th>
                  <th className="px-5 py-2.5 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className={`cursor-pointer transition-colors hover:bg-muted/40 ${i !== filtered.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <td className="max-w-[280px] px-5 py-3">
                      <div className="flex flex-col">
                        <span className="truncate font-medium text-foreground">
                          {displayName(l)}
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {l.company ?? l.email ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={STAGE_TONE[l.stage]}>
                        {STAGE_LABEL[l.stage]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right tabular">
                      {l.value ? formatMoney(l.value) : "—"}
                    </td>
                    <td className="max-w-[220px] px-5 py-3 text-[12px] text-muted-foreground">
                      <span className="truncate">{leadSource(l) ?? "—"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {l.fbclid && (
                          <Badge tone="info" size="sm">
                            fbclid
                          </Badge>
                        )}
                        {l.fbp && (
                          <Badge tone="muted" size="sm">
                            fbp
                          </Badge>
                        )}
                        {!l.fbclid && !l.fbp && (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground tabular">
                      {formatRelative(l.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <LeadDetailModal
        lead={selected}
        onClose={() => setSelectedId(null)}
        onStageChanged={async () => {
          await refresh();
        }}
      />
    </div>
  );
}

function LeadDetailModal({
  lead,
  onClose,
  onStageChanged,
}: {
  lead: LeadRow | null;
  onClose: () => void;
  onStageChanged: () => Promise<void>;
}) {
  const [saving, setSaving] = React.useState(false);
  const open = Boolean(lead);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        {lead && (
          <div className="flex flex-col">
            <div className="flex flex-col gap-1 border-b border-border px-6 pb-4 pt-6">
              <DialogDescription className="text-[11px] uppercase tracking-wide">
                {lead.company ?? "Lead"}
              </DialogDescription>
              <DialogTitle className="text-[17px]">{displayName(lead)}</DialogTitle>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                {lead.email && <span className="font-mono">{lead.email}</span>}
                {lead.phone && (
                  <>
                    <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
                    <span className="font-mono">{lead.phone}</span>
                  </>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone={STAGE_TONE[lead.stage]}>{STAGE_LABEL[lead.stage]}</Badge>
                {lead.value && (
                  <span className="text-[13px] font-semibold tabular text-foreground">
                    {formatMoney(lead.value)}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
              {/* Attribution */}
              <section>
                <h4 className="section-title mb-2.5">Attribution</h4>
                <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/20 px-3 py-3 text-[12.5px]">
                  <AttrRow label="Campaign" value={lead.utm_campaign} />
                  <AttrRow label="Creative / Content" value={lead.utm_content} />
                  <AttrRow label="Source" value={lead.utm_source} />
                  <AttrRow label="Medium" value={lead.utm_medium} />
                  <AttrRow label="Term" value={lead.utm_term} />
                  <AttrRow label="fbclid" value={lead.fbclid} mono />
                  <AttrRow label="fbc" value={lead.fbc} mono />
                  <AttrRow label="fbp" value={lead.fbp} mono />
                  <AttrRow label="Landing" value={lead.landing_url} mono />
                  <AttrRow label="Referrer" value={lead.referrer} mono />
                </div>
              </section>

              {/* Pipeline state */}
              <section>
                <h4 className="section-title mb-2.5">Pipeline</h4>
                <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">External id</span>
                    <span className="font-mono text-[11px]">
                      {lead.external_id ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="tabular">{formatDate(lead.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Updated</span>
                    <span className="tabular">{formatRelative(lead.updated_at)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/70 pt-2">
                    <span className="text-muted-foreground">Move to</span>
                    <Select
                      value={lead.stage}
                      onValueChange={async (v) => {
                        if (v === lead.stage) return;
                        setSaving(true);
                        await updateLeadStage(lead.id, v as LeadStage);
                        setSaving(false);
                        await onStageChanged();
                      }}
                    >
                      <SelectTrigger className="h-8 w-[180px] text-[12.5px]" disabled={saving}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PIPELINE_STAGES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STAGE_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {lead.landing_url && (
                  <Button variant="secondary" size="sm" className="mt-2.5" asChild>
                    <a href={lead.landing_url} target="_blank" rel="noreferrer">
                      <LinkIcon />
                      Open landing
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                )}
              </section>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AttrRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={`flex-1 truncate text-right ${mono ? "font-mono text-[11.5px]" : "text-[12.5px]"} ${
          value ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}
