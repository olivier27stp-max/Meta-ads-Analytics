import type {
  Account,
  AIAnalysis,
  AssetType,
  Creative,
  CreativeMetrics,
  FunnelStage,
  HookTactic,
  MediaType,
  MessagingAngle,
  OfferType,
  RecommendedIteration,
  Report,
  Settings,
  VisualFormat,
} from "@/types";

const THUMB_PALETTE = [
  "#1e293b",
  "#0f766e",
  "#be185d",
  "#a16207",
  "#4338ca",
  "#9333ea",
  "#b45309",
  "#0e7490",
  "#5b21b6",
  "#b91c1c",
  "#15803d",
  "#4f46e5",
];

interface AccountSeed {
  metaAccountId: string;
  name: string;
  isActive?: boolean;
}

const ACCOUNT_SEEDS: AccountSeed[] = [
  { metaAccountId: "act_874512309", name: "Nova Skin — US" },
  { metaAccountId: "act_208341557", name: "Summit Supplements" },
  { metaAccountId: "act_551243098", name: "Mornthreads Apparel" },
  { metaAccountId: "act_349812774", name: "Kinetic Coffee Co." },
  { metaAccountId: "act_739401226", name: "Halocraft Tools", isActive: false },
];

const AD_CONCEPTS: Array<{
  concept: string;
  angle: MessagingAngle;
  hook: HookTactic;
  asset: AssetType;
  visual: VisualFormat;
  offer: OfferType;
  stage: FunnelStage;
  media: MediaType;
}> = [
  { concept: "Morning Ritual UGC", angle: "Aspiration", hook: "Story Hook", asset: "UGC", visual: "Lifestyle", offer: "No Offer", stage: "TOF", media: "video" },
  { concept: "Founder POV 60s", angle: "Authority/Expert", hook: "Authority Hook", asset: "Talking Head", visual: "Founder-style", offer: "Discount", stage: "MOF", media: "video" },
  { concept: "Before/After 30s", angle: "Problem/Solution", hook: "Pattern Interrupt", asset: "UGC", visual: "Before/After", offer: "Discount", stage: "BOF", media: "video" },
  { concept: "Feature Demo 15s", angle: "Information", hook: "Direct Benefit", asset: "Screen Recording", visual: "Demo", offer: "Free Trial", stage: "MOF", media: "video" },
  { concept: "Testimonial Carousel", angle: "Social Proof", hook: "Authority Hook", asset: "UGC", visual: "Talking Head", offer: "No Offer", stage: "BOF", media: "image" },
  { concept: "Expert Breakdown", angle: "Authority/Expert", hook: "Contrarian Hook", asset: "Talking Head", visual: "Talking Head", offer: "No Offer", stage: "TOF", media: "video" },
  { concept: "Comparison Grid", angle: "Comparison", hook: "Bold Claim", asset: "Static Image", visual: "Text-led", offer: "Discount", stage: "MOF", media: "image" },
  { concept: "Pain Point Reel", angle: "Pain Point", hook: "Problem Hook", asset: "UGC", visual: "Talking Head", offer: "Free Shipping", stage: "TOF", media: "video" },
  { concept: "Luxe Product Showcase", angle: "Aspiration", hook: "Curiosity Gap", asset: "3D Production", visual: "Product Showcase", offer: "Bundle", stage: "MOF", media: "video" },
  { concept: "Weekly Drop Teaser", angle: "Exclusivity", hook: "Curiosity Gap", asset: "Animation", visual: "Text-led", offer: "Limited Time", stage: "TOF", media: "video" },
  { concept: "Close-up Macro", angle: "Value Proposition", hook: "Direct Benefit", asset: "Stock Footage", visual: "Product Showcase", offer: "Free Shipping", stage: "MOF", media: "image" },
  { concept: "Lead Magnet Guide", angle: "Information", hook: "Curiosity Gap", asset: "Static Image", visual: "Text-led", offer: "Lead Magnet", stage: "TOF", media: "image" },
  { concept: "Unboxing Reel", angle: "Social Proof", hook: "Story Hook", asset: "UGC", visual: "Lifestyle", offer: "Bundle", stage: "BOF", media: "video" },
  { concept: "Stat-led Static", angle: "Authority/Expert", hook: "Bold Claim", asset: "Static Image", visual: "Text-led", offer: "No Offer", stage: "TOF", media: "image" },
  { concept: "Walkthrough Demo", angle: "Information", hook: "Direct Benefit", asset: "Screen Recording", visual: "Demo", offer: "Free Trial", stage: "MOF", media: "video" },
  { concept: "Founder Story 45s", angle: "Aspiration", hook: "Story Hook", asset: "Talking Head", visual: "Founder-style", offer: "No Offer", stage: "TOF", media: "video" },
  { concept: "Value Prop Explainer", angle: "Value Proposition", hook: "Direct Benefit", asset: "Animation", visual: "Text-led", offer: "Free Trial", stage: "MOF", media: "video" },
  { concept: "Retargeting Bundle", angle: "Exclusivity", hook: "Bold Claim", asset: "Static Image", visual: "Product Showcase", offer: "Bundle", stage: "BOF", media: "image" },
];

