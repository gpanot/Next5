import { json, preflight, readParams } from '../../../../src/server/mcp/oauthHttp';
import { revokeToken } from '../../../../src/server/mcp/oauthStore';

/** POST /api/oauth/revoke — RFC 7009: ends the connection a token belongs to. Always 200, even for unknown tokens. */
export async function POST(req: Request) {
  const p = await readParams(req);
  if (p.token) await revokeToken(p.token).catch((err: unknown) => console.error('[mcp-oauth] revoke failed:', err));
  return json({});
}
export const OPTIONS = preflight;
