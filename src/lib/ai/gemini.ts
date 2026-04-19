import "server-only";
import {
  ASSET_TYPES,
  HOOK_TACTICS,
  MESSAGING_ANGLES,
  OFFER_TYPES,
  VISUAL_FORMATS,
  FUNNEL_STAGES,
} from "@/lib/taxonomy";
import type {
  AssetType,
  CoachingExemplar,
  CoachingPreferences,
  FunnelStage,
  HookTactic,
  MessagingAngle,
  OfferType,
  RecommendedIteration,
  VisualFormat,
} from "@/types";

export const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * JSON Schema fed to Gemini's `responseSchema` — forces the model to emit a
 * payload that maps cleanly onto our `AIAnalysis` type.
 */
const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    assetType: { type: "string", enum: ASSET_TYPES },
    visualFormat: { type: "string", enum: VISUAL_FORMATS },
    messagingAngle: { type: "string", enum: MESSAGING_ANGLES },
    hookTactic: { type: "string", enum: HOOK_TACTICS },
    offerType: { type: "string", enum: OFFER_TYPES },
    funnelStage: { type: "string", enum: FUNNEL_STAGES },
    summary: {
      type: "string",
      description:
        "2–4 sentence critique of the creative. Must reference at least one specific metric value and its funnel-stage benchmark.",
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      description:
        "3–5 bullets. Each bullet MUST cite a concrete metric value, a stage benchmark, or a named creative-format convention. No generic praise.",
    },
    areasToImprove: {
      type: "array",
      items: { type: "string" },
      description:
        "3–5 bullets. Each bullet MUST cite a metric shortfall, a funnel-stage mismatch, or a structural issue inferred from the creative signal.",
    },
    recommendedIterations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          effort: { type: "string", enum: ["Low", "Medium", "High"] },
          rationale: {
            type: "string",
            description:
              "Why this change addresses a specific weakness — reference the metric or funnel-stage reason.",
          },
          expectedOutcome: {
            type: "string",
            description:
              "Concrete metric impact you'd expect. Quantify when possible (e.g. '+4–7pt hold rate').",
          },
        },
        required: ["title", "effort", "rationale", "expectedOutcome"],
      },
    },
  },
  required: [
    "assetType",
    "visualFormat",
    "messagingAngle",
    "hookTactic",
    "offerType",
    "funnelStage",
    "summary",
    "strengths",
    "areasToImprove",
    "recommendedIterations",
  ],
} as const;

export interface GeminiAnalysisInput {
  name: string;
  campaignName: string;
  adSetName: string;
  mediaType: "video" | "image";
  previewUrl?: string;
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
  };
  currentFunnelStage: FunnelStage;
  coaching?: CoachingPreferences;
  exemplars?: {
    approved: CoachingExemplar[];
    rejected: CoachingExemplar[];
  };
}

const VERTICAL_LABEL: Record<string, string> = {
  dtc: "Direct-to-consumer e-commerce",
  saas: "SaaS / productivity software",
  lead_gen: "Lead generation (form-fills)",
  fintech: "Fintech / financial services",
  supplements: "Supplements / health products",
  apparel: "Apparel / fashion",
  beauty: "Beauty / skincare",
  education: "Education / info products",
  other: "Other",
};

const BRAND_VOICE_LABEL: Record<string, string> = {
  plain_spoken: "Plain-spoken — direct, unadorned, zero jargon",
  playful: "Playful — witty, self-aware, gently irreverent",
  authoritative: "Authoritative — expert, declarative, credentialed",
  minimal: "Minimal — ultra-tight copy, lots of negative space in prescriptions",
  luxury: "Luxury — restrained, aspirational, emotional rather than feature-led",
  founder_led: "Founder-led — personal, candid, first-person",
  custom: "Custom — follow the notes field verbatim",
};

const RISK_LABEL: Record<string, string> = {
  aggressive: "Aggressive scaling — favor bold iterations, tolerate short-term CPA spikes for learning",
  balanced: "Balanced — recommend the most expected-value change first, then upside bets",
  conservative: "Conservative — prioritize preserving current ROAS, no reshoots without strong evidence",
};

export interface GeminiAnalysisResult {
  assetType: AssetType;
  visualFormat: VisualFormat;
  messagingAngle: MessagingAngle;
  hookTactic: HookTactic;
  offerType: OfferType;
  funnelStage: FunnelStage;
  summary: string;
  strengths: string[];
  areasToImprove: string[];
  recommendedIterations: Omit<RecommendedIteration, "id">[];
}

