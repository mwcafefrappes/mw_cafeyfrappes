/**
 * OAuth2 compartido para Google Calendar y Gmail (CLAUDE.md 3.1: un solo
 * refresh token con los dos scopes, `calendar` + `gmail.send`; igual que
 * Axel Style). Sin las variables de entorno, `isGoogleConfigured()` da
 * `false` y `lib/gmail.ts` / `lib/google-calendar.ts` solo dejan el aviso
 * en el log: el pedido se crea igual (decisión 2026-10-08, P1 pendiente).
 */

export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export async function getGoogleAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`No se pudo refrescar el token de Google: ${data.error_description ?? data.error}`);
  }

  cachedToken = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.accessToken;
}
