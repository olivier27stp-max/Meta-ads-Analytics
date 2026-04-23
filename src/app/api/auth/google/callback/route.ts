import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  exchangeCodeForTokens,
  fetchUserInfo,
  hasGoogleOAuthConfig,
} from "@/lib/integrations/google-oauth";

export const runtime = "nodejs";

const STATE_COOKIE = "mca-google-oauth-state";

/**
 * OAuth2 callback. Verifies the CSRF state cookie, exchanges the code for
 * access + refresh tokens, fetches the authorized Google user's email, and
 * upserts the workspace row in `google_oauth_tokens`. Finally redirects the
 * user back to /automation (Calendar tab).
 */
export async function GET(req: Request) {
  if (!hasGoogleOAuthConfig()) {
    return NextResponse.redirect(
      new URL("/automation?tab=calendar&google_error=not_configured", req.url),
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(
        `/automation?tab=calendar&google_error=${encodeURIComponent(errorParam)}`,
        req.url,
      ),
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/automation?tab=calendar&google_error=missing_code", req.url),
    );
  }

  const [stateUserId, stateNonce] = state.split(".");
  if (!stateUserId || !stateNonce) {
    return NextResponse.redirect(
      new URL("/automation?tab=calendar&google_error=bad_state", req.url),
    );
  }

  const cookieStore = await cookies();
  const expectedNonce = cookieStore.get(STATE_COOKIE)?.value;
  if (!expectedNonce || expectedNonce !== stateNonce) {
    return NextResponse.redirect(
      new URL("/automation?tab=calendar&google_error=state_mismatch", req.url),
    );
  }

  const supabase = await getServerSupabase();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user || userRes.user.id !== stateUserId) {
    return NextResponse.redirect(
      new URL("/automation?tab=calendar&google_error=session_mismatch", req.url),
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const info = await fetchUserInfo(tokens.access_token);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const admin = getAdminSupabase();
    const { error } = await admin.from("google_oauth_tokens").upsert(
      {
        workspace_id: userRes.user.id,
        google_email: info.email,
        google_sub: info.sub,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expires_at: expiresAt,
        scopes: tokens.scope,
        connected_at: new Date().toISOString(),
        last_sync_error: null,
      },
      { onConflict: "workspace_id" },
    );
    if (error) throw new Error(error.message);

    // Clear state cookie
    cookieStore.set(STATE_COOKIE, "", { maxAge: 0, path: "/" });

    return NextResponse.redirect(
      new URL(
        `/automation?tab=calendar&google_connected=${encodeURIComponent(info.email)}`,
        req.url,
      ),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "exchange_failed";
    return NextResponse.redirect(
      new URL(
        `/automation?tab=calendar&google_error=${encodeURIComponent(msg.slice(0, 120))}`,
        req.url,
      ),
    );
  }
}
