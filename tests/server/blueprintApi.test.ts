import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const modelCall = vi.hoisted(() => ({ fn: null as null | ((s: string, u: string, t: { name: string }) => Promise<unknown>) }));
vi.mock('../../src/server/scriptGenerator/model', async () => {
  const { mockModel } = await import('../../src/server/scriptGenerator/mockModel');
  return {
    BLUEPRINT_MODEL: 'mock',
    callBlueprintModel: (s: string, u: string, t: { name: string; description: string; input_schema: object }) => (modelCall.fn ?? mockModel)(s, u, t),
  };
});

import { NextRequest } from 'next/server';
import { GET, PATCH } from '../../app/api/admin/blueprint/route';
import { POST as hooksRoute } from '../../app/api/admin/blueprint/days/[day]/hooks/route';
import { POST as refineRoute } from '../../app/api/admin/blueprint/days/[day]/script/refine/route';
import { POST as scriptRoute } from '../../app/api/admin/blueprint/days/[day]/script/route';
import { signAdminToken } from '../../src/lib/admin-auth';
import type { BlueprintDto } from '../../src/lib/blueprint/schema';
import { prisma } from '../../src/lib/db';
import { signSessionToken } from '../../src/lib/studio-auth';
import { SCRIPT_CALLS_PER_HOUR } from '../../src/server/blueprint/scripts';

const ADMIN = signAdminToken();
const RATE_KEY = 'blueprint-script:admin';

const req = (method: string, path: string, token: string | null, body?: unknown) =>
  new NextRequest(`http://test${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const day = (d: number) => ({ params: Promise.resolve({ day: String(d) }) });
const noCtx = undefined as never;

const load = async (): Promise<BlueprintDto> =>
  ((await (await GET(req('GET', '/api/admin/blueprint', ADMIN), noCtx)).json()) as { blueprint: BlueprintDto }).blueprint;

const patch = (body: Record<string, unknown>) => PATCH(req('PATCH', '/api/admin/blueprint', ADMIN, body), noCtx);

const setTopic = async (bp: BlueprintDto, topic = 'Pricing a home to sell fast') =>
  ((await (await patch({ version: bp.version, days: { '0': { topic } } })).json()) as { blueprint: BlueprintDto }).blueprint;

const post = (route: typeof scriptRoute, d: number, path: string, body: unknown = {}) => route(req('POST', `/api/admin/blueprint/days/${d}/${path}`, ADMIN, body), day(d));

beforeEach(async () => {
  modelCall.fn = null;
  await prisma.brandBlueprint.deleteMany({ where: { workspaceId: null } });
  await prisma.rateLimit.deleteMany({ where: { key: RATE_KEY } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('admin blueprint API', () => {
  it('needs the admin token; a studio session is refused', async () => {
    expect((await GET(req('GET', '/api/admin/blueprint', null), noCtx)).status).toBe(401);
    const studio = signSessionToken('user_x', 'x@example.com');
    expect((await GET(req('GET', '/api/admin/blueprint', studio), noCtx)).status).toBe(401);
    expect((await post(scriptRoute, 0, 'script')).status).not.toBe(401);
  });

  it('keeps one admin blueprint, with no workspace, and restores topics on reload', async () => {
    const first = await load();
    const topics = { ...first.topics, skills: first.topics.skills.map((t, i) => (i === 0 ? { text: 'Pricing', main: true } : t)) };
    await patch({ version: first.version, topics });
    const again = await load();
    expect(again.id).toBe(first.id);
    expect(again.topics.skills[0]).toEqual({ text: 'Pricing', main: true });
    expect(await prisma.brandBlueprint.count({ where: { workspaceId: null } })).toBe(1);
  });

  it('refuses a stale version with the latest copy', async () => {
    const bp = await load();
    await setTopic(bp);
    const res = await patch({ version: bp.version, step: 2 });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { details: { blueprint: BlueprintDto } }).details.blueprint.plan[0].topic).toBe('Pricing a home to sell fast');
  });

  it('rejects text over the caps and a 4th main topic', async () => {
    const bp = await load();
    expect((await patch({ version: bp.version, about: { ...bp.about, aud: 'x'.repeat(201) } })).status).toBe(400);
    const skills = bp.topics.skills.map((_, i) => ({ text: `t${i}`, main: i < 4 }));
    expect((await patch({ version: bp.version, topics: { ...bp.topics, skills } })).status).toBe(400);
  });
});

describe('admin script routes', () => {
  it('writes and saves a script for a day', async () => {
    await setTopic(await load());
    expect((await post(scriptRoute, 0, 'script')).status).toBe(200);
    expect((await load()).plan[0].script?.beats.length).toBeGreaterThanOrEqual(3);
  });

  it('needs a topic and a valid day', async () => {
    await load();
    expect((await post(scriptRoute, 0, 'script')).status).toBe(400);
    expect((await post(scriptRoute, 9, 'script')).status).toBe(400);
  });

  it('returns SCRIPT_INVALID after one retry', async () => {
    await setTopic(await load());
    const fn = vi.fn(async () => ({ beats: [] }));
    modelCall.fn = fn;
    const res = await post(scriptRoute, 0, 'script');
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toBe('SCRIPT_INVALID');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('keeps the script when a change is refused, and caps the instruction', async () => {
    await setTopic(await load());
    await post(scriptRoute, 0, 'script');
    const before = (await load()).plan[0].script;
    modelCall.fn = async () => ({ refused: true, message: 'I can only edit this script.', script: {} });
    const res = await post(refineRoute, 0, 'script/refine', { instruction: 'What is the weather?' });
    expect(((await res.json()) as { refused: boolean }).refused).toBe(true);
    expect((await load()).plan[0].script).toEqual(before);
    expect((await post(refineRoute, 0, 'script/refine', { instruction: 'x'.repeat(301) })).status).toBe(400);
  });

  it('offers 3 hooks and rate limits per hour', async () => {
    await setTopic(await load());
    const ok = await post(hooksRoute, 0, 'hooks');
    expect(((await ok.json()) as { hooks: unknown[] }).hooks).toHaveLength(3);
    await prisma.$executeRaw`UPDATE rate_limits SET count = ${SCRIPT_CALLS_PER_HOUR} WHERE key = ${RATE_KEY}`;
    expect((await post(hooksRoute, 0, 'hooks')).status).toBe(429);
  });
});
