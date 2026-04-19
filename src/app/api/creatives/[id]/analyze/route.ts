import { NextResponse } from "next/server";
import { z } from "zod";
import {
  analyzeCreativeWithGemini,
  hasGeminiKey,
  GEMINI_MODEL,
  type GeminiAnalysisInput,
} from "@/lib/ai/gemini";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const CoachingSchema = z
  .object({
    vertical: z.string(),
    brandVoice: z.string(),
    riskTolerance: z.string(),
    notes: z.string().default(""),
  })
  .optional();

const ExemplarSchema = z.object({
  id: z.string(),
  creativeName: z.string(),
  mediaType: z.enum(["video", "image"]),
  funnelStage: z.enum(["TOF", "MOF", "BOF"]),
  metricsSnapshot: z.object({
    spend: z.number(),
    ctr: z.number(),
    roas: z.number(),
    hookRate: z.number(),
    holdRate: z.number(),
    cpa: z.number(),
  }),
  analysisSnapshot: z.object({
    summary: z.string(),
    strengths: z.array(z.string()),
    areasToImprove: z.array(z.string()),
  }),
  rating: z.enum(["up", "down"]),
  note: z.string(),
  ratedAt: z.string(),
});

const Schema = z.object({
  name: z.string(),
  campaignName: z.string(),
  adSetName: z.string(),
  mediaType: z.enum(["video", "image"]),
  previewUrl: z.string().optional(),
  currentFunnelStage: z.enum(["TOF", "MOF", "BOF"]),
  metrics: z.object({
    spend: z.number(),
    impressions: z.number(),
    clicks: z.number(),
    purchases: z.number(),
    revenue: z.number(),
    roas: z.number(),
    ctr: z.number(),
    cpa: z.number(),
    hookRate: z.number(),
    holdRate: z.number(),
    landingPageViews: z.number(),
  }),
  coaching: CoachingSchema,
  exemplars: z
    .object({
      approved: z.array(ExemplarSchema).max(10),
      rejected: z.array(ExemplarSchema).max(10),
    })
    .optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const supabase = await getServerSupabase();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!hasGeminiKey()) {
    return NextResponse.json({
      ok: true,
      creativeId: id,
      mode: "demo",
      model: null,
      analysis: null,
      note:
        "Set GEMINI_API_KEY to enable real analysis. The client retains the seeded AI record.",
    });
  }

  try {
    const input = parsed.data as GeminiAnalysisInput;
    const analysis = await analyzeCreativeWithGemini(input);
    return NextResponse.json({
      ok: true,
      creativeId: id,
      mode: "live",
      model: GEMINI_MODEL,
      analysis,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        creativeId: id,
        mode: "live",
        error: err instanceof Error ? err.message : "analysis_failed",
      },
      { status: 502 },
    );
  }
}
