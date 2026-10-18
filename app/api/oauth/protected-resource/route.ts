import { json, preflight, protectedResourceMetadata } from '../../../../src/server/mcp/oauthHttp';

/** GET /.well-known/oauth-protected-resource[/api/mcp] (rewritten here): the MCP server and who issues its tokens. */
export const GET = (req: Request) => json(protectedResourceMetadata(req));
export const OPTIONS = preflight;
