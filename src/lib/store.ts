"use client";

import * as React from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabaseStorage } from "@/lib/supabase-storage";
import type {
  Account,
  AdDeliveryFilter,
  AIStatus,
  AssetType,
  CoachingExemplar,
  Creative,
  DateRange,
  FeedbackRating,
  FunnelStage,
  GroupByKey,
  MediaType,
  MessagingAngle,
  Report,
  Settings,
  SyncSummary,
  ViewMode,
} from "@/types";
import type { SyncedCreative } from "@/lib/meta-sync";
import { mergeSyncedCreatives } from "@/lib/sync-merge";
import {
  defaultSettings,
  seedAccounts,
  seedCreatives,
  seedReports,
} from "@/lib/demo-data";
import { nowIso, uid } from "@/lib/utils";

export interface CreativesFilters {
  delivery: AdDeliveryFilter;
  groupBy: GroupByKey;
  mediaType: "all" | MediaType;
  aiStatus: "all" | AIStatus;
  assetType: "all" | AssetType;
  angle: "all" | MessagingAngle;
  funnel: "all" | FunnelStage;
  search: string;
}

export interface GlobalFilters {
  accountId: "all" | string;
  dateRange: DateRange;
}

export interface VisibleColumns {
  preview: boolean;
  name: boolean;
  spend: boolean;
  type: boolean;
  analysis: boolean;
  assetType: boolean;
  visualFormat: boolean;
  hookTactic: boolean;
  roas: boolean;
  hookRate: boolean;
  ctr: boolean;
  lpv: boolean;
}

export const DEFAULT_COLUMNS: VisibleColumns = {
  preview: true,
  name: true,
  spend: true,
  type: true,
  analysis: true,
  assetType: true,
  visualFormat: true,
  hookTactic: true,
  roas: true,
  hookRate: true,
  ctr: true,
  lpv: true,
};

export const DEFAULT_CREATIVE_FILTERS: CreativesFilters = {
  delivery: "all",
  groupBy: "none",
  mediaType: "all",
  aiStatus: "all",
  assetType: "all",
  angle: "all",
  funnel: "all",
  search: "",
};

interface StoreState {
  initialized: boolean;
  accounts: Account[];
  creatives: Creative[];
  reports: Report[];
  settings: Settings;

  global: GlobalFilters;
  filters: CreativesFilters;
  viewMode: ViewMode;
  selectedCreativeId: string | null;
  visibleColumns: VisibleColumns;

  syncingAccountIds: string[];
  reanalyzingCreativeIds: string[];
  syncingAll: boolean;
  /** Most-recent sync result per account id, for UI feedback after Fetch. */
  lastSyncSummaries: Record<string, SyncSummary>;

  batchAnalyze: {
    running: boolean;
    total: number;
    done: number;
    failed: number;
    cancelRequested: boolean;
    currentName: string | null;
  };

  coachingExemplars: CoachingExemplar[];

  initIfNeeded: () => void;
  resetDemoData: () => void;
  resetToEmpty: () => void;

  addAccount: (input: { metaAccountId: string; name: string; accessToken: string; isActive: boolean }) => void;
  removeAccount: (id: string) => void;
  syncAccount: (id: string) => Promise<void>;
  syncAll: () => Promise<void>;
  dismissSyncSummary: (accountId: string) => void;

  setGlobalAccount: (id: "all" | string) => void;
  setGlobalDateRange: (range: DateRange) => void;

  setFilters: (patch: Partial<CreativesFilters>) => void;
  resetFilters: () => void;
  toggleColumn: (key: keyof VisibleColumns) => void;
  setViewMode: (mode: ViewMode) => void;

  openCreative: (id: string | null) => void;
  reanalyzeCreative: (id: string) => Promise<void>;
  startBatchAnalyze: (ids: string[]) => Promise<void>;
  cancelBatchAnalyze: () => void;
  rateAnalysis: (id: string, rating: FeedbackRating, note?: string) => void;
  clearAnalysisRating: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;

