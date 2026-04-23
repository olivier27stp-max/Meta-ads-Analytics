"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutGrid,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Users2,
  BarChart3,
  FileText,
  Settings2,
  Sparkles,
  ContactRound,
  PhoneCall,
  GitBranch,
} from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";

const META_ADS_ITEMS = [
  { href: "/accounts", label: "Accounts", icon: Users2 },
  { href: "/creatives", label: "Creatives", icon: LayoutGrid },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings2 },
] as const;

const META_ADS_PATHS = META_ADS_ITEMS.map((i) => i.href);

export function Sidebar() {
  const pathname = usePathname() || "";
  const isMetaAds = META_ADS_PATHS.some((p) => pathname.startsWith(p));
  const [metaExpanded, setMetaExpanded] = React.useState(isMetaAds);

  React.useEffect(() => {
    if (isMetaAds) setMetaExpanded(true);
  }, [isMetaAds]);

  return (
    <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col border-r border-border bg-surface/80 backdrop-blur">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Activity className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold tracking-tight">
            Entiore
          </span>
          <span className="text-[10.5px] text-muted-foreground">
            Sales Dashboard
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          Workspace
        </div>

        {/* Meta Ads Analytics — expandable */}
        <div className="mb-1">
          <button
            type="button"
            onClick={() => setMetaExpanded((v) => !v)}
            className={cn(
              "group flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors focus-ring",
              isMetaAds
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <LayoutGrid className="h-3.5 w-3.5" />
              Meta Ads Analytics
            </span>
            {metaExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 opacity-70" />
            )}
          </button>

          {metaExpanded && (
            <div className="mt-1 flex flex-col gap-0.5 pl-3">
              {META_ADS_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors focus-ring",
                      active
                        ? "bg-foreground/5 text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Sales flow */}
        <div className="mt-3 px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          Sales
        </div>
        <TopLink href="/pipeline" icon={GitBranch} label="Pipeline" pathname={pathname} />
        <TopLink href="/leads" icon={ContactRound} label="Leads" pathname={pathname} />
        <TopLink
          href="/calls"
          icon={PhoneCall}
          label="Call recordings"
          pathname={pathname}
        />

        {/* Planning */}
        <div className="mt-3 px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          Planning
        </div>
        <TopLink href="/calendar" icon={CalendarDays} label="Calendrier" pathname={pathname} />
      </nav>

      {/* Footer: AI status + user menu */}
      <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-[10.5px] text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>AI classifier online</span>
          <span className="ml-auto h-1 w-1 rounded-full bg-success" />
        </div>
        <UserMenu />
      </div>
    </aside>
  );
}

function TopLink({
  href,
  icon: Icon,
  label,
  pathname,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  pathname: string;
}) {
  const active = pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors focus-ring",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
