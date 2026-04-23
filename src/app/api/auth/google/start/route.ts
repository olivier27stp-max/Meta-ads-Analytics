import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  buildAuthorizationUrl,
  hasGoogleOAuthConfig,
} from "@/lib/integrations/google-oauth";

export const runtime = "nodejs";

const STATE_COOKIE = "mca-google-oauth-state";

/**
 * Kicks off the Google OAuth flow. Generates a CSRF `state` value, stores it
 * in a short-lived cookie, and redirects the browser to Google's consent
 * screen. The callback verifies the cookie against the returned state.
 */
export async function GET() {
  if (!hasGoogleOAuthConfig()) {
    return NextResponse.json(
      {
        ok: false,
        error: "google_oauth_not_configured",
        message:
          "Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET and GOOGLE_OAUTH_REDIRECT_URI in the server env.",
      },
      { status: 500 },
    );
  }

  const supabase = await getServerSupabase();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // CSRF state. We bind it to the Supabase user id so the callback can
  // match the right workspace.
  const nonce = crypto.randomBytes(16).toString("hex");
  const state = `${userRes.user.id}.${nonce}`;

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 min
  });

  return NextResponse.redirect(buildAuthorizationUrl(state));
}
