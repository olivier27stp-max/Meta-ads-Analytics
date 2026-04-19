import type {
  Creative,
  FunnelStage,
  GroupByKey,
  Recommendation,
  Settings,
} from "@/types";
import { classify, isWinner } from "@/lib/scoring";
import { safeDivide, sum } from "@/lib/utils";

export interface GroupedRow {
  key: string;
  ads: number;
  winners: number;
  winRate: number;
  blendedRoas: number;
  avgSpend: number;
  totalSpend: number;
}

const GROUP_ACCESSORS: Record<Exclude<GroupByKey, "none">, (c: Creative) => string> = {
  assetType: (c) => c.ai.assetType,
  messagingAngle: (c) => c.ai.messagingAngle,
  hookTactic: (c) => c.ai.hookTactic,
  visualFormat: (c) => c.ai.visualFormat,
  funnelStage: (c) => c.ai.funnelStage,
  campaign: (c) => c.campaignName,
  adType: (c) => (c.mediaType === "video" ? "Video" : "Image"),
};

export function groupCreatives(
  creatives: Creative[],
  key: GroupByKey,
  settings: Settings,
): GroupedRow[] {
  if (key === "none") return [];
  const accessor = GROUP_ACCESSORS[key];
  const buckets = new Map<string, Creative[]>();
  for (const c of creatives) {
    const k = accessor(c);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(c);
  }
  const rows: GroupedRow[] = [];
  for (const [k, list] of buckets.entries()) {
    const ads = list.length;
    const winners = list.filter((c) => isWinner(c, settings.winningThresholds)).length;
    const totalSpend = sum(list.map((c) => c.metrics.spend));
    const totalRevenue = sum(list.map((c) => c.metrics.revenue));
    rows.push({
      key: k,
      ads,
      winners,
      winRate: safeDivide(winners, ads),
      blendedRoas: safeDivide(totalRevenue, totalSpend),
      avgSpend: safeDivide(totalSpend, ads),
      totalSpend,
    });
  }
  return rows.sort((a, b) => b.winRate - a.winRate || b.blendedRoas - a.blendedRoas);
}

export function winRateSummary(creatives: Creative[], settings: Settings) {
  const ads = creatives.length;
  const winners = creatives.filter((c) => isWinner(c, settings.winningThresholds)).length;
  const totalSpend = sum(creatives.map((c) => c.metrics.spend));
  const totalRevenue = sum(creatives.map((c) => c.metrics.revenue));
  return {
    ads,
    winners,
    winRate: safeDivide(winners, ads),
    blendedRoas: safeDivide(totalRevenue, totalSpend),
    totalSpend,
    totalRevenue,
  };
}

export interface StageBoard {
  stage: FunnelStage;
  scale: Creative[];
  watch: Creative[];
  kill: Creative[];
}

export function buildKillScaleBoard(
  creatives: Creative[],
  settings: Settings,
): StageBoard[] {
  const stages: FunnelStage[] = ["TOF", "MOF", "BOF"];
  return stages.map((stage) => {
    const stageCreatives = creatives.filter((c) => c.ai.funnelStage === stage);
    const scale: Creative[] = [];
    const watch: Creative[] = [];
    const kill: Creative[] = [];
    for (const c of stageCreatives) {
      const rec: Recommendation = classify(c, settings);
      if (rec === "scale") scale.push(c);
      else if (rec === "watch") watch.push(c);
      else kill.push(c);
    }
    const bySpend = (a: Creative, b: Creative) => b.metrics.spend - a.metrics.spend;
    return {
      stage,
      scale: scale.sort(bySpend),
      watch: watch.sort(bySpend),
      kill: kill.sort(bySpend),
    };
  });
}

export function topBlurb(creatives: Creative[], settings: Settings, limit = 3) {
  const scored = creatives
    .map((c) => ({ c, rec: classify(c, settings) }))
    .filter((x) => x.rec === "scale")
    .sort((a, b) => b.c.metrics.revenue - a.c.metrics.revenue)
    .slice(0, limit)
    .map((x) => x.c.name);
  return scored;
}