function formatPct(n: number, digits = 2) {
  return `${(n * 100).toFixed(digits)}%`;
}

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function renderExemplar(e: CoachingExemplar): string {
  const m = e.metricsSnapshot;
  return `Creative: ${e.creativeName} (${e.funnelStage}, ${e.mediaType})
Snapshot: spend $${Math.round(m.spend)}, ROAS ${m.roas.toFixed(2)}×, CTR ${(m.ctr * 100).toFixed(2)}%, hook ${(m.hookRate * 100).toFixed(1)}%, hold ${(m.holdRate * 100).toFixed(1)}%
Past critique that the buyer ${e.rating === "up" ? "APPROVED" : "REJECTED"}:
> ${e.analysisSnapshot.summary}
${e.note ? `Buyer's note: "${e.note}"` : ""}`.trim();
}

function buildCoachingBlock(input: GeminiAnalysisInput): string {
  if (!input.coaching && !input.exemplars) return "";
  const parts: string[] = [];

  if (input.coaching) {
    const c = input.coaching;
    parts.push(`# COACHING CONTEXT — SET BY THIS BUYER

Vertical:        ${VERTICAL_LABEL[c.vertical] ?? c.vertical}
Brand voice:     ${BRAND_VOICE_LABEL[c.brandVoice] ?? c.brandVoice}
Risk tolerance:  ${RISK_LABEL[c.riskTolerance] ?? c.riskTolerance}
Buyer notes:     ${c.notes.trim() ? c.notes.trim() : "(none)"}

Apply these as calibration, not as copy. The critique still has to be true to the creative — coaching context shapes *how* you say it and which iterations rank first.`);
  }

  const approved = input.exemplars?.approved ?? [];
  const rejected = input.exemplars?.rejected ?? [];

  if (approved.length > 0) {
    parts.push(`# APPROVED EXEMPLARS — EMULATE THIS VOICE AND SPECIFICITY

The buyer rated these past critiques as "on the money". Match their level of specificity, directness, and prescription quality. These are the bar.

${approved.map(renderExemplar).join("\n\n---\n\n")}`);
  }

  if (rejected.length > 0) {
    parts.push(`# REJECTED EXEMPLARS — AVOID THIS PATTERN

The buyer rated these critiques as off-base. Do NOT replicate their tone, vagueness, or prescription style. If the buyer left a note, that's the primary signal about why they rejected it.

${rejected.map(renderExemplar).join("\n\n---\n\n")}`);
  }

  return parts.join("\n\n");
}