  regenerateReport: (id: string) => Promise<void>;
  deleteReport: (id: string) => void;
  createReport: (input: { name: string; accountId: string }) => Report;
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

const BASE_STORE_KEY = "mca-store-v1";

// mergeSyncedCreatives lives in src/lib/sync-merge.ts (shared with /api/cron).

/**
 * Hydration from Supabase is triggered once the user is known (from the
 * SessionProvider in the (app) layout).
 *
 * Critically: we RESET the in-memory store to empty defaults BEFORE calling
 * rehydrate. Zustand is a module-level singleton, so after user A logs out
 * and user B logs in, A's data would otherwise persist in memory and leak
 * into B's view until B's first mutation. Resetting guarantees B starts
 * from a clean slate, and rehydrate then loads B's own state from Supabase.
 */
export async function hydrateStoreForCurrentSession(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  useStore.getState().resetToEmpty();
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  await useStore.persist.rehydrate();
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      initialized: false,
      accounts: [],
      creatives: [],
      reports: [],
      settings: defaultSettings(),

      global: { accountId: "all", dateRange: "last_30_days" },
      filters: { ...DEFAULT_CREATIVE_FILTERS },
      viewMode: "table",
      selectedCreativeId: null,
      visibleColumns: { ...DEFAULT_COLUMNS },

      syncingAccountIds: [],
      reanalyzingCreativeIds: [],
      syncingAll: false,
      lastSyncSummaries: {},

      batchAnalyze: {
        running: false,
        total: 0,
        done: 0,
        failed: 0,
        cancelRequested: false,
        currentName: null,
      },

      coachingExemplars: [],

      initIfNeeded: () => {
        if (get().initialized) return;
        const accounts = seedAccounts();
        const creatives = seedCreatives(accounts);
        const reports = seedReports(accounts);
        set({ accounts, creatives, reports, initialized: true });
      },

      resetDemoData: () => {
        const accounts = seedAccounts();
        const creatives = seedCreatives(accounts);
        const reports = seedReports(accounts);
        set({
          accounts,
          creatives,
          reports,
          settings: defaultSettings(),
          filters: { ...DEFAULT_CREATIVE_FILTERS },
          global: { accountId: "all", dateRange: "last_30_days" },
          visibleColumns: { ...DEFAULT_COLUMNS },
          viewMode: "table",
          selectedCreativeId: null,
          initialized: true,
        });
      },

      // Wipes every persisted and ephemeral slice back to empty defaults.
      // MUST run before rehydrating a different user's workspace — otherwise
      // the module-level zustand singleton would leak user A's data into user
      // B's session until B's first mutation.
      resetToEmpty: () => {
        set({
          initialized: false,
          accounts: [],
          creatives: [],
          reports: [],
          settings: defaultSettings(),
          global: { accountId: "all", dateRange: "last_30_days" },
          filters: { ...DEFAULT_CREATIVE_FILTERS },
          viewMode: "table",
          selectedCreativeId: null,
          visibleColumns: { ...DEFAULT_COLUMNS },
          syncingAccountIds: [],
          reanalyzingCreativeIds: [],
          syncingAll: false,
          lastSyncSummaries: {},
          batchAnalyze: {
            running: false,
            total: 0,
            done: 0,
            failed: 0,
            cancelRequested: false,
            currentName: null,
          },
          coachingExemplars: [],
        });
      },

      addAccount: ({ metaAccountId, name, accessToken, isActive }) => {
        const id = uid("acc");
        const account: Account = {
          id,
          metaAccountId,
          name,
          isActive,
          status: isActive ? "active" : "paused",
          lastSyncedAt: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          accessTokenMask: accessToken
            ? `${accessToken.slice(0, 4)}••••••••••••${accessToken.slice(-2)}`
            : undefined,
        };
        set({ accounts: [...get().accounts, account] });
      },

      removeAccount: (id) => {
        set({
          accounts: get().accounts.filter((a) => a.id !== id),
          creatives: get().creatives.filter((c) => c.accountId !== id),
          reports: get().reports.filter((r) => r.accountId !== id),
        });
      },

      syncAccount: async (id) => {
        const account = get().accounts.find((a) => a.id === id);
        if (!account) return;

        set({ syncingAccountIds: [...get().syncingAccountIds, id] });

        try {
          const res = await fetch(`/api/accounts/${id}/sync`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ metaAccountId: account.metaAccountId }),
          });
          const body = (await res.json()) as {
            ok: boolean;
            mode?: "live" | "demo";
            creatives?: SyncedCreative[];
            message?: string;
            error?: string;
            detail?: string;
            syncedAt?: string;
          };