const CAMPAIGN_NAMES = [
  "Prospecting | US | Broad",
  "Prospecting | US | Lookalike 1%",
  "Retargeting | 180D ATC",
  "Retargeting | 30D PV",
  "Advantage+ | Shopping",
  "Brand Awareness | Video",
  "Conversions | Cold",
  "Engagement | Warm",
];

const AD_SET_SUFFIXES = [
  "25-54 | iOS",
  "18-44 | Mobile",
  "US | All Placements",
  "LAL 3% | Purchase",
  "Interests | Wellness",
  "Stories | A+",
  "Reels Only",
];

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function pick<T>(list: T[], rnd: () => number): T {
  return list[Math.floor(rnd() * list.length)]!;
}

function round(n: number, decimals = 2) {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
}

function metricsFor(
  stage: FunnelStage,
  tier: "winner" | "mid" | "loser",
  rnd: () => number,
): CreativeMetrics {
  const base = { winner: 1.35, mid: 0.9, loser: 0.55 }[tier];
  const spend = round(600 + rnd() * 7400 * base);
  const impressions = Math.round(spend * (90 + rnd() * 80));
  const clicksRate =
    stage === "TOF"
      ? 0.008 + rnd() * 0.02
      : stage === "MOF"
        ? 0.014 + rnd() * 0.025
        : 0.018 + rnd() * 0.03;
  const clicks = Math.round(impressions * clicksRate * base);
  const landingPageViews = Math.round(clicks * (0.55 + rnd() * 0.35));
  const purchaseRate =
    stage === "BOF"
      ? 0.02 + rnd() * 0.06
      : stage === "MOF"
        ? 0.008 + rnd() * 0.02
        : 0.002 + rnd() * 0.01;
  const purchases = Math.max(0, Math.round(landingPageViews * purchaseRate * base));
  const aov = 42 + rnd() * 80;
  const revenue = round(purchases * aov);
  const roas = round(revenue / Math.max(spend, 1), 2);
  const hookRate = round(0.18 + rnd() * 0.4 * base, 3);
  const holdRate = round(0.06 + rnd() * 0.22 * base, 3);
  const ctr = round(clicks / Math.max(impressions, 1), 4);
  const cpa = purchases > 0 ? round(spend / purchases) : 0;
  return {
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
    landingPageViews,
    thumbstopRate: hookRate,
  };
}

