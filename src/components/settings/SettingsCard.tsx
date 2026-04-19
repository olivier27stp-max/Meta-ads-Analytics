import * as React from "react";
import { cn } from "@/lib/utils";

export function SettingsCard({
  title,
  description,
  children,
  footer,
  className,
  icon,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-surface shadow-card",
        className,
      )}
    >
      <header className="flex flex-col gap-1 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        </div>
        {description && (
          <p className="text-[13px] text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="px-5 py-5">{children}</div>
      {footer && (
        <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-5 py-3.5">
          {footer}
        </footer>
      )}
    </section>
  );
}
