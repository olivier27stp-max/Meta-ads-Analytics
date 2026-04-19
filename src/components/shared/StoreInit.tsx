"use client";

import * as React from "react";
import { useStore } from "@/lib/store";
import { useSession } from "@/lib/auth/session-context";

export function StoreInit() {
  const session = useSession();
  const initialized = useStore((s) => s.initialized);

  React.useEffect(() => {
    // Seeding runs after rehydrate; if this workspace has no saved state,
    // initialized stays false and we drop in the demo data set.
    if (!initialized) {
      useStore.getState().initIfNeeded();
    }
  }, [initialized, session.workspaceId]);

  return null;
}