const SUMMARIES: Record<string, (tier: "winner" | "mid" | "loser") => string> = {
  "UGC|Lifestyle": (tier) =>
    tier === "winner"
      ? "Native-feeling UGC opens on a relatable morning moment, cuts fast to product-in-hand. Framing feels organic and social-native — hook lands within 1.2s and retention holds past the 3s marker."
      : tier === "mid"
        ? "UGC setup is grounded but the hook drifts by the 2s mark. Product framing is clear but the emotional beat lacks urgency. Potential with a tighter first second and sharper VO."
        : "Creative reads as staged UGC. The hook is passive, no visual or emotional pattern interrupt, and product reveal arrives too late to earn attention in-feed.",
  "Talking Head|Founder-style": (tier) =>
    tier === "winner"
      ? "Founder-led talking head framed as expert testimony. Confidence in delivery plus tight subtitle pacing builds authority fast. Message aligns with a consideration-stage audience."
      : tier === "mid"
        ? "Founder POV carries warmth but the script buries the benefit behind backstory. Works as warm-stage nurture but under-indexes on cold prospecting."
        : "Talking head reads long and static. No visual motion, no subtitle rhythm, and the claim isn't substantiated. High drop-off past 3s.",
  "UGC|Before/After": (tier) =>
    tier === "winner"
      ? "Structured Before/After framed as a transformation. Split-screen intro and measurable outcome drive strong hold rate and conversion signal at BOF."
      : tier === "mid"
        ? "Before/After structure present but the delta reads thin. Needs clearer visual separation and a sharper CTA landing."
        : "Before/After framing is cluttered — viewers can't tell which state is which within the first second. Confusion is killing hold rate.",
  "Screen Recording|Demo": (tier) =>
    tier === "winner"
      ? "Screen-recording demo shows the product doing the thing. Functional, clean, direct-benefit messaging — over-indexes for mid-funnel consideration audiences."
      : tier === "mid"
        ? "Demo is clear but pacing is soft — too many seconds on the landing screen. Tighten the first 3s to lift hook rate."
        : "Screen recording opens on a login or setup screen — zero entertainment value on the hook. Consider moving the 'wow' moment to the first frame.",
  "Static Image|Text-led": (tier) =>
    tier === "winner"
      ? "Text-led static leads with a sharp numeric claim. High scannability, clean hierarchy, product support imagery carries just enough visual interest to hold scroll."
      : tier === "mid"
        ? "Static with a strong claim but the typography hierarchy flattens the message. Layout refinement could lift CTR without touching the copy."
        : "Static reads as a banner. Too much copy, competing sizes, no single focal point. Unlikely to convert against video.",
};

function pickSummary(asset: AssetType, visual: VisualFormat, tier: "winner" | "mid" | "loser"): string {
  const key = `${asset}|${visual}`;
  return SUMMARIES[key]?.(tier) ??
    `${asset} framed as ${visual.toLowerCase()}. The creative ${tier === "winner" ? "clears its funnel-stage bar with a confident hook, tight middle, and a conversion-oriented close" : tier === "mid" ? "lands the main beat but loses pacing in the middle third — a tighter cut would lift performance" : "struggles to hold the viewer through the first three seconds and needs a structural rework, not a copy tweak"}.`;
}

const STRENGTHS_POOL = [
  "Native, social-first framing — doesn't read as an ad on the feed.",
  "Strong hook within the first 1.2s of the timeline.",
  "Subtitle rhythm keeps pace with spoken VO.",
  "Product appears on-screen before the 3s retention drop.",
  "Clear singular visual focus in the first frame.",
  "Claim is backed by a specific, credible outcome.",
  "High contrast frame reads as a scroll pattern interrupt.",
  "Consistent brand tone without feeling corporate.",
];

const IMPROVEMENTS_POOL = [
  "Hook frame lacks a visual or emotional pattern interrupt.",
  "CTA is late — viewer drop-off before the action prompt.",
  "Subtitle timing lags the VO by ~180ms.",
  "Claim feels broad — no measurable proof anchor.",
  "Background reads as stock — breaks the UGC illusion.",
  "Pacing drags between 0:08 and 0:14.",
  "End card sits too long without reinforcing the offer.",
  "Price/offer is buried below the fold of the caption.",
];

