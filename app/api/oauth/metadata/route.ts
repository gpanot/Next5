import { authorizationServerMetadata, json, preflight } from '../../../../src/server/mcp/oauthHttp';

/** GET /.well-known/oauth-authorization-server (rewritten here): where Claude signs in and gets tokens. */
export const GET = (req: Request) => json(authorizationServerMetadata(req));
export const OPTIONS = preflight;
