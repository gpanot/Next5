// The Claude connector end to end over HTTP, with an in-memory database: register (DCR) → 401 discovery → consent →
// token (PKCE) → MCP initialize / tools/list / tools/call → refresh rotation and replay protection.

import { createHash, randomBytes } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const tables: Record<string, Record<string, unknown>[]> = { clients: [], codes: [], tokens: [] };

  const matches = (row: Record<string, unknown>, where: Record<string, unknown>): boolean =>
    Object.entries(where).every(([k, v]) => {
      if (k === 'OR') return (v as Record<string, unknown>[]).some((w) => matches(row, w));
      if (v === null) return row[k] === null || row[k] === undefined;
      return row[k] === v;
    });

  const model = (name: string, key: string) => ({
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `${name}_${tables[name]!.length + 1}`, createdAt: new Date(), revokedAt: null, usedAt: null, lastUsedAt: null, ...data };
      tables[name]!.push(row);
      return row;
    },
    findUnique: async ({ where }: { where: Record<string, unknown> }) => tables[name]!.find((r) => matches(r, where)) ?? null,
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const hit = tables[name]!.filter((r) => matches(r, where));
      hit.forEach((r) => Object.assign(r, data));
      return { count: hit.length };
    },
    update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => Object.assign(tables[name]!.find((r) => matches(r, where))!, data),
    key,
  });
  return { model };
});

vi.mock('../../../src/lib/db', () => ({
  prisma: {
    mcpOauthClient: db.model('clients', 'id'),
    mcpOauthCode: db.model('codes', 'codeHash'),
    mcpOauthToken: db.model('tokens', 'id'),
    user: { findUnique: async () => ({ email: 'owner@acme.test' }) },
  },
}));
vi.mock('../../../src/server/rateLimit', () => ({ enforceRateLimit: async () => undefined, clientIp: () => '1.2.3.4' }));
vi.mock('../../../src/server/autoSlideshow/workspaces', () => ({
  requireSlideshowWorkspace: async (userId: string, id: string) => {
    if (userId !== 'user_1' || id !== 'ws_1') throw new Error('not yours');
    return { id };
  },
  listSlideshowWorkspaces: async () => [{ id: 'ws_1', name: 'Acme Electric', websiteUrl: 'https://acme.test' }],
}));
const planner = vi.hoisted(() => ({
  listWorkspaces: vi.fn(async () => [{ id: 'ws_1', name: 'Acme Electric' }]),
  getIdeas: vi.fn(async () => ({ ideas: [] })),
  requestSlideshows: vi.fn(),
  skipIdeas: vi.fn(),
  addToCalendar: vi.fn(),
  approvalInfo: vi.fn(),
  calendarPosts: vi.fn(),
}));
vi.mock('../../../src/server/mcp/planner', () => planner);

import { signSessionToken } from '../../../src/lib/studio-auth';
import { POST as register } from '../../../app/api/oauth/register/route';
import { GET as consentInfo, POST as consent } from '../../../app/api/oauth/authorize/route';
import { POST as token } from '../../../app/api/oauth/token/route';
import { GET as asMetadata } from '../../../app/api/oauth/metadata/route';
import { GET as prMetadata } from '../../../app/api/oauth/protected-resource/route';
import { POST as mcp } from '../../../app/api/mcp/route';

const ORIGIN = 'https://next5.test';
const CALLBACK = 'https://claude.ai/api/mcp/auth_callback';
const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const session = signSessionToken('user_1', 'owner@acme.test');

const form = (body: Record<string, string>) =>
  new Request(`${ORIGIN}/api/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body).toString() });

const rpc = (accessToken: string, method: string, params: unknown = {}, id = 1) =>
  mcp(new Request(`${ORIGIN}/api/mcp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'Mcp-Protocol-Version': '2025-06-18' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  }));

let clientId = '';
let code = '';
let access = '';
let refresh = '';

