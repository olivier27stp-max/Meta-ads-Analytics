import "server-only";

/**
 * Google OAuth 2.0 helpers. The app's OAuth client id + secret are set via
 * env vars; each workspace (user) stores their own refresh token.
 *
 * Required env vars:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   GOOGLE_OAUTH_REDIRECT_URI  (e.g. https://your-app.com/api/auth/google/callback)
 *
 * Scopes requested: read-only calendar + email + openid.
 */

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
];

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  verified_email?: boolean;
  name?: string;
  picture?: string;
}

export function hasGoogleOAuthConfig(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REDIRECT_URI,
  );
}

export function buildAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`google_oauth_exchange_${res.status}: ${detail.slice(0, 240)}`);
  }
  return (await res.json()) as GoogleTokens;
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`google_oauth_refresh_${res.status}: ${detail.slice(0, 240)}`);
  }
  return (await res.json()) as GoogleTokens;
}

export async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`google_userinfo_${res.status}`);
  return (await res.json()) as GoogleUserInfo;
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  status?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  organizer?: { email: string; displayName?: string };
  htmlLink?: string;
}

/**
 * Fetch events from the user's primary calendar covering a 60-day window
 * around "now" (30 days back → 60 days forward). Pages automatically until
 * all events are returned or 500 events cap is hit.
 */
export async function fetchCalendarEvents(accessToken: string): Promise<GoogleCalendarEvent[]> {
  const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`google_calendar_${res.status}: ${detail.slice(0, 240)}`);
    }
    const data = (await res.json()) as {
      items?: GoogleCalendarEvent[];
      nextPageToken?: string;
    };
    events.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
    pages++;
  } while (pageToken && pages < 5);

  return events;
}
