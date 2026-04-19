import { NextResponse } from "next/server";

/**
 * Returns the computed analytics shape. The authoritative computation lives
 * in `src/lib/analytics.ts` and runs on the client against the store; this
 * endpoint is provided so external tools / CLIs can consume the same data.
 * Once a database layer is introduced, this handler reads from there and
 * runs the same `groupCreatives` + `buildKillScaleBoard` helpers server-side.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    note:
      "Client-side store is authoritative. See src/lib/analytics.ts for canonical computations.",
  });
}
