"use client";

import * as React from "react";
import { hydrateStoreForCurrentSession } from "@/lib/store";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  workspaceId: string;
  createdAt: string;
}

const Ctx = React.createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await hydrateStoreForCurrentSession();
      } catch (err) {
        // Don't block the UI if rehydration fails — the store keeps its
        // in-memory defaults and the next mutation will create the workspace
        // row via upsert.
        console.warn("[session] hydrate failed", err);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }
  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}

export function useSession(): SessionUser {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useSession must be used inside SessionProvider");
  return v;
}

export function useOptionalSession(): SessionUser | null {
  return React.useContext(Ctx);
}
