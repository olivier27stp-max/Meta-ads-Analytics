/**
 * Meta Graph API sync layer. This file is intentionally wired as the seam where
 * a real Meta Marketing API integration plugs in. The route handlers in
 * `/api/accounts/[id]/sync` and `/api/creatives/[id]/analyze` call into these
 * helpers. When `META_ACCESS_TOKEN` is present we call Graph; otherwise we
 * return a deterministic demo payload so the UI stays usable.
 */

export interface SyncedCreative {
  adId: string;
  name: string;
  mediaType: "video" | "image";
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  revenue: number;
  ctr: number;
}

export interface SyncResult {
  accountId: string;
  syncedAt: string;
  creatives: SyncedCreative[];
}

const GRAPH_VERSION = "v21.0";

export function hasMetaCredentials(): boolean {
  return Boolean(process.env.META_ACCESS_TOKEN);
}

export async function fetchAccountCreatives(
  metaAccountId: string,
): Promise<SyncResult> {
  if (!hasMetaCredentials()) {
    // Demo mode: return an empty payload — the client-side store already
    // has rich seed data, and the UI uses that as the source of truth.
    return {
      accountId: metaAccountId,
      syncedAt: new Date().toISOString(),
      creatives: [],
    };
  }

  const token = process.env.META_ACCESS_TOKEN!;
  const fields = [
    "id",
    "name",
    "creative{object_story_spec,image_url,video_id,thumbnail_url}",
    "insights.fields(spend,impressions,clicks,actions,action_values,ctr).date_preset(last_30d)",
  ].join(",");

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${metaAccountId}/ads?fields=${encodeURIComponent(fields)}&access_token=${token}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Meta API error ${res.status}`);
  }
  const data = (await res.json()) as {
    data: Array<{
      id: string;
      name: string;
      creative?: { video_id?: string; image_url?: string };
      insights?: { data: Array<{ spend: string; impressions: string; clicks: string; ctr: string; actions?: Array<{ action_type: string; value: string }>; action_values?: Array<{ action_type: string; value: string }> }> };
    }>;
  };

  const creatives = (data.data || []).map((ad): SyncedCreative => {
    const ins = ad.insights?.data?.[0];
    const getAction = (type: string) =>
      Number(ins?.actions?.find((a) => a.action_type === type)?.value ?? 0);
    const getValue = (type: string) =>
      Number(ins?.action_values?.find((a) => a.action_type === type)?.value ?? 0);
    return {
      adId: ad.id,
      name: ad.name,
      mediaType: ad.creative?.video_id ? "video" : "image",
      spend: Number(ins?.spend ?? 0),
      impressions: Number(ins?.impressions ?? 0),
      clicks: Number(ins?.clicks ?? 0),
      purchases: getAction("purchase") || getAction("offsite_conversion.fb_pixel_purchase"),
      revenue: getValue("purchase") || getValue("offsite_conversion.fb_pixel_purchase"),
      ctr: Number(ins?.ctr ?? 0) / 100,
    };
  });

  return {
    accountId: metaAccountId,
    syncedAt: new Date().toISOString(),
    creatives,
  };
}
