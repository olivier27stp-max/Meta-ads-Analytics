"use client";

import * as React from "react";
import { Plus, RefreshCw, Trash2, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { formatDate, formatPercent, formatRoas, formatRelative } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";

export function ReportsTable() {
  const reports = useStore((s) => s.reports);
  const accounts = useStore((s) => s.accounts);
  const regenerate = useStore((s) => s.regenerateReport);
  const deleteReport = useStore((s) => s.deleteReport);
  const createReport = useStore((s) => s.createReport);
  const [open, setOpen] = React.useState(false);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [accountId, setAccountId] = React.useState<string>(accounts[0]?.id ?? "");

  React.useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !accountId) return;
    createReport({ name, accountId });
    setName("");
    setOpen(false);
  };

  const opened = openId ? reports.find((r) => r.id === openId) : null;

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-4 w-4" />}
        title="No reports yet"
        description="Generate your first creative performance report for any connected account."
        action={
          <Button variant="primary" size="md" onClick={() => setOpen(true)}>
            <Plus />
            Generate report
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="primary" size="md">
              <Plus />
              Generate report
            </Button>
          </DialogTrigger>
          <DialogContent size="md">
            <DialogHeader>
              <DialogTitle>Generate creative report</DialogTitle>
              <DialogDescription>
                Summarize winners, losers, top categories and recommended iterations for a chosen scope.
              </DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-4 px-6 pb-2" onSubmit={handleCreate}>
              <div className="flex flex-col gap-1.5">
                <Label>Report name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Weekly creative review"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Account</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </form>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCreate}>
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-[15px] font-semibold">Reports</h2>
            <p className="text-xs text-muted-foreground">
              {reports.length} total · {reports.filter((r) => r.status === "ready").length} ready
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Report</th>
                <th className="px-5 py-2.5 font-medium">Account</th>
                <th className="px-5 py-2.5 font-medium">Date range</th>
                <th className="px-5 py-2.5 font-medium">Generated</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr
                  key={r.id}
                  className={`group transition-colors hover:bg-muted/40 ${i !== reports.length - 1 ? "border-b border-border" : ""}`}
                >
                  <td className="px-5 py-3.5">
                    <button
                      className="text-left font-medium text-foreground hover:underline"
                      onClick={() => setOpenId(r.id)}
                    >
                      {r.name}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{r.accountName}</td>
                  <td className="px-5 py-3.5 text-muted-foreground tabular">
                    {formatDate(r.dateRange.start)} → {formatDate(r.dateRange.end)}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground tabular">
                    {formatRelative(r.generatedAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    {r.status === "ready" && <Badge tone="success">Ready</Badge>}
                    {r.status === "generating" && <Badge tone="warning">Generating…</Badge>}
                    {r.status === "failed" && <Badge tone="danger">Failed</Badge>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setOpenId(r.id)}>
                        Open
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => regenerate(r.id)}
                        disabled={r.status === "generating"}
                      >
                        <RefreshCw className={r.status === "generating" ? "animate-spin" : ""} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteReport(r.id)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={Boolean(opened)} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent size="lg">
          {opened && (
            <div className="flex flex-col gap-3 p-6">
              <DialogHeader className="p-0">
                <DialogTitle>{opened.name}</DialogTitle>
                <DialogDescription>
                  {opened.accountName} · {formatDate(opened.dateRange.start)} → {formatDate(opened.dateRange.end)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <SummaryTile label="Creatives" value={opened.summary.totalCreatives.toString()} />
                <SummaryTile label="Winners" value={opened.summary.winners.toString()} />
                <SummaryTile label="Win rate" value={formatPercent(opened.summary.winRate, 1)} />
                <SummaryTile label="Blended ROAS" value={formatRoas(opened.summary.blendedRoas)} />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-3">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Top asset type
                  </div>
                  <div className="mt-1 text-[15px] font-semibold">
                    {opened.summary.topAssetType}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-3">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Top messaging angle
                  </div>
                  <div className="mt-1 text-[15px] font-semibold">
                    {opened.summary.topMessagingAngle}
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Key iterations
                </div>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {opened.summary.keyIterations.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No iterations captured.</span>
                  ) : (
                    opened.summary.keyIterations.map((it, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px]">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/60" />
                        <span>{it}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="secondary">
                  <Download />
                  Export JSON
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-[20px] font-semibold tabular">{value}</div>
    </div>
  );
}
