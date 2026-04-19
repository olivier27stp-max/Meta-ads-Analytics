"use client";

import type { StateStorage } from "zustand/middleware";
import { getBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Zustand persist storage adapter backed by `public.workspaces.state_json`.
 *
 * Every read/write resolves to a single row keyed by `auth.uid()`. RLS in
 * Postgres guarantees that the signed-in user only sees their own row — no
 * workspace id bookkeeping is needed on the client.
 */
export const supabaseStorage: StateStorage = {
  async getItem(_name) {
    try {
      const supabase = getBrowserSupabase();
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return null;

      const { data, error } = await supabase
        .from("workspaces")
        .select("state_json")
        .eq("id", userRes.user.id)
        .maybeSingle();

      if (error) {
        console.warn("[supabase-storage] getItem error", error.message);
        return null;
      }
      const value = data?.state_json as Record<string, unknown> | null | undefined;
      // Empty object (fresh workspace row auto-provisioned by the trigger) or
      // no row at all → signal "no persisted state" to zustand's persist.
      // Combined with resetToEmpty() in hydrateStoreForCurrentSession, this
      // guarantees new users start from clean defaults.
      if (!value || typeof value !== "object" || Object.keys(value).length === 0) {
        return null;
      }
      return JSON.stringify(value);
    } catch (err) {
      console.warn("[supabase-storage] getItem threw", err);
      return null;
    }
  },

  async setItem(_name, value) {
    try {
      const supabase = getBrowserSupabase();
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return;

      let stateJson: unknown;
      try {
        stateJson = JSON.parse(value);
      } catch {
        stateJson = value;
      }

      // Upsert rather than update — defends against edge cases where the
      // auto-provisioning trigger didn't fire (e.g. user created outside
      // the registration flow). RLS still enforces id = auth.uid().
      const { error } = await supabase
        .from("workspaces")
        .upsert(
          { id: userRes.user.id, state_json: stateJson as object },
          { onConflict: "id" },
        );
      if (error) console.warn("[supabase-storage] setItem error", error.message);
    } catch (err) {
      console.warn("[supabase-storage] setItem threw", err);
    }
  },

  async removeItem(_name) {
    try {
      const supabase = getBrowserSupabase();
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return;
      const { error } = await supabase
        .from("workspaces")
        .update({ state_json: {} })
        .eq("id", userRes.user.id);
      if (error) console.warn("[supabase-storage] removeItem error", error.message);
    } catch (err) {
      console.warn("[supabase-storage] removeItem threw", err);
    }
  },
};
