export type MediaType = "video" | "image";

export type AIStatus = "complete" | "pending" | "failed";

export type FunnelStage = "TOF" | "MOF" | "BOF";

export type Recommendation = "scale" | "watch" | "kill";

export type DecisionVerdict = "scale" | "kill" | "refresh" | "hold_for_data" | "monitor";
export type DecisionUrgency = "immediate" | "soon" | "when_convenient";
export type DecisionConfidence = "low" | "medium" | "high";

export interface DecisionReason {
  signal: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
}

export interface Decision {
  verdict: DecisionVerdict;
  confidence: DecisionConfidence;
  urgency: DecisionUrgency;
  score: number; // 0-100, same scale as scoreCreative
  reasons: DecisionReason[];
  headline: string; // one-sentence verdict ("Ready to scale — 25% budget lift")
  action: string; // prescriptive action ("Scale +25% over 48h, watch frequency next 72h")
  estimatedDailyLoss?: number; // for kill verdicts on actively spending creatives
  estimatedDailyGain?: number; // for scale verdicts
}

export type AssetType =
  | "UGC"
  | "Stock Footage"
  | "Animation"
  | "Static Image"
  | "3D Production"
  | "Screen Recording"
  | "Talking Head";

export type VisualFormat =
  | "Talking Head"
  | "Demo"
  | "Lifestyle"
  | "Product Showcase"
  | "Text-led"
  | "Founder-style"
  | "Screen Recording"
  | "Before/After";

export type MessagingAngle =
  | "Authority/Expert"
  | "Problem/Solution"
  | "Exclusivity"
  | "Aspiration"
  | "Comparison"
  | "Information"
  | "Social Proof"
  | "Pain Point"
  | "Value Proposition";

export type HookTactic =
  | "Curiosity Gap"
  | "Direct Benefit"
  | "Pattern Interrupt"
  | "Problem Hook"
  | "Authority Hook"
  | "Contrarian Hook"
  | "Bold Claim"
  | "Story Hook";

export type OfferType =
  | "No Offer"
  | "Discount"
  | "Bundle"
  | "Free Trial"
  | "Free Shipping"
  | "Limited Time"
  | "Lead Magnet";

export interface Account {
  id: string;
  metaAccountId: string;
  name: string;
  isActive: boolean;
  status: "active" | "paused" | "disconnected";
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  accessTokenMask?: string;
}

export interface CreativeMetrics {
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
}

export type FeedbackRating = "up" | "down";

export interface AnalysisFeedback {
  rating: FeedbackRating;
  note: string;
  ratedAt: string;
}

export interface AIAnalysis {
  id: string;
  creativeId: string;
  status: AIStatus;
  assetType: AssetType;
  visualFormat: VisualFormat;
  messagingAngle: MessagingAngle;
  hookTactic: HookTactic;
  offerType: OfferType;
  funnelStage: FunnelStage;
  summary: string;
  strengths: string[];
  areasToImprove: string[];
  recommendedIterations: RecommendedIteration[];
  analyzedAt: string | null;
  feedback?: AnalysisFeedback;
}

/**
 * Captured at rating time so it can be replayed as a few-shot exemplar
 * in future analyses. A frozen snapshot — not a live reference.
 */
export interface CoachingExemplar {
  id: string;
  creativeName: string;
  mediaType: MediaType;
  funnelStage: FunnelStage;
  metricsSnapshot: {
    spend: number;
    ctr: number;
    roas: number;
    hookRate: number;
    holdRate: number;
    cpa: number;
  };
  analysisSnapshot: {
    summary: string;
    strengths: string[];
    areasToImprove: string[];
  };
  rating: FeedbackRating;
  note: string;
  ratedAt: string;
}

export interface RecommendedIteration {
  id: string;
  title: string;
  effort: "Low" | "Medium" | "High";
  rationale: string;
  expectedOutcome: string;
}

export interface Creative {
  id: string;
  accountId: string;
  adId: string; // Meta ad_id — canonical dedup key (accountId + adId is unique)
  campaignId: string | null;
  campaignName: string;
  adSetId: string | null;
  adSetName: string;
  name: string;
  mediaType: MediaType;
  previewUrl: string;
  thumbnailColor: string;
  hadDelivery: boolean;
  activeStatus: "active" | "paused" | "archived";
  effectiveStatus: string | null; // Meta effective_status when live-synced
  createdAt: string; // maps to Meta created_time
  updatedAt: string;
  lastSyncedAt: string | null;
  metrics: CreativeMetrics;
  ai: AIAnalysis;
}

export interface Report {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  dateRange: { start: string; end: string };
  status: "ready" | "generating" | "failed";
  generatedAt: string | null;
  summary: {
    totalCreatives: number;
    winners: number;
    winRate: number;
    blendedRoas: number;
    topAssetType: string;
    topMessagingAngle: string;
    keyIterations: string[];
  };
}

