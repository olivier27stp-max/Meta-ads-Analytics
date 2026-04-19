"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, LayoutGrid, Settings2, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/accounts", label: "Accounts", icon: Users2 },
  { href: "/creatives", label: "Creatives", icon: LayoutGrid },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings2 },
] as const;

export function TopTabs() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-[1440px] items-center gap-1 px-6 lg:px-8">
      <div className="flex items-center gap-0.5 pb-0">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative inline-flex h-10 items-center gap-1.5 border-b-2 px-3 text-[13px] font-medium transition-colors focus-ring",
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