          if (!res.ok || !body.ok) {
            const summary: SyncSummary = {
              mode: "error",
              accountId: id,
              metaAccountId: account.metaAccountId,
              added: 0,
              updated: 0,
              unchanged: 0,
              total: 0,
              message: body.detail || body.error || "Sync failed.",
              errorCode: body.error,
              errorDetail: body.detail,
              syncedAt: nowIso(),
            };
            set({
              syncingAccountIds: get().syncingAccountIds.filter((x) => x !== id),
              lastSyncSummaries: { ...get().lastSyncSummaries, [id]: summary },
            });
            return;
          }

          const mode = body.mode ?? "demo";
          const incoming = body.creatives ?? [];
          const syncedAt = body.syncedAt ?? nowIso();

          if (mode === "demo") {
            const summary: SyncSummary = {
              mode: "demo",
              accountId: id,
              metaAccountId: account.metaAccountId,
              added: 0,
              updated: 0,
              unchanged: 0,
              total: 0,
              message:
                body.message ??
                "Demo mode — add META_ACCESS_TOKEN to .env.local to pull real ads from Meta.",
              syncedAt,
            };
            set({
              syncingAccountIds: get().syncingAccountIds.filter((x) => x !== id),
              lastSyncSummaries: { ...get().lastSyncSummaries, [id]: summary },
              accounts: get().accounts.map((a) =>
                a.id === id ? { ...a, lastSyncedAt: syncedAt, updatedAt: syncedAt } : a,
              ),
            });
            return;
          }

          // LIVE mode — merge by ad_id
          const { creatives: mergedCreatives, added, updated, unchanged } =
            mergeSyncedCreatives({
              existing: get().creatives,
              incoming,
              accountId: id,
              metaAccountId: account.metaAccountId,
              syncedAtIso: syncedAt,
            });

          const summary: SyncSummary = {
            mode: "live",
            accountId: id,
            metaAccountId: account.metaAccountId,
            added,
            updated,
            unchanged,
            total: incoming.length,
            message:
              added === 0 && updated === 0
                ? `No changes — all ${incoming.length} ads already current.`
                : `${added} new, ${updated} updated, ${unchanged} unchanged.`,
            syncedAt,
          };

