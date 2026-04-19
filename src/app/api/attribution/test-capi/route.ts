import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { sendCapiEvent, generateEventId } from "@/lib/meta-capi";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    pixelId?: string;
    capiAccessToken?: string;
    testEventCode?: string;
  };
  if (!body.pixelId || !body.capiAccessToken) {
    return NextResponse.json(
      { ok: false, error: "missing_credentials" },
      { status: 400 },
    );
  }
  const result = await sendCapiEvent(
    {
      pixelId: body.pixelId,
      accessToken: body.capiAccessToken,
      testEventCode: body.testEventCode,
    },
    {
      eventName: "PageView",
      eventId: generateEventId("test"),
      eventTimeMs: Date.now(),
      eventSourceUrl: "https://test.mca-attribution/",
      userData: {
        email: userRes.user.email ?? "test@example.com",
      },
    },
  );
  return NextResponse.json({
    ok: result.ok,
    httpStatus: result.httpStatus,
    response: result.response,
    error: result.error,
  });
}
