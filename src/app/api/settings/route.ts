import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      hasMetaToken: Boolean(process.env.META_ACCESS_TOKEN),
      hasOpenAi: Boolean(process.env.OPENAI_API_KEY),
      hasAnthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    },
  });
}
