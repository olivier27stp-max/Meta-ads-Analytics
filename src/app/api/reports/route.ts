import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    note: "Reports are generated on-demand from the client store.",
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    accountId?: string;
  };
  return NextResponse.json({
    ok: true,
    queued: true,
    name: body.name ?? "Untitled report",
    accountId: body.accountId ?? null,
  });
}
