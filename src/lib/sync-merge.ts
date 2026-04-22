/**
 * Pure, environment-agnostic merge of a list of Meta-synced creatives into an
 * existing creatives list, deduplicated on `ad_id`.
 *
 * Used in two places:
 *   - client store action `syncAccount` (browser)
 *   - server cron endpoint `/api/cron/sync-all` (Node)
 *
 * Behaviour:
 *   - If an incoming ad already exists for the same accountId, refresh the
 *     metrics + naming + status fields but PRESERVE the existing AI analysis
 *     record and our internal id.
 *   - If it's a new ad, append with a fresh `pending` AI record.
 *   - If a prior creative isn't returned by Meta this pass, keep it (orphan)
 *     so AI judgment isn't lost when an ad is archived/deleted on Meta.
 */

import type { Creative } from "@/types";
import type { SyncedCreative } from "@/lib/meta-sync";

export interface MergeResult {
  creatives: Creative[];
  added: number;
  updated: number;
  unchanged: number;
}

export function mergeSyncedCreatives(params: {
  existing: Creative[];
  incoming: SyncedCreative[];
  accountId: string;
  metaAccountId: string;
  syncedAtIso: string;
}): MergeResult {
  const { existing, incoming, accountId, metaAccountId, syncedAtIso } = params;

  const otherAccounts = existing.filter((c) => c.accountId !== accountId);
  const ownIndex = new Map<string, Creative>();
  for (const c of existing) {
    if (c.accountId === accountId) ownIndex.set(c.adId, c);
  }

  let added = 0;
  let updated = 0;
  let unchanged = 0;
  const merged: Creative[] = [];

  for (const s of incoming) {
    const prior = ownIndex.get(s.adId);
    if (prior) {
      const metricsChanged =
        prior.metrics.spend !== s.metrics.spend ||
        prior.metrics.impressions !== s.metrics.impressions ||
        prior.metrics.clicks !== s.metrics.clicks ||
        prior.metrics.purchases !== s.metrics.purchases;
      merged.push({
        ...prior,
        name: s.name,
        campaignId: s.campaignId,
        campaignName: s.campaignName || prior.campaignName,
        adSetId: s.adSetId,
        adSetName: s.adSetName || prior.adSetName,
        mediaType: s.mediaType,
        previewUrl: s.previewUrl || prior.previewUrl,
        effectiveStatus: s.effectiveStatus,
        activeStatus:
          s.effectiveStatus === "ACTIVE"
            ? "active"
            : s.effectiveStatus === "PAUSED"
              ? "paused"
              : "archived",
        hadDelivery: s.hadDelivery,
        metrics: s.metrics,
        updatedAt: syncedAtIso,
        lastSyncedAt: syncedAtIso,
      });
      ownIndex.delete(s.adId);
      if (metricsChanged) updated++;
      else unchanged++;
    } else {
      const id = `cr_${metaAccountId.slice(-6)}_${s.adId}`;
      added++;
      merged.push({
        id,
        accountId,
        adId: s.adId,
        campaignId: s.campaignId,
        campaignName: s.campaignName,
        adSetId: s.adSetId,
        adSetName: s.adSetName,
        name: s.name,
        mediaType: s.mediaType,
        previewUrl: s.previewUrl,
        thumbnailColor: "#1e293b",
        hadDelivery: s.hadDelivery,
        activeStatus:
          s.effectiveStatus === "ACTIVE"
            ? "active"
            : s.effectiveStatus === "PAUSED"
              ? "paused"
              : "archived",
        effectiveStatus: s.effectiveStatus,
        createdAt: s.createdTime,
        updatedAt: syncedAtIso,
        lastSyncedAt: syncedAtIso,
        metrics: s.metrics,
        ai: {
          id: `${id}_ai`,
          creativeId: id,
          status: "pending",
          assetType: "UGC",
          visualFormat: "Lifestyle",
          messagingAngle: "Value Proposition",
          hookTactic: "Direct Benefit",
          offerType: "No Offer",
          funnelStage: "TOF",
          summary:
            "Pending AI analysis — click Re-analyze (or use Analyze all) to have Gemini review this creative.",
          strengths: [],
          areasToImprove: [],
          recommendedIterations: [],
          analyzedAt: null,
        },
      });
    }
  }

  for (const orphan of ownIndex.values()) {
    merged.push(orphan);
  }

  return {
    creatives: [...otherAccounts, ...merged],
    added,
    updated,
    unchanged,
  };
}
