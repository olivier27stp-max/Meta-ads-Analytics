"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/auth/session-context";

function initials(name: string, email: string): string {
  const n = name?.trim() || email;
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function UserMenu() {
  const user = useSession();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const logout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full border border-border bg-surface pl-1 pr-2 text-[12px] font-medium transition-colors hover:bg-muted/60 focus-ring">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/5 text-[10px] font-semibold">
          {initials(user.displayName, user.email)}
        </span>
        <span className="hidden max-w-[120px] truncate text-foreground md:inline">
          {user.displayName}
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <div className="truncate text-[13px] font-medium">{user.displayName}</div>
          <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
          <div className="mt-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Workspace · {user.workspaceId.slice(0, 10)}…
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserIcon className="h-3.5 w-3.5" />
          Profile (coming soon)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={logout} disabled={loggingOut}>
          <LogOut className="h-3.5 w-3.5" />
          {loggingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