function buildPrompt(input: GeminiAnalysisInput): string {
  const m = input.metrics;
  const coachingBlock = buildCoachingBlock(input);
  return `${coachingBlock}${coachingBlock ? "\n\n" : ""}# ROLE

You are a senior performance-creative strategist with 18 years of in-the-trenches experience at top DTC brands and direct-response agencies. You've personally shipped >$400M in Meta ad spend across apparel, supplements, SaaS, fintech, and lead-gen. You've seen fads come and go. You don't pattern-match on buzzwords; you pattern-match on *why* a creative converts or fails.

You are reviewing this creative as if the media buyer just pulled you into a Slack huddle and asked "coach me — what do I do with this?" Your tone is calm, specific, direct. You don't flatter. You don't hedge. You don't over-explain basics. But you show *your* reasoning so the buyer learns something.

# PHILOSOPHY (use this lens)

Every ad must win three battles — in order:
1. **Attention** (frames 1–3) — the scroll either stops or it doesn't
2. **Comprehension** (seconds 3–15) — can the viewer tell what this is and why they should care, in their native format (sound-off, thumb-on-glass)
3. **Belief** (seconds 15+) — is the claim supported with proof, emotion, or identity

Metrics diagnose which battle was lost. Craft explains *why*. A good coach reads both.

# HARD RULES

1. **Cite real signal, not vibes.** Every strength / improvement / iteration MUST tie to one of: a metric value from the payload, a stage benchmark it clears or misses, a named short-form convention (hook <1.2s, subtitle rhythm matches VO, 9:16 safe area, sound-off subtitles, pattern interrupt, identity cue), or — if vision is attached — a specific visual moment with a timecode (e.g. "at 0:04, when the camera pushes in").
2. **No hollow praise.** Strings like "strong creative", "engaging visuals", "clear CTA", "good pacing" are banned. Describe *what* is strong and *why it matters in this funnel stage*.
3. **No hedged prescriptions.** No "consider", "maybe", "you could try". A 15-year coach commits. Use "move", "cut", "replace", "lead with".
4. **Diagnose the single biggest failure mode first.** If hook rate is 14% on TOF, that's the story — don't spread the critique across 4 equal-weighted gripes. Name the dominant problem in the summary.
5. **Funnel stage discipline.** If metrics contradict the tag (BOF label but TOF-style cold-traffic profile, or vice-versa), reassign the \`funnelStage\` in your output and call it out in the summary. Do not rubber-stamp the input tag.
6. **Taxonomy values come from the enums.** Do not invent values.
7. **Iterations earn their place.** Each iteration fixes a specific weakness already named in \`areasToImprove\`. Low effort first (swap, trim, subtitle fix), then Medium (script rewrite, re-edit), then High (reshoot, new concept). Max 4 iterations total — fewer is better. Quantify the expected outcome when you can ("+4–7pt hold rate").

# HEURISTICS FROM 18 YEARS OF SHIPPING

Apply these like instincts, don't recite them:

- **Hook rate ceilings.** 25% is the TOF floor on Meta Reels in 2025. Under 20%, the first frame is broken — not the script.
- **Hold rate is the creator's metric.** It's how long you kept attention *after* earning it. A great hook + weak hold = disjointed middle.
- **CTR without conversion = landing-page mismatch.** If CTR is strong but ROAS is weak, the ad worked. The next page didn't.
- **CPA spikes with stable CTR = offer fatigue or creative-audience mismatch**, not a craft problem.
- **Sound-off first.** 80%+ of Meta plays are muted. If the ad requires VO to make sense, it's broken for the majority.
- **The first 1.2s is non-negotiable.** Logo intros, slow zooms, "hey guys" openings are all disqualifying for paid.
- **Subtitles are the hook's cousin.** Punchy, 3–4 word chunks that beat the VO by ~60ms feel alive; matching VO word-for-word feels tired.
- **UGC wins TOF when it feels un-produced**; loses when the lighting or audio betrays it's staged.
- **Founder face beats actor face for trust-led MOF.** Actor face beats founder face for aspiration-led TOF.
- **Show the product doing the thing within the first 5s, or earn an extension with a sharp promise.**
- **Before/After needs the delta visible in <1s.** If the viewer has to figure out which state is which, you've lost them.
- **Demos lose when they open on the setup screen.** Open on the "wow" moment, cut back to setup.
- **Retargeting BOF tolerates lower hook rates but intolerant of weak offers.** TOF is the opposite.
- **Text-led statics beat video at $0.50–$2 hook rate cost when the claim is numeric and specific.**
- **Social proof belongs after the claim, not before.** Lead with the transformation; prove it in the second half.
- **End cards earn attention only if they pay off a promise made earlier.** Otherwise they're wasted seconds.
- **Carousels decay fast.** If ROAS drops 20% week-over-week with spend flat, you're in decay — not a spend problem.

# ANTI-PATTERNS (disqualifying output)

- Restating the metric without interpreting it: *"CTR is 1.22%"* → interpreted: *"CTR of 1.22% just clears the 1.2% TOF floor — the ad earned its click but not with room to spare"*
- Critiquing "pacing" without referencing a timecode
- Recommending 5 equal-weight changes
- Iterations that are really just "make it better"
- Defending the funnel tag when metrics scream otherwise
- Using the word "compelling"

# COACHING VOICE

Speak directly to the buyer, not about the ad. "Your hook opens on…", "You're leaving attention on the table at 0:04…", "The fix is cheaper than you think…". Be the senior who's been there.

# STAGE BENCHMARKS (default unless overridden)

- **TOF:** hook_rate ≥ 25%, hold_rate ≥ 10%, CTR ≥ 1.2%, min spend $250
- **MOF:** CTR ≥ 2%, ROAS ≥ 1.5×, min spend $500
- **BOF:** ROAS ≥ 2.0×, purchases ≥ 5, CPA ≤ $45, min spend $500

# THINK BEFORE YOU WRITE

Internally, before emitting the JSON:
1. What does the funnel stage *actually* look like given these metrics? (attention problem? conversion problem? offer problem?)
2. What is the *single* dominant failure mode — and what evidence in metrics or visuals supports it?
3. If I had to prescribe ONE change, what would it be? (that's iteration #1)
4. What's the bigger bet that might 2× the outcome? (that's iteration #3 or #4)
5. Would a creative strategist with no context read my summary and understand what this ad is doing and why it works / fails? If not, rewrite.

# CREATIVE UNDER REVIEW

Ad name:           ${input.name}
Campaign:          ${input.campaignName}
Ad set:            ${input.adSetName}
Media type:        ${input.mediaType}
Current stage tag: ${input.currentFunnelStage}
Asset attached:    ${input.previewUrl ? "YES — you can see the video/image; reference visual moments with timecodes" : "NO — reason from name + metrics; do not invent visual details you can't infer"}

Performance (last 30 days)
--------------------------
Spend:              ${formatMoney(m.spend)}
Impressions:        ${m.impressions.toLocaleString("en-US")}
Clicks:             ${m.clicks.toLocaleString("en-US")}
CTR:                ${formatPct(m.ctr, 2)}
Hook rate (3s):     ${formatPct(m.hookRate, 1)}
Hold rate (15s):    ${formatPct(m.holdRate, 1)}
Landing page views: ${m.landingPageViews.toLocaleString("en-US")}
Purchases:          ${m.purchases}
Revenue:            ${formatMoney(m.revenue)}
ROAS:               ${m.roas.toFixed(2)}×
CPA:                ${m.cpa > 0 ? formatMoney(m.cpa) : "—"}

Now deliver the coach's read. Emit the structured JSON required by the schema.`;
}