          set({
            syncingAccountIds: get().syncingAccountIds.filter((x) => x !== id),
            creatives: mergedCreatives,
            accounts: get().accounts.map((a) =>
              a.id === id ? { ...a, lastSyncedAt: syncedAt, updatedAt: syncedAt } : a,
            ),
            lastSyncSummaries: { ...get().lastSyncSummaries, [id]: summary },
          });
        } catch (err) {
          const summary: SyncSummary = {
            mode: "error",
            accountId: id,
            metaAccountId: account.metaAccountId,
            added: 0,
            updated: 0,
            unchanged: 0,
            total: 0,
            message: err instanceof Error ? err.message : "Network error",
            syncedAt: nowIso(),
          };
          set({
            syncingAccountIds: get().syncingAccountIds.filter((x) => x !== id),
            lastSyncSummaries: { ...get().lastSyncSummaries, [id]: summary },
          });
        }
      },

      syncAll: async () => {
        const activeAccounts = get().accounts.filter((a) => a.isActive);
        if (activeAccounts.length === 0) return;
        set({ syncingAll: true });
        // Sync sequentially to stay under Meta's per-user rate limits.
        for (const account of activeAccounts) {
          await get().syncAccount(account.id);
        }
        set({ syncingAll: false });
      },

      dismissSyncSummary: (accountId) => {
        const next = { ...get().lastSyncSummaries };
        delete next[accountId];
        set({ lastSyncSummaries: next });
      },

      setGlobalAccount: (accountId) => set({ global: { ...get().global, accountId } }),
      setGlobalDateRange: (dateRange) => set({ global: { ...get().global, dateRange } }),

      setFilters: (patch) => set({ filters: { ...get().filters, ...patch } }),
      resetFilters: () => set({ filters: { ...DEFAULT_CREATIVE_FILTERS } }),

      toggleColumn: (key) =>
        set({
          visibleColumns: {
            ...get().visibleColumns,
            [key]: !get().visibleColumns[key],
          },
        }),

      setViewMode: (mode) => set({ viewMode: mode }),

      openCreative: (id) => set({ selectedCreativeId: id }),

      reanalyzeCreative: async (id) => {
        const current = get().creatives.find((c) => c.id === id);
        if (!current) return;
        set({
          reanalyzingCreativeIds: [...get().reanalyzingCreativeIds, id],
          creatives: get().creatives.map((c) =>
            c.id === id ? { ...c, ai: { ...c.ai, status: "pending" } } : c,
          ),
        });

        try {
          // Build the coaching context payload: persona prefs + the last few
          // rated exemplars so the model can emulate voice the user liked and
          // avoid what they rejected.
          const exemplars = get().coachingExemplars;
          const approvedExemplars = exemplars.filter((e) => e.rating === "up").slice(0, 3);
          const rejectedExemplars = exemplars.filter((e) => e.rating === "down").slice(0, 3);

          const res = await fetch(`/api/creatives/${id}/analyze`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: current.name,
              campaignName: current.campaignName,
              adSetName: current.adSetName,
              mediaType: current.mediaType,
              previewUrl: current.previewUrl || undefined,
              currentFunnelStage: current.ai.funnelStage,
              metrics: current.metrics,
              coaching: get().settings.coaching,
              exemplars: {
                approved: approvedExemplars,
                rejected: rejectedExemplars,
              },
            }),
          });
          const body = (await res.json()) as {
            ok: boolean;
            mode?: "demo" | "live";
            analysis?: {
              assetType: Creative["ai"]["assetType"];
              visualFormat: Creative["ai"]["visualFormat"];
              messagingAngle: Creative["ai"]["messagingAngle"];
              hookTactic: Creative["ai"]["hookTactic"];
              offerType: Creative["ai"]["offerType"];
              funnelStage: Creative["ai"]["funnelStage"];
              summary: string;
              strengths: string[];
              areasToImprove: string[];
              recommendedIterations: Array<{
                title: string;
                effort: "Low" | "Medium" | "High";
                rationale: string;
                expectedOutcome: string;
              }>;
            } | null;
            error?: string;
          };

          if (!res.ok || !body.ok) {
            set({
              reanalyzingCreativeIds: get().reanalyzingCreativeIds.filter((x) => x !== id),
              creatives: get().creatives.map((c) =>
                c.id === id ? { ...c, ai: { ...c.ai, status: "failed" } } : c,
              ),
            });
            return;
          }

          if (body.mode === "live" && body.analysis) {
            const a = body.analysis;
            set({
              reanalyzingCreativeIds: get().reanalyzingCreativeIds.filter((x) => x !== id),
              creatives: get().creatives.map((c) =>
                c.id === id
                  ? {
                      ...c,
                      ai: {
                        ...c.ai,
                        status: "complete",
                        assetType: a.assetType,
                        visualFormat: a.visualFormat,
                        messagingAngle: a.messagingAngle,
                        hookTactic: a.hookTactic,
                        offerType: a.offerType,
                        funnelStage: a.funnelStage,
                        summary: a.summary,
                        strengths: a.strengths,
                        areasToImprove: a.areasToImprove,
                        recommendedIterations: a.recommendedIterations.map(
                          (it, i) => ({
                            id: `${id}_iter_${Date.now()}_${i}`,
                            title: it.title,
                            effort: it.effort,
                            rationale: it.rationale,
                            expectedOutcome: it.expectedOutcome,
                          }),
                        ),
                        analyzedAt: nowIso(),
                      },
                    }
                  : c,
              ),
            });
            return;
          }

          // Demo mode — no key configured. Keep existing taxonomy, flip status.
          await delay(600);
          set({
            reanalyzingCreativeIds: get().reanalyzingCreativeIds.filter((x) => x !== id),
            creatives: get().creatives.map((c) =>
              c.id === id
                ? { ...c, ai: { ...c.ai, status: "complete", analyzedAt: nowIso() } }
                : c,
            ),
          });
        } catch {
          set({
            reanalyzingCreativeIds: get().reanalyzingCreativeIds.filter((x) => x !== id),
            creatives: get().creatives.map((c) =>
              c.id === id ? { ...c, ai: { ...c.ai, status: "failed" } } : c,
            ),
          });
        }
      },

      startBatchAnalyze: async (ids) => {
        if (get().batchAnalyze.running) return;
        set({
          batchAnalyze: {
            running: true,
            total: ids.length,
            done: 0,
            failed: 0,
            cancelRequested: false,
            currentName: null,
          },
        });

        // Throttle: Gemini 2.0 Flash free tier is 15 RPM. 4.2s between starts
        // gives us a safe margin (~14 RPM) even if a call returns instantly.
        const minIntervalMs = 4200;
        let lastStart = 0;

        for (const id of ids) {
          if (get().batchAnalyze.cancelRequested) break;

          const elapsed = Date.now() - lastStart;
          if (lastStart > 0 && elapsed < minIntervalMs) {
            await delay(minIntervalMs - elapsed);
          }
          if (get().batchAnalyze.cancelRequested) break;
          lastStart = Date.now();

          const creative = get().creatives.find((c) => c.id === id);
          set({
            batchAnalyze: {
              ...get().batchAnalyze,
              currentName: creative?.name ?? null,
            },
          });

          // reanalyzeCreative handles per-row status + API call.
          await get().reanalyzeCreative(id);

          const after = get().creatives.find((c) => c.id === id);
          const failed =
            after?.ai.status === "failed"
              ? get().batchAnalyze.failed + 1
              : get().batchAnalyze.failed;
          set({
            batchAnalyze: {
              ...get().batchAnalyze,
              done: get().batchAnalyze.done + 1,
              failed,
            },
          });
        }

        set({
          batchAnalyze: {
            ...get().batchAnalyze,
            running: false,
            currentName: null,
          },
        });
      },

      cancelBatchAnalyze: () =>
        set({
          batchAnalyze: { ...get().batchAnalyze, cancelRequested: true },
        }),

      rateAnalysis: (id, rating, note = "") => {
        const creative = get().creatives.find((c) => c.id === id);
        if (!creative) return;

        const exemplar: CoachingExemplar = {
          id: `${id}_${Date.now().toString(36)}`,
          creativeName: creative.name,
          mediaType: creative.mediaType,
          funnelStage: creative.ai.funnelStage,
          metricsSnapshot: {
            spend: creative.metrics.spend,
            ctr: creative.metrics.ctr,
            roas: creative.metrics.roas,
            hookRate: creative.metrics.hookRate,
            holdRate: creative.metrics.holdRate,
            cpa: creative.metrics.cpa,
          },
          analysisSnapshot: {
            summary: creative.ai.summary,
            strengths: creative.ai.strengths.slice(0, 3),
            areasToImprove: creative.ai.areasToImprove.slice(0, 3),
          },
          rating,
          note,
          ratedAt: nowIso(),
        };

        // Cap at 20 exemplars total — oldest dropped first.
        // The coaching prompt picks the most recent 3 up + 3 down.
        const nextExemplars = [
          exemplar,
          ...get().coachingExemplars.filter(
            (e) => e.creativeName !== creative.name || e.rating !== rating,
          ),
        ].slice(0, 20);

        set({
          coachingExemplars: nextExemplars,
          creatives: get().creatives.map((c) =>
            c.id === id
              ? { ...c, ai: { ...c.ai, feedback: { rating, note, ratedAt: exemplar.ratedAt } } }
              : c,
          ),
        });
      },

      clearAnalysisRating: (id) => {
        set({
          creatives: get().creatives.map((c) =>
            c.id === id ? { ...c, ai: { ...c.ai, feedback: undefined } } : c,
          ),
        });
      },

      updateSettings: (patch) =>
        set({ settings: { ...get().settings, ...patch, updatedAt: nowIso() } }),

      regenerateReport: async (id) => {
        set({
          reports: get().reports.map((r) =>
            r.id === id ? { ...r, status: "generating" } : r,
          ),
        });
        await delay(1200);
        set({
          reports: get().reports.map((r) =>
            r.id === id ? { ...r, status: "ready", generatedAt: nowIso() } : r,
          ),
        });
      },

      deleteReport: (id) => set({ reports: get().reports.filter((r) => r.id !== id) }),

      createReport: ({ name, accountId }) => {
        const account = get().accounts.find((a) => a.id === accountId);
        const report: Report = {
          id: uid("rep"),
          name,
          accountId,
          accountName: account?.name ?? "All Accounts",
          dateRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: nowIso(),
          },
          status: "generating",
          generatedAt: null,
          summary: {
            totalCreatives: get().creatives.length,
            winners: 0,
            winRate: 0,
            blendedRoas: 0,
            topAssetType: "UGC",
            topMessagingAngle: "Problem/Solution",
            keyIterations: [],
          },
        };
        set({ reports: [report, ...get().reports] });
        // Simulate async generation
        setTimeout(() => {
          set({
            reports: get().reports.map((r) =>
              r.id === report.id ? { ...r, status: "ready", generatedAt: nowIso() } : r,
            ),
          });
        }, 1400);
        return report;
      },
    }),
    {
      name: BASE_STORE_KEY,
      // Rehydration is kicked off by SessionProvider once Supabase Auth has
      // resolved — that avoids reading the workspace row before the auth
      // cookies are attached.
      skipHydration: true,
      storage: createJSONStorage(() => supabaseStorage),
      partialize: (state) => ({
        initialized: state.initialized,
        accounts: state.accounts,
        creatives: state.creatives,
        reports: state.reports,
        settings: state.settings,
        global: state.global,
        filters: state.filters,
        viewMode: state.viewMode,
        visibleColumns: state.visibleColumns,
      }),
      // Deep-merge the persisted slice into the current defaults. This is
      // what makes new settings sections (e.g. settings.automation added
      // after a user's workspace was already populated) backfill gracefully
      // instead of throwing 'undefined' errors when a new tab reads them.
      merge: (persistedRaw, current) => {
        const persisted = (persistedRaw ?? {}) as Partial<StoreState>;
        const defaults = defaultSettings();
        const currentSettings = current.settings;
        const persistedSettings = persisted.settings as Partial<Settings> | undefined;
        return {
          ...current,
          ...persisted,
          settings: {
            ...defaults,
            ...currentSettings,
            ...(persistedSettings ?? {}),
            winningThresholds: {
              ...defaults.winningThresholds,
              ...(persistedSettings?.winningThresholds ?? {}),
            },
            coaching: {
              ...defaults.coaching,
              ...(persistedSettings?.coaching ?? {}),
            },
            attribution: {
              ...defaults.attribution,
              ...(persistedSettings?.attribution ?? {}),
              stageMap: {
                ...defaults.attribution.stageMap,
                ...(persistedSettings?.attribution?.stageMap ?? {}),
              },
            },
            automation: {
              ...defaults.automation,
              ...(persistedSettings?.automation ?? {}),
              twilio: {
                ...defaults.automation.twilio,
                ...(persistedSettings?.automation?.twilio ?? {}),
              },
              automations: {
                ...defaults.automation.automations,
                ...(persistedSettings?.automation?.automations ?? {}),
              },
            },
          },
        } as StoreState;
      },
    },
  ),
);

export function useFilteredCreatives(): Creative[] {
  const creatives = useStore((s) => s.creatives);
  const filters = useStore((s) => s.filters);
  const global = useStore((s) => s.global);
  return React.useMemo(() => {
    return creatives.filter((c) => {
      if (global.accountId !== "all" && c.accountId !== global.accountId) return false;
      if (filters.delivery === "had_delivery" && !c.hadDelivery) return false;
      if (filters.delivery === "active" && c.activeStatus !== "active") return false;
      if (filters.mediaType !== "all" && c.mediaType !== filters.mediaType) return false;
      if (filters.aiStatus !== "all" && c.ai.status !== filters.aiStatus) return false;
      if (filters.assetType !== "all" && c.ai.assetType !== filters.assetType) return false;
      if (filters.angle !== "all" && c.ai.messagingAngle !== filters.angle) return false;
      if (filters.funnel !== "all" && c.ai.funnelStage !== filters.funnel) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !c.name.toLowerCase().includes(q) &&
          !c.campaignName.toLowerCase().includes(q) &&
          !c.adSetName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [creatives, filters, global]);
}
