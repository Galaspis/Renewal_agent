// Single sign-on through the gallab hub.
//
// On the server the app sits behind Caddy + Tinyauth (Google login). Caddy strips any
// Remote-* headers a client sends, enforces the login, then sets Remote-Email itself.
// With HUB_AUTH=1 the app trusts that header and skips its own password. Locally
// (no HUB_AUTH) nothing changes: the family password still applies.
export const HUB_LOGOUT_URL = "https://auth.gallab.top/logout";

export function hubAuthEnabled(): boolean {
  return process.env.HUB_AUTH === "1";
}

export function hubUserFromHeaders(headers: Headers): string | null {
  if (!hubAuthEnabled()) return null;
  const email = headers.get("remote-email")?.trim().toLowerCase();
  return email && email.includes("@") ? email : null;
}
