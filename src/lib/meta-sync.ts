/**
 * Meta Graph API sync layer.
 *
 * The client's Sync button calls `POST /api/accounts/[id]/sync`, which in turn
 * calls `fetchAccountCreatives(metaAccountId)`. This returns a list of
 * normalized `SyncedCreative` records that the client merges into its store
 * by deduplicating on `ad_id` — new ads are inserted with a `pending` AI
 * record, existing ads get their metrics + status refreshed without losing
 * any prior AI analysis.
 *
 * When `META_ACCESS_TOKEN` is not present we return an empty payload in
 * "demo" mode. The client handles this explicitly (no fake metric writes).
 */

export interface SyncedCreative {
  adId: string;
  name: string;
  campaignId: string | null;
  campaignName: string;
  adSetId: string | null;
  adSetName: string;
  mediaType: "video" | "image";
  previewUrl: string;
  effectiveStatus: string;
  status: string;
  createdTime: string; // ISO
  hadDelivery: boolean;
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    purchases: number;
    revenue: number;
    roas: number;
    ctr: number;
    cpa: number;
    hookRate: number;
    holdRate: number;
    landingPageViews: number;
    thumbstopRate: number;
  };
}

export interface SyncResult {
  mode: "live" | "demo";
  accountId: string;
  syncedAt: string;
  creatives: SyncedCreative[];
}

const GRAPH_VERSION = "v21.0";
const PAGE_LIMIT = 100;
const MAX_PAGES = 20; // safety cap — 2,000 ads per sync max

export function hasMetaCredentials(): boolean {
  return Boolean(process.env.META_ACCESS_TOKEN);
}

const AD_FIELDS = [
  "id",
  "name",
  "status",
  "effective_status",
  "created_time",
  "campaign_id",
  "campaign{name}",
  "adset_id",
  "adset{name}",
  "creative{id,thumbnail_url,image_url,video_id,object_story_spec}",
  "insights.fields(" +
    [
      "spend",
      "impressions",
      "clicks",
      "ctr",
      "actions",
      "action_values",
      "video_3_sec_watched_actions",
      "video_p75_watched_actions",
      "video_thruplay_watched_actions",
      "inline_link_clicks",
    ].join(",") +
    ").date_preset(last_30d)",
].join(",");

interface MetaInsightAction {
  action_type: string;
  value: string;
}

interface MetaInsightRow {
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  actions?: MetaInsightAction[];
  action_values?: MetaInsightAction[];
  video_3_sec_watched_actions?: MetaInsightAction[];
  video_p75_watched_actions?: MetaInsightAction[];
  video_thruplay_watched_actions?: MetaInsightAction[];
  inline_link_clicks?: string;
}

interface MetaAd {
  id: string;
  name?: string;
  status?: string;
  effective_status?: string;
  created_time?: string;
  campaign_id?: string;
  campaign?: { name?: string };
  adset_id?: string;
  adset?: { name?: string };
  creative?: {
    id?: string;
    thumbnail_url?: string;
    image_url?: string;
    video_id?: string;
  };
  insights?: { data?: MetaInsightRow[] };
}

function findAction(list: MetaInsightAction[] | undefined, type: string): number {
  if (!list) return 0;
  const row = list.find((a) => a.action_type === type);
  return row ? Number(row.value) || 0 : 0;
}

function purchaseCount(row: MetaInsightRow | undefined): number {
  if (!row) return 0;
  return (
    findAction(row.actions, "purchase") ||
    findAction(row.actions, "offsite_conversion.fb_pixel_purchase") ||
    findAction(row.actions, "onsite_web_purchase") ||
    findAction(row.actions, "omni_purchase")
  );
}

function purchaseValue(row: MetaInsightRow | undefined): number {
  if (!row) return 0;
  return (
    findAction(row.action_values, "purchase") ||
    findAction(row.action_values, "offsite_conversion.fb_pixel_purchase") ||
    findAction(row.action_values, "onsite_web_purchase") ||
    findAction(row.action_values, "omni_purchase")
  );
}

function landingViews(row: MetaInsightRow | undefined): number {
  return row ? findAction(row.actions, "landing_page_view") : 0;
}

function normalizeAd(ad: MetaAd): SyncedCreative {
  const insight = ad.insights?.data?.[0];
  const spend = Number(insight?.spend ?? 0) || 0;
  const impressions = Number(insight?.impressions ?? 0) || 0;
  const clicks = Number(insight?.clicks ?? 0) || 0;
  const ctrRaw = Number(insight?.ctr ?? 0) || 0;
  const ctr = ctrRaw > 1 ? ctrRaw / 100 : ctrRaw; // Meta returns percentage
  const purchases = purchaseCount(insight);
  const revenue = purchaseValue(insight);
  const lpv = landingViews(insight);
  const roas = spend > 0 ? revenue / spend : 0;
  const cpa = purchases > 0 ? spend / purchases : 0;
  const threeSec = findAction(insight?.video_3_sec_watched_actions, "video_view");
  const p75 = findAction(insight?.video_p75_watched_actions, "video_view");
  const thruplay = findAction(insight?.video_thruplay_watched_actions, "video_view");
  const hookRate = impressions > 0 ? threeSec / impressions : 0;
  const holdRate = threeSec > 0 ? p75 / threeSec : 0;
  const thumbstopRate = impressions > 0 ? thruplay / impressions : 0;
  const mediaType: "video" | "image" = ad.creative?.video_id ? "video" : "image";
  const previewUrl = ad.creative?.thumbnail_url || ad.creative?.image_url || "";

  return {
    adId: ad.id,
    name: ad.name ?? "(unnamed ad)",
    campaignId: ad.campaign_id ?? null,
    campaignName: ad.campaign?.name ?? "",
    adSetId: ad.adset_id ?? null,
    adSetName: ad.adset?.name ?? "",
    mediaType,
    previewUrl,
    effectiveStatus: ad.effective_status ?? "",
    status: ad.status ?? "",
    createdTime: ad.created_time ?? new Date().toISOString(),
    hadDelivery: impressions > 0,
    metrics: {
      spend,
      impressions,
      clicks,
      purchases,
      revenue,
      roas,
      ctr,
      cpa,
      hookRate,
      holdRate,
      landingPageViews: lpv,
      thumbstopRate,
    },
  };
}

export async function fetchAccountCreatives(
  metaAccountId: string,
): Promise<SyncResult> {
  if (!hasMetaCredentials()) {
    return {
      mode: "demo",
      accountId: metaAccountId,
      syncedAt: new Date().toISOString(),
      creatives: [],
    };
  }

  const token = process.env.META_ACCESS_TOKEN!;
  const creatives: SyncedCreative[] = [];
  let url: string | null =
    `https://graph.facebook.com/${GRAPH_VERSION}/${metaAccountId}/ads` +
    `?fields=${encodeURIComponent(AD_FIELDS)}` +
    `&limit=${PAGE_LIMIT}` +
    `&access_token=${encodeURIComponent(token)}`;

  let page = 0;
  while (url && page < MAX_PAGES) {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`meta_api_${res.status}: ${body.slice(0, 240)}`);
    }
    const data = (await res.json()) as {
      data?: MetaAd[];
      paging?: { next?: string };
    };
    for (const ad of data.data ?? []) {
      creatives.push(normalizeAd(ad));
    }
    url = data.paging?.next ?? null;
    page++;
  }

  return {
    mode: "live",
    accountId: metaAccountId,
    syncedAt: new Date().toISOString(),
    creatives,
  };
}