const ITERATION_TEMPLATES: RecommendedIteration[] = [
  {
    id: "iter-1",
    title: "Swap opening frame with a direct outcome shot",
    effort: "Low",
    rationale: "Lead with the transformation instead of the setup — collapses the hook to < 1s.",
    expectedOutcome: "+12–18% hook rate, flatter drop-off curve past 3s.",
  },
  {
    id: "iter-2",
    title: "Tighten middle third (0:08–0:14)",
    effort: "Low",
    rationale: "Retention curve shows a clear drop mid-creative. Cut 2–3s of ambient coverage.",
    expectedOutcome: "+4–7pt hold rate, no script rewrite required.",
  },
  {
    id: "iter-3",
    title: "Rewrite VO opening line as a contrarian hook",
    effort: "Medium",
    rationale: "Claim currently reads as benefit. Flip to 'Stop doing X' to create immediate tension.",
    expectedOutcome: "Lifts CTR in cold placements, especially Reels.",
  },
  {
    id: "iter-4",
    title: "Reshoot with founder on-camera",
    effort: "High",
    rationale: "Message carries more weight delivered by a face than voice-over + stock visuals.",
    expectedOutcome: "Trust lift for MOF audiences; compounds with retargeting.",
  },
  {
    id: "iter-5",
    title: "A/B a subtitle-only cut",
    effort: "Low",
    rationale: "Remove VO and lead with punchy text chips timed to the cut. Sound-off friendly.",
    expectedOutcome: "Helps in sound-off placements; tests language clarity.",
  },
  {
    id: "iter-6",
    title: "Add social proof end-card with customer quote",
    effort: "Low",
    rationale: "Close the creative on a specific customer result rather than brand logo.",
    expectedOutcome: "Higher conversion lift for BOF retargeting audiences.",
  },
];

function buildAiAnalysis(
  creativeId: string,
  concept: (typeof AD_CONCEPTS)[number],
  tier: "winner" | "mid" | "loser",
  rnd: () => number,
): AIAnalysis {
  const strengths = [...STRENGTHS_POOL]
    .sort(() => rnd() - 0.5)
    .slice(0, tier === "winner" ? 4 : tier === "mid" ? 3 : 2);
  const improvements = [...IMPROVEMENTS_POOL]
    .sort(() => rnd() - 0.5)
    .slice(0, tier === "loser" ? 4 : 3);
  const iterations = [...ITERATION_TEMPLATES]
    .sort(() => rnd() - 0.5)
    .slice(0, 4)
    .map((t, i) => ({ ...t, id: `${creativeId}_iter_${i}` }));

  return {
    id: `${creativeId}_ai`,
    creativeId,
    status: "complete",
    assetType: concept.asset,
    visualFormat: concept.visual,
    messagingAngle: concept.angle,
    hookTactic: concept.hook,
    offerType: concept.offer,
    funnelStage: concept.stage,
    summary: pickSummary(concept.asset, concept.visual, tier),
    strengths,
    areasToImprove: improvements,
    recommendedIterations: iterations,
    analyzedAt: daysAgoIso(Math.floor(rnd() * 8)),
  };
}

function titleCaseFrom(seedStr: string, idx: number): string {
  const nouns = ["Launch", "Drop", "Push", "Run", "Wave", "Refresh", "Test", "Batch", "Edit", "Cut"];
  return `${seedStr} · ${pick(nouns, seededRandom(idx + 9))} ${String(idx).padStart(2, "0")}`;
}

function seedCreativesForAccount(account: Account, startIdx: number, count: number): Creative[] {
  const result: Creative[] = [];
  for (let i = 0; i < count; i++) {
    const idx = startIdx + i;
    const rnd = seededRandom(idx * 2 + 17);
    const concept = pick(AD_CONCEPTS, rnd);
    const tier: "winner" | "mid" | "loser" =
      rnd() < 0.28 ? "winner" : rnd() < 0.72 ? "mid" : "loser";
    const metrics = metricsFor(concept.stage, tier, rnd);
    const hadDelivery = metrics.impressions > 400;
    const creativeId = `cr_${account.metaAccountId.slice(-6)}_${idx}`;
    const campaign = pick(CAMPAIGN_NAMES, rnd);
    const adSet = `${pick(AD_SET_SUFFIXES, rnd)}`;
    const name = titleCaseFrom(concept.concept, idx);
    const ai = buildAiAnalysis(creativeId, concept, tier, rnd);
    const thumb = THUMB_PALETTE[idx % THUMB_PALETTE.length]!;
    result.push({
      id: creativeId,
      accountId: account.id,
      adId: `ad_${100000 + idx}`,
      campaignId: `cmp_${100 + (idx % 8)}`,
      campaignName: campaign,
      adSetId: `adset_${200 + (idx % 16)}`,
      adSetName: adSet,
      name,
      mediaType: concept.media,
      previewUrl: "",
      thumbnailColor: thumb,
      hadDelivery,
      activeStatus: rnd() < 0.78 ? "active" : rnd() < 0.92 ? "paused" : "archived",
      effectiveStatus: null,
      createdAt: daysAgoIso(Math.floor(rnd() * 45) + 3),
      updatedAt: daysAgoIso(Math.floor(rnd() * 4)),
      lastSyncedAt: null,
      metrics,
      ai,
    });
  }
  return result;
}

