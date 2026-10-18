import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { CORS_HEADERS, preflight, unauthorized } from '../../../src/server/mcp/oauthHttp';
import { resolveAccessToken } from '../../../src/server/mcp/oauthStore';
import { createNext5Server } from '../../../src/server/mcp/server';

// get_post_ideas may write a new batch of ideas (the Content page's route allows 300 s too).
export const maxDuration = 300;

/**
 * /api/mcp — Next5 for Claude: a stateless MCP server over Streamable HTTP (JSON responses). Every request carries a
 * bearer token from /api/oauth/token; without one, the 401 points Claude to the OAuth discovery documents.
 */
async function handle(req: Request): Promise<Response> {
  const caller = await resolveAccessToken(req);
  if (!caller) return unauthorized(req);
  const server = createNext5Server(caller);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    const res = await transport.handleRequest(req);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  } finally {
    // JSON mode: the response is complete once handleRequest resolves.
    await server.close().catch(() => undefined);
  }
}

/**
 * No server-to-client SSE stream: a stateless server closes it as soon as it opens, and clients (MCP Inspector) then
 * reconnect in a loop. The spec lets a server answer GET with 405 instead.
 */
const noStream = () => new Response(null, { status: 405, headers: { ...CORS_HEADERS, Allow: 'POST, DELETE, OPTIONS' } });

export const POST = handle;
export const GET = noStream;
export const DELETE = handle;
export const OPTIONS = preflight;