/**
 * Uploads a media asset to the Gemini Files API and waits for it to reach
 * ACTIVE state. Returns the file URI + mime type usable in a `file_data` part.
 * Used for videos (and large images) — too big for inline_data.
 */
async function uploadMediaToGemini(
  url: string,
  fallbackMime: string,
): Promise<{ fileUri: string; mimeType: string; fileName: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY!;
  let buffer: Buffer;
  let mime = fallbackMime;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    buffer = Buffer.from(await res.arrayBuffer());
    mime = res.headers.get("content-type") || fallbackMime;
  } catch {
    return null;
  }
  // Gemini Files API accepts up to 2GB per file but free tier caps at 20GB
  // across all active files. Short-form ads fit comfortably.
  if (buffer.byteLength > 100 * 1024 * 1024) return null;

  const uploadRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "raw",
        "Content-Type": mime,
      },
      body: new Uint8Array(buffer),
    },
  );
  if (!uploadRes.ok) return null;
  const data = (await uploadRes.json()) as {
    file?: { name: string; uri: string; state: string; mimeType?: string };
  };
  let file = data.file;
  if (!file) return null;

  // Videos need server-side processing — poll until ACTIVE. Short ads finish
  // in a few seconds; we cap at ~45s.
  let attempts = 0;
  while ((file.state === "PROCESSING" || !file.state) && attempts < 30) {
    await new Promise((r) => setTimeout(r, 1500));
    const fileId = file.name.replace(/^files\//, "");
    const pollRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/files/${fileId}?key=${apiKey}`,
    );
    if (pollRes.ok) {
      file = (await pollRes.json()) as typeof file;
    }
    attempts++;
  }
  if (file.state !== "ACTIVE") return null;
  return { fileUri: file.uri, mimeType: file.mimeType || mime, fileName: file.name };
}

async function deleteGeminiFile(fileName: string): Promise<void> {
  try {
    const apiKey = process.env.GEMINI_API_KEY!;
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`,
      { method: "DELETE" },
    );
  } catch {
    // Best-effort cleanup. Orphaned files auto-expire after 48h on Gemini.
  }
}

export async function analyzeCreativeWithGemini(
  input: GeminiAnalysisInput,
): Promise<GeminiAnalysisResult> {
  if (!hasGeminiKey()) throw new Error("no_gemini_key");
  const prompt = buildPrompt(input);
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  let uploadedFileName: string | null = null;

  if (input.previewUrl && /^https?:\/\//.test(input.previewUrl)) {
    if (input.mediaType === "image") {
      // Small images go inline — avoids the Files API round-trip.
      try {
        const res = await fetch(input.previewUrl, {
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.byteLength < 4 * 1024 * 1024) {
            const mime = res.headers.get("content-type") || "image/jpeg";
            parts.push({
              inline_data: { mime_type: mime, data: buf.toString("base64") },
            });
          } else {
            // Large image — upload via Files API
            const uploaded = await uploadMediaToGemini(input.previewUrl, "image/jpeg");
            if (uploaded) {
              uploadedFileName = uploaded.fileName;
              parts.push({
                file_data: { file_uri: uploaded.fileUri, mime_type: uploaded.mimeType },
              });
            }
          }
        }
      } catch {
        // Vision attach is best-effort; fall back to text-only.
      }
    } else if (input.mediaType === "video") {
      const uploaded = await uploadMediaToGemini(input.previewUrl, "video/mp4");
      if (uploaded) {
        uploadedFileName = uploaded.fileName;
        parts.push({
          file_data: { file_uri: uploaded.fileUri, mime_type: uploaded.mimeType },
        });
      }
    }
  }

  const url = `${GEMINI_ENDPOINT(GEMINI_MODEL)}?key=${encodeURIComponent(process.env.GEMINI_API_KEY!)}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
        temperature: 0.6,
        topP: 0.9,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    if (uploadedFileName) void deleteGeminiFile(uploadedFileName);
    throw new Error(`gemini_http_${resp.status}: ${body.slice(0, 240)}`);
  }
  const data = (await resp.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("gemini_empty_response");

  const parsed = JSON.parse(text) as GeminiAnalysisResult;
  // Cleanup — the file is only needed for this single inference call.
  if (uploadedFileName) void deleteGeminiFile(uploadedFileName);

  if (
    !parsed.summary ||
    !Array.isArray(parsed.strengths) ||
    !Array.isArray(parsed.areasToImprove) ||
    !Array.isArray(parsed.recommendedIterations)
  ) {
    throw new Error("gemini_malformed");
  }
  return parsed;
}
