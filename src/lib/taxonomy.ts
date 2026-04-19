import type {
  AssetType,
  FunnelStage,
  HookTactic,
  MessagingAngle,
  OfferType,
  VisualFormat,
} from "@/types";

export const ASSET_TYPES: AssetType[] = [
  "UGC",
  "Stock Footage",
  "Animation",
  "Static Image",
  "3D Production",
  "Screen Recording",
  "Talking Head",
];

export const VISUAL_FORMATS: VisualFormat[] = [
  "Talking Head",
  "Demo",
  "Lifestyle",
  "Product Showcase",
  "Text-led",
  "Founder-style",
  "Screen Recording",
  "Before/After",
];

export const MESSAGING_ANGLES: MessagingAngle[] = [
  "Authority/Expert",
  "Problem/Solution",
  "Exclusivity",
  "Aspiration",
  "Comparison",
  "Information",
  "Social Proof",
  "Pain Point",
  "Value Proposition",
];

export const HOOK_TACTICS: HookTactic[] = [
  "Curiosity Gap",
  "Direct Benefit",
  "Pattern Interrupt",
  "Problem Hook",
  "Authority Hook",
  "Contrarian Hook",
  "Bold Claim",
  "Story Hook",
];

export const OFFER_TYPES: OfferType[] = [
  "No Offer",
  "Discount",
  "Bundle",
  "Free Trial",
  "Free Shipping",
  "Limited Time",
  "Lead Magnet",
];

export const FUNNEL_STAGES: FunnelStage[] = ["TOF", "MOF", "BOF"];

export const FUNNEL_LABEL: Record<FunnelStage, string> = {
  TOF: "Top of Funnel (Awareness)",
  MOF: "Middle of Funnel (Consideration)",
  BOF: "Bottom of Funnel (Conversion)",
};

export const GROUP_BY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "assetType", label: "Asset Type" },
  { value: "messagingAngle", label: "Messaging Angle" },
  { value: "hookTactic", label: "Hook Tactic" },
  { value: "visualFormat", label: "Visual Format" },
  { value: "funnelStage", label: "Funnel Stage" },
  { value: "campaign", label: "Campaign" },
  { value: "adType", label: "Ad Type" },
] as const;
