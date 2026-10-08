/**
 * Admin "Open as user": the admin page opens the app in a new tab with `#impersonate=<session token>`. The token is
 * moved to sessionStorage, so only that tab runs as the user; the admin's own sign-in (localStorage) is never touched.
 * Once the tab has impersonated, it never falls back to the localStorage session, even after the token expires.
 */

const KEY = 'next5-impersonation';
const HASH_PREFIX = '#impersonate=';

const read = (): string | null => {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

const write = (value: string) => {
  try {
    window.sessionStorage.setItem(KEY, value);
  } catch {
    // storage blocked — the tab falls back to the normal sign-in
  }
};

/** Moves a `#impersonate=` token from the URL into this tab's storage, then clears the hash. Runs once on load. */
const consumeHash = () => {
  if (typeof window === 'undefined' || !window.location.hash.startsWith(HASH_PREFIX)) return;
  write(decodeURIComponent(window.location.hash.slice(HASH_PREFIX.length)));
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
};
consumeHash();

/** True while this tab is (or was) an admin viewing the app as a user. */
export const isImpersonating = (): boolean => read() !== null;

/** The impersonated session token; null when this tab is not impersonating or the session ended. */
export const impersonationToken = (): string | null => read() || null;

/** Ends the session (signed out, or the token expired) without falling back to the admin's own sign-in. */
export const setImpersonationToken = (value: string | null) => write(value ?? '');

/** The email inside the impersonated session token, for the banner. */
export const impersonatedEmail = (): string | null => {
  const token = impersonationToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { email?: string };
    return payload.email ?? null;
  } catch {
    return null;
  }
};

/** The URL an admin opens in a new tab to see `path` as the user holding `token`. */
export const impersonationUrl = (path: string, token: string): string => `${path}${HASH_PREFIX}${encodeURIComponent(token)}`;