export type Vertical =
  | "dtc"
  | "saas"
  | "lead_gen"
  | "fintech"
  | "supplements"
  | "apparel"
  | "beauty"
  | "education"
  | "other";

export type BrandVoice =
  | "plain_spoken"
  | "playful"
  | "authoritative"
  | "minimal"
  | "luxury"
  | "founder_led"
  | "custom";

export type RiskTolerance = "aggressive" | "balanced" | "conservative";

export interface CoachingPreferences {
  vertical: Vertical;
  brandVoice: BrandVoice;
  riskTolerance: RiskTolerance;
  notes: string;
}

export interface AttributionSettings {
  pixelId: string;
  capiAccessToken: string;
  webhookSecret: string;
  testEventCode: string; // Meta test_event_code for staging
  /** Stage → Meta event name mapping. Fires on CRM webhook. */
  stageMap: Record<string, string>;
  defaultCurrency: string;
}

export interface TwilioSettings {
  accountSid: string;
  authToken: string; // used to verify inbound webhook signatures
  recordingWebhookEnabled: boolean;
}

export interface AutomationSettings {
  twilio: TwilioSettings;
  automations: {
    leads: boolean;
    twilio: boolean;
    googleCalendar: boolean;
    pipeline: boolean;
    adAnalyst: boolean;
  };
}

export interface TwilioCall {
  id: string;
  leadId: string | null;
  twilioCallSid: string | null;
  direction: string | null;
  fromNumber: string | null;
  toNumber: string | null;
  status: string | null;
  durationSec: number | null;
  recordingUrl: string | null;
  transcription: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface GoogleOAuthStatus {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}

export interface CalendarEventRow {
  id: string;
  googleEventId: string;
  title: string | null;
  description: string | null;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  status: string | null;
  attendees: Array<{ email: string; displayName?: string }> | null;
  organizerEmail: string | null;
  htmlLink: string | null;
}

export interface LeadActivityRow {
  id: string;
  leadId: string | null;
  actor: "user" | "crm_webhook" | "pipeline_ui" | "cron" | "api" | "system";
  eventType:
    | "lead_created"
    | "stage_changed"
    | "capi_fired"
    | "value_updated"
    | string;
  fromStage: string | null;
  toStage: string | null;
  value: number | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export type LeadStage =
  | "lead"
  | "mql"
  | "demo_booked"
  | "demo_attended"
  | "proposal"
  | "closed_won"
  | "closed_lost";

export interface Lead {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  fbclid: string | null;
  fbc: string | null;
  fbp: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  landingUrl: string | null;
  referrer: string | null;
  stage: LeadStage;
  value: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface CapiEvent {
  id: string;
  leadId: string | null;
  eventName: string;
  eventTime: string;
  eventId: string;
  value: number | null;
  currency: string | null;
  status: "queued" | "sent" | "failed";
  httpStatus: number | null;
  metaResponse: unknown;
  retryCount: number;
  sentAt: string | null;
  createdAt: string;
}

export interface WinningThresholds {
  tof: { minHookRate: number; minHoldRate: number; minCtr: number; minSpend: number };
  mof: { minCtr: number; minRoas: number; minSpend: number };
  bof: { minRoas: number; minPurchases: number; maxCpa: number; minSpend: number };
}

export interface Settings {
  metaAccessToken: string;
  metaAppId: string;
  metaAppSecret: string;
  serverEnvToken: boolean;
  syncFrequency: "manual" | "daily" | "hourly";
  reportAutomation: "manual" | "weekly" | "monthly";
  minSpendForAi: number;
  winningThresholds: WinningThresholds;
  coaching: CoachingPreferences;
  attribution: AttributionSettings;
  automation: AutomationSettings;
  updatedAt: string;
}

export type DateRange =
  | "last_7_days"
  | "last_14_days"
  | "last_30_days"
  | "last_90_days"
  | "mtd"
  | "qtd"
  | "ytd";

export type AdDeliveryFilter = "all" | "had_delivery" | "active";

export type GroupByKey =
  | "none"
  | "assetType"
  | "messagingAngle"
  | "hookTactic"
  | "visualFormat"
  | "funnelStage"
  | "campaign"
  | "adType";

export type ViewMode = "table" | "grid";

export interface SyncSummary {
  mode: "live" | "demo" | "error";
  accountId: string;
  metaAccountId: string;
  added: number;
  updated: number;
  unchanged: number;
  total: number; // total ads returned by Meta for this account
  message: string;
  errorCode?: string;
  errorDetail?: string;
  syncedAt: string;
}