describe('Claude connector flow', () => {
  beforeAll(async () => {
    const res = await register(new Request(`${ORIGIN}/api/oauth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_name: 'Claude', redirect_uris: [CALLBACK] }) }));
    expect(res.status).toBe(201);
    clientId = ((await res.json()) as { client_id: string }).client_id;
  });

  it('serves discovery and answers an unsigned MCP call with a 401 pointing at it', async () => {
    const as = (await (await asMetadata(new Request(`${ORIGIN}/.well-known/oauth-authorization-server`))).json()) as Record<string, unknown>;
    expect(as).toMatchObject({ issuer: ORIGIN, token_endpoint: `${ORIGIN}/api/oauth/token`, registration_endpoint: `${ORIGIN}/api/oauth/register`, code_challenge_methods_supported: ['S256'] });
    const pr = (await (await prMetadata(new Request(`${ORIGIN}/.well-known/oauth-protected-resource/api/mcp`))).json()) as Record<string, unknown>;
    expect(pr).toMatchObject({ resource: `${ORIGIN}/api/mcp`, authorization_servers: [ORIGIN] });
    const res = await rpc('nope', 'initialize');
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toContain(`resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource/api/mcp"`);
  });

  it('refuses a redirect URI the client did not register', async () => {
    const q = new URLSearchParams({ client_id: clientId, redirect_uri: 'https://evil.test/cb', code_challenge: challenge, code_challenge_method: 'S256', response_type: 'code' });
    const res = await consentInfo(new Request(`${ORIGIN}/api/oauth/authorize?${q}`, { headers: { Authorization: `Bearer ${session}` } }));
    expect(res.status).toBe(400);
  });

  it('shows the consent screen and returns a code with the state', async () => {
    const query = { client_id: clientId, redirect_uri: CALLBACK, code_challenge: challenge, code_challenge_method: 'S256', response_type: 'code', state: 'st8' };
    const info = await consentInfo(new Request(`${ORIGIN}/api/oauth/authorize?${new URLSearchParams(query)}`, { headers: { Authorization: `Bearer ${session}` } }));
    expect(await info.json()).toMatchObject({ clientName: 'Claude', redirectHost: 'claude.ai', workspaces: [{ id: 'ws_1' }] });
    const res = await consent(new Request(`${ORIGIN}/api/oauth/authorize`, { method: 'POST', headers: { Authorization: `Bearer ${session}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...query, workspaceId: 'ws_1', approve: true }) }));
    const { redirectTo } = (await res.json()) as { redirectTo: string };
    const back = new URL(redirectTo);
    expect(`${back.origin}${back.pathname}`).toBe(CALLBACK);
    expect(back.searchParams.get('state')).toBe('st8');
    code = back.searchParams.get('code')!;
    expect(code).toMatch(/^n5ac_/);
  });

  it('says access_denied when the user cancels', async () => {
    const query = { client_id: clientId, redirect_uri: CALLBACK, code_challenge: challenge, code_challenge_method: 'S256', response_type: 'code', state: 'st9' };
    const res = await consent(new Request(`${ORIGIN}/api/oauth/authorize`, { method: 'POST', headers: { Authorization: `Bearer ${session}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...query, approve: false }) }));
    const back = new URL(((await res.json()) as { redirectTo: string }).redirectTo);
    expect(back.searchParams.get('error')).toBe('access_denied');
  });

  it('exchanges the code once, with the PKCE verifier', async () => {
    const bad = await token(form({ grant_type: 'authorization_code', code, code_verifier: randomBytes(32).toString('base64url'), redirect_uri: CALLBACK, client_id: clientId }));
    expect(bad.status).toBe(400);
    // The failed try burned the code: a stolen code can't be retried with guesses.
    const again = await token(form({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: CALLBACK, client_id: clientId }));
    expect(((await again.json()) as { error: string }).error).toBe('invalid_grant');
  });

  it('issues tokens for a fresh code', async () => {
    const query = { client_id: clientId, redirect_uri: CALLBACK, code_challenge: challenge, code_challenge_method: 'S256', response_type: 'code' };
    const res = await consent(new Request(`${ORIGIN}/api/oauth/authorize`, { method: 'POST', headers: { Authorization: `Bearer ${session}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...query, workspaceId: 'ws_1', approve: true }) }));
    code = new URL(((await res.json()) as { redirectTo: string }).redirectTo).searchParams.get('code')!;
    const ok = await token(form({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: CALLBACK, client_id: clientId }));
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { access_token: string; refresh_token: string; token_type: string; expires_in: number };
    expect(body).toMatchObject({ token_type: 'Bearer', expires_in: 3600 });
    access = body.access_token;
    refresh = body.refresh_token;
  });

  it('speaks MCP: initialize, tools/list, tools/call', async () => {
    const init = await rpc(access, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
    expect(init.status).toBe(200);
    const initBody = (await init.json()) as { result: { serverInfo: { name: string }; instructions?: string } };
    expect(initBody.result.serverInfo.name).toBe('next5');
    expect(initBody.result.instructions).toContain('approval');

    const list = (await (await rpc(access, 'tools/list', {}, 2)).json()) as { result: { tools: Array<{ name: string }> } };
    expect(list.result.tools.map((t) => t.name).sort()).toEqual(['add_to_calendar', 'get_approval_link', 'get_calendar', 'get_post_ideas', 'list_workspaces', 'request_slideshow_ideas', 'skip_ideas']);

    const call = (await (await rpc(access, 'tools/call', { name: 'list_workspaces', arguments: {} }, 3)).json()) as { result: { content: Array<{ text: string }> } };
    expect(JSON.parse(call.result.content[0]!.text)).toEqual([{ id: 'ws_1', name: 'Acme Electric' }]);
    expect(planner.listWorkspaces).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user_1', defaultWorkspaceId: 'ws_1' }));

    await rpc(access, 'tools/call', { name: 'get_post_ideas', arguments: { days: 7, format: 'video' } }, 4);
    expect(planner.getIdeas).toHaveBeenCalledWith(expect.anything(), { workspaceId: undefined, startDate: undefined, days: 7, format: 'video', writeMore: undefined });
  });

  it('rotates refresh tokens and shuts the connection on reuse', async () => {
    const first = await token(form({ grant_type: 'refresh_token', refresh_token: refresh, client_id: clientId }));
    expect(first.status).toBe(200);
    const next = (await first.json()) as { access_token: string };
    expect((await rpc(access, 'tools/list')).status).toBe(401);
    expect((await rpc(next.access_token, 'tools/list')).status).toBe(200);
    const reused = await token(form({ grant_type: 'refresh_token', refresh_token: refresh, client_id: clientId }));
    expect(((await reused.json()) as { error: string }).error).toBe('invalid_grant');
    expect((await rpc(next.access_token, 'tools/list')).status).toBe(401);
  });
});