export function defaultSettings(): Settings {
  return {
    metaAccessToken: "",
    metaAppId: "",
    metaAppSecret: "",
    serverEnvToken: false,
    syncFrequency: "manual",
    reportAutomation: "manual",
    minSpendForAi: 250,
    winningThresholds: {
      tof: { minHookRate: 0.25, minHoldRate: 0.1, minCtr: 0.012, minSpend: 250 },
      mof: { minCtr: 0.02, minRoas: 1.5, minSpend: 500 },
      bof: { minRoas: 2.0, minPurchases: 5, maxCpa: 45, minSpend: 500 },
    },
    coaching: {
      vertical: "dtc",
      brandVoice: "plain_spoken",
      riskTolerance: "balanced",
      notes: "",
    },
    attribution: {
      pixelId: "",
      capiAccessToken: "",
      webhookSecret: "",
      testEventCode: "",
      stageMap: {
        lead: "Lead",
        mql: "Lead",
        demo_booked: "Schedule",
        demo_attended: "Contact",
        proposal: "InitiateCheckout",
        closed_won: "Purchase",
        closed_lost: "",
      },
      defaultCurrency: "USD",
    },
    automation: {
      twilio: {
        accountSid: "",
        authToken: "",
        recordingWebhookEnabled: false,
      },
      automations: {
        leads: true,
        twilio: false,
        googleCalendar: false,
        pipeline: true,
        adAnalyst: true,
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function seedAccounts(): Account[] {
  return ACCOUNT_SEEDS.map((seed, i) => {
    const id = `acc_${seed.metaAccountId.slice(-6)}`;
    const isActive = seed.isActive ?? true;
    return {
      id,
      metaAccountId: seed.metaAccountId,
      name: seed.name,
      isActive,
      status: isActive ? "active" : "disconnected",
      lastSyncedAt: isActive ? daysAgoIso(i === 0 ? 0 : i) : null,
      createdAt: daysAgoIso(60 + i * 5),
      updatedAt: daysAgoIso(i),
      accessTokenMask: isActive ? "EAAB••••••••••••••••2f" : undefined,
    };
  });
}

export function seedCreatives(accounts: Account[]): Creative[] {
  const creatives: Creative[] = [];
  let idx = 0;
  for (const account of accounts) {
    if (!account.isActive) continue;
    const perAccount = account.name.includes("Nova")
      ? 42
      : account.name.includes("Summit")
        ? 34
        : account.name.includes("Mornthreads")
          ? 26
          : account.name.includes("Kinetic")
            ? 20
            : 10;
    creatives.push(...seedCreativesForAccount(account, idx, perAccount));
    idx += perAccount;
  }
  // Prepend the vision-analyzable showcase so they're easy to find at the top
  // of the creatives table.
  const firstAccount = accounts.find((a) => a.isActive);
  if (firstAccount) {
    creatives.unshift(...buildVisionShowcaseCreatives(firstAccount));
  }
  return creatives;
}

/**
 * Creatives with real public MP4 URLs so the user can see Gemini actually
 * watch the video (Files API → ACTIVE → vision inference). Mixed short-form
 * test videos; Gemini will classify from the actual content, not the name.
 */
function buildVisionShowcaseCreatives(account: Account): Creative[] {
  const baseSeeds: Array<{
    previewUrl: string;
    name: string;
    campaign: string;
    adSet: string;
    mediaType: MediaType;
    tier: "winner" | "mid" | "loser";
    stage: FunnelStage;
  }> = [
    {
      previewUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      name: "🎥 Showcase · Short Clip A",
      campaign: "Prospecting | US | Broad",
      adSet: "Reels Only",
      mediaType: "video",
      tier: "mid",
      stage: "TOF",
    },
    {
      previewUrl: "https://download.samplelib.com/mp4/sample-5s.mp4",
      name: "🎥 Showcase · 5-Second Cut",
      campaign: "Prospecting | US | Lookalike 1%",
      adSet: "US | All Placements",
      mediaType: "video",
      tier: "winner",
      stage: "TOF",
    },
    {
      previewUrl: "https://download.samplelib.com/mp4/sample-10s.mp4",
      name: "🎥 Showcase · 10-Second Hook Test",
      campaign: "Advantage+ | Shopping",
      adSet: "18-44 | Mobile",
      mediaType: "video",
      tier: "mid",
      stage: "MOF",
    },
    {
      previewUrl: "https://download.samplelib.com/mp4/sample-15s.mp4",
      name: "🎥 Showcase · 15-Second Story",
      campaign: "Retargeting | 30D PV",
      adSet: "LAL 3% | Purchase",
      mediaType: "video",
      tier: "winner",
      stage: "BOF",
    },
    {
      previewUrl: "https://download.samplelib.com/mp4/sample-30s.mp4",
      name: "🎥 Showcase · 30-Second Spot",
      campaign: "Conversions | Cold",
      adSet: "Stories | A+",
      mediaType: "video",
      tier: "loser",
      stage: "MOF",
    },
  ];
  return baseSeeds.map((seed, i) => {
    const rnd = seededRandom(9001 + i);
    const metrics = metricsFor(seed.stage, seed.tier, rnd);
    const creativeId = `cr_showcase_${i}`;
    // Use a minimal AI record so the user can see the "pending" → "complete"
    // transition when they click Analyze. Status "pending" makes it obvious
    // these are the ones to run.
    const ai: AIAnalysis = {
      id: `${creativeId}_ai`,
      creativeId,
      status: "pending",
      assetType: "UGC",
      visualFormat: "Lifestyle",
      messagingAngle: "Value Proposition",
      hookTactic: "Curiosity Gap",
      offerType: "No Offer",
      funnelStage: seed.stage,
      summary:
        "Pending Gemini vision analysis — click Re-analyze (or Analyze all) to have the video watched frame by frame.",
      strengths: [],
      areasToImprove: [],
      recommendedIterations: [],
      analyzedAt: null,
    };
    return {
      id: creativeId,
      accountId: account.id,
      adId: `ad_showcase_${i}`,
      campaignId: `cmp_showcase_${i}`,
      campaignName: seed.campaign,
      adSetId: `adset_showcase_${i}`,
      adSetName: seed.adSet,
      name: seed.name,
      mediaType: seed.mediaType,
      previewUrl: seed.previewUrl,
      thumbnailColor: THUMB_PALETTE[i % THUMB_PALETTE.length]!,
      hadDelivery: true,
      activeStatus: "active",
      effectiveStatus: null,
      createdAt: daysAgoIso(2 + i),
      updatedAt: daysAgoIso(1),
      lastSyncedAt: null,
      metrics,
      ai,
    };
  });
}

export function seedReports(accounts: Account[]): Report[] {
  return accounts.slice(0, 3).map((a, i) => ({
    id: `rep_${a.id}_${i}`,
    name: `${a.name} · Creative Review · Wk ${14 + i}`,
    accountId: a.id,
    accountName: a.name,
    dateRange: {
      start: daysAgoIso(7 + i * 7),
      end: daysAgoIso(i * 7),
    },
    status: "ready",
    generatedAt: daysAgoIso(i * 7),
    summary: {
      totalCreatives: 28 - i * 3,
      winners: 7 - i,
      winRate: (7 - i) / (28 - i * 3),
      blendedRoas: 2.4 - i * 0.2,
      topAssetType: "UGC",
      topMessagingAngle: "Problem/Solution",
      keyIterations: [
        "Lead with the outcome in frame 1",
        "Tighten the middle third (0:08–0:14)",
        "Test a subtitle-only, sound-off edit",
      ],
    },
  }));
}
