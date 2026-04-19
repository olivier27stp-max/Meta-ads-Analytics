import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const REGISTRATION_SECRET = process.env.REGISTRATION_SECRET || "olivier27";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80),
  secretCode: z.string().min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  if (parsed.data.secretCode.trim() !== REGISTRATION_SECRET) {
    return NextResponse.json(
      { ok: false, error: "invalid_secret_code" },
      { status: 403 },
    );
  }

  const admin = getAdminSupabase();

  // Create the user with email already confirmed so they can sign in right away.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { display_name: parsed.data.displayName },
  });
  if (createErr || !created.user) {
    const msg = createErr?.message?.toLowerCase() || "";
    if (msg.includes("already") || msg.includes("registered")) {
      return NextResponse.json(
        { ok: false, error: "email_taken" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "create_failed", detail: createErr?.message },
      { status: 500 },
    );
  }

  // Sign them in — sets the Supabase auth cookies via @supabase/ssr.
  const supabase = await getServerSupabase();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInErr) {
    return NextResponse.json(
      { ok: false, error: "signin_after_create_failed", detail: signInErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: created.user.id,
      email: created.user.email,
      displayName: parsed.data.displayName,
      workspaceId: created.user.id,
    },
  });
}
