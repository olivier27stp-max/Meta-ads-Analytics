"use client";

import * as React from "react";
import { Copy, Check, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AutomationCard({
  title,
  description,
  status,
  icon,
  children,
  footer,
}: {
  title: string;
  description?: string;
  status?: "connected" | "pending" | "disconnected" | "error";
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-start gap-2.5">
          {icon && (
            <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-foreground/5 text-muted-foreground">
              {icon}
            </span>
          )}
          <div>
            <h2 className="text-[14.5px] font-semibold tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {status && <StatusBadge status={status} />}
      </header>
      <div className="px-5 py-5">{children}</div>
      {footer && (
        <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-5 py-3">
          {footer}
        </footer>
      )}
    </section>
  );
}

export function StatusBadge({
  status,
}: {
  status: "connected" | "pending" | "disconnected" | "error";
}) {
  const config: Record<
    string,
    { label: string; bg: string; border: string; text: string }
  > = {
    connected: {
      label: "Connected",
      bg: "bg-success-soft",
      border: "border-success/30",
      text: "text-success",
    },
    pending: {
      label: "Pending",
      bg: "bg-warning-soft",
      border: "border-warning/30",
      text: "text-warning",
    },
    disconnected: {
      label: "Not connected",
      bg: "bg-muted/60",
      border: "border-border",
      text: "text-muted-foreground",
    },
    error: {
      label: "Error",
      bg: "bg-danger-soft",
      border: "border-danger/30",
      text: "text-danger",
    },
  };
  const { label, bg, border, text } = config[status]!;
  const Icon =
    status === "connected"
      ? CheckCircle2
      : status === "error"
        ? XCircle
        : status === "pending"
          ? AlertTriangle
          : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold",
        border,
        bg,
        text,
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}

export function CopyRow({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "mt-0.5 truncate text-[12px] text-foreground",
            mono && "font-mono",
          )}
        >
          {value}
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={copy}>
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export function SnippetBlock({
  title,
  description,
  language,
  snippet,
}: {
  title: string;
  description?: string;
  language?: string;
  snippet: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div>
          <div className="text-[12.5px] font-semibold">{title}</div>
          {description && (
            <div className="text-[11px] text-muted-foreground">{description}</div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto px-3 py-2 font-mono text-[11.5px] leading-relaxed text-foreground">
        {snippet}
      </pre>
      {language && (
        <div className="border-t border-border/60 px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {language}
        </div>
      )}
    </div>
  );
}

export function Banner({
  tone,
  children,
}: {
  tone: "info" | "warning" | "success" | "danger";
  children: React.ReactNode;
}) {
  const cls: Record<string, string> = {
    info: "border-info/25 bg-info-soft text-info",
    warning: "border-warning/30 bg-warning-soft text-warning",
    success: "border-success/30 bg-success-soft text-success",
    danger: "border-danger/30 bg-danger-soft text-danger",
  };
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-[12.5px]",
        cls[tone],
      )}
    >
      {children}
    </div>
  );
}
