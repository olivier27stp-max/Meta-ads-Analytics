"use client";

import Link from "next/link";
import { Activity, Sparkles } from "lucide-react";
import { TopTabs } from "./TopTabs";
import { UserMenu } from "./UserMenu";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-6 lg:px-8">
        <Link href="/accounts" className="flex items-center gap-2.5 focus-ring rounded-md">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold tracking-tight">
              Meta Ads Creative Analytics
            </span>
            <span className="text-[11px] text-muted-foreground">
              Workspace · Creative Intelligence
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-[11px] text-muted-foreground md:flex">
            <Sparkles className="h-3 w-3" />
            <span>AI classifier online</span>
            <span className="mx-1 h-1 w-1 rounded-full bg-success" />
          </div>
          <UserMenu />
        </div>
      </div>
      <TopTabs />
    </header>
  );
}
