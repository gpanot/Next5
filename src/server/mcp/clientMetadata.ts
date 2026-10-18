// server-only — never import from a 'use client' file.
// Client ID Metadata Documents (CIMD, MCP authorization 2025-11-25): the client id is an https URL serving the client's
// JSON metadata. Claude uses this when "Use Claude's published identity" is picked; otherwise it registers (DCR).

import { OAuthError, isAllowedRedirectUri } from './oauthCore';

const MAX_BYTES = 64 * 1024;
const TIMEOUT_MS = 5_000;

/** An https URL with a path, on a DNS name (no IP literals, no localhost): the only client ids fetched. */
export const isMetadataDocumentUrl = (id: string): boolean => {
  let url: URL;
  try {
    url = new URL(id);
  } catch {
    return false;
  }
  const host = url.hostname;
  return url.protocol === 'https:' && url.pathname.length > 1 && !url.hash && !url.username && !url.password
    && host.includes('.') && !/^[\d.]+$/.test(host) && !host.startsWith('[') && host !== 'localhost' && !host.endsWith('.local') && !host.endsWith('.internal');
};

/** Reads the document; its `client_id` must be the URL itself, and its redirect URIs must be allowed ones. */
export async function fetchClientMetadata(id: string): Promise<{ clientName: string | null; redirectUris: string[] }> {
  const res = await fetch(id, { headers: { Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(() => null);
  if (!res?.ok) throw new OAuthError(400, 'invalid_client', 'Could not read the client metadata document.');
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new OAuthError(400, 'invalid_client', 'The client metadata document is too large.');
  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new OAuthError(400, 'invalid_client', 'The client metadata document is not JSON.');
  }
  if (doc.client_id !== id) throw new OAuthError(400, 'invalid_client', 'The client metadata document names another client.');
  const uris = Array.isArray(doc.redirect_uris) ? doc.redirect_uris.filter((u): u is string => typeof u === 'string' && isAllowedRedirectUri(u)).slice(0, 10) : [];
  if (uris.length === 0) throw new OAuthError(400, 'invalid_client', 'The client metadata document has no usable redirect_uris.');
  const name = typeof doc.client_name === 'string' ? doc.client_name.trim().slice(0, 100) || null : null;
  return { clientName: name, redirectUris: uris };
}
