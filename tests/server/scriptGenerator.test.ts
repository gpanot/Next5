import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/server/metaAds/llm', () => ({ metaAdsJson: vi.fn() }));
import { metaAdsJson } from '../../src/server/metaAds/llm';
import { POST as hooksRoute } from '../../app/api/admin/script-generator/hooks/route';
import { signAdminToken } from '../../src/lib/admin-auth';
import { buildGenerateSystem, buildHooksSystem, buildRefineSystem } from '../../src/server/scriptGenerator/prompts';
import { generateScript, parseGenerateInput, parseModel } from '../../src/server/scriptGenerator/service';
import type { GeneratedScript } from '../../src/types/admin/scriptGenerator';

const baseBody = { format: 'talking_head', structure: 'listicle', goal: 'attract', audience: 'Moms with toddlers', message: 'Tantrums are not about the cookie', credibility: '' };
const hook = { visual: 'Toddler on the floor, mom sitting next to them', text: 'Not about the cookie', verbal: 'Moms, tantrums are not about the cookie. Here is the real reason.' };

const hooksOut = (angles: string[]) => ({ hooks: angles.map((angle) => ({ angle, ...hook })) });

const script = (withRehook: boolean): GeneratedScript => ({
  title: 'T',
  format: 'talking_head',
  structure: 'listicle',
  durationSeconds: 30,
  cta: 'Follow',
  directorNote: { summary: 's', decisions: [] },
  beats: [0, 1, 2].map((i) => ({ start: i * 10, end: i * 10 + 10, label: `B${i}`, spoken: 'x', ...(withRehook ? { rehook: 'But wait', rehookAt: i * 10 + 5 } : {}) })),
});

/** A streamed Messages API answer: a tool call whose JSON arrives in two chunks. */
function sse(input: unknown, stop = 'tool_use'): string {
  const json = JSON.stringify(input);
  const half = Math.floor(json.length / 2);
  const events: unknown[] = [
    { type: 'content_block_start', content_block: { type: 'tool_use' } },
    { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: json.slice(0, half) } },
    { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: json.slice(half) } },
    { type: 'message_delta', delta: { stop_reason: stop } },
  ];
  return events.map((e) => `event: x\ndata: ${JSON.stringify(e)}\n\n`).join('');
}

/** Mocks the Anthropic Messages API: returns `input` as the tool call and records the request body. */
function mockModel(input: unknown) {
  const calls: Array<{ system: string; user: string }> = [];
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body) as { system: string; messages: Array<{ content: string }> };
    calls.push({ system: body.system, user: body.messages[0].content });
    return new Response(sse(input), { status: 200 });
  }));
  return calls;
}

const hooksRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/script-generator/hooks', {
    method: 'POST',
    headers: { authorization: `Bearer ${signAdminToken()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude', ...(body as object) }),
  });

beforeEach(() => vi.stubEnv('ANTHROPIC_API_KEY', 'test-key'));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('POST hooks', () => {
  it('returns 3 hooks with 3 different angles', async () => {
    mockModel(hooksOut(['contrarian', 'pain', 'mistake']));
    const res = await hooksRoute(hooksRequest(baseBody), undefined);
    const data = (await res.json()) as { hooks: Array<{ angle: string }> };
    expect(res.status).toBe(200);
    expect(data.hooks.map((h) => h.angle)).toEqual(['contrarian', 'pain', 'mistake']);
  });

  it('rejects bad input without calling the model', async () => {
    const calls = mockModel(hooksOut(['contrarian', 'pain', 'mistake']));
    expect((await hooksRoute(hooksRequest({ ...baseBody, format: 'nope' }), undefined)).status).toBe(400);
    expect((await hooksRoute(hooksRequest({ ...baseBody, goal: 'nope' }), undefined)).status).toBe(400);
    expect((await hooksRoute(hooksRequest({ ...baseBody, audience: '  ' }), undefined)).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('rejects a model answer with repeated angles', async () => {
    mockModel(hooksOut(['pain', 'pain', 'stakes']));
    expect((await hooksRoute(hooksRequest(baseBody), undefined)).status).toBe(502);
  });

  it('needs an admin token', async () => {
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify(baseBody) });
    expect((await hooksRoute(req, undefined)).status).toBe(401);
  });
});

describe('generate with a chosen hook', () => {
  it('injects the chosen hook into the system prompt', async () => {
    const calls = mockModel(script(true));
    await generateScript(parseGenerateInput({ ...baseBody, hook }), 'claude');
    expect(calls[0].system).toContain('CHOSEN HOOK, use exactly, do not rewrite it');
    expect(calls[0].system).toContain(hook.visual);
    expect(calls[0].system).toContain(hook.text);
    expect(calls[0].system).toContain(hook.verbal);
  });

  it('adds no hook block when none is chosen', () => {
    expect(buildGenerateSystem({ format: 'talking_head', structure: 'listicle', goal: 'attract' })).not.toContain('CHOSEN HOOK');
  });

  it('trims and length-limits the hook fields, and rejects an unusable hook', () => {
    const long = 'x'.repeat(5000);
    const parsed = parseGenerateInput({ ...baseBody, hook: { visual: ` ${long}`, text: long, verbal: long } }).hook!;
    expect(parsed.visual.length).toBe(400);
    expect(parsed.text.length).toBe(80);
    expect(parsed.verbal.length).toBe(400);
    expect(() => parseGenerateInput({ ...baseBody, hook: { visual: '', text: 'a', verbal: '' } })).toThrow();
  });
});

describe('rehook schema', () => {
  it('accepts beats with and without rehook', async () => {
    mockModel(script(true));
    expect((await generateScript(parseGenerateInput(baseBody), 'claude')).beats[0].rehookAt).toBe(5);
    mockModel(script(false));
    expect((await generateScript(parseGenerateInput(baseBody), 'claude')).beats[0].rehook).toBeUndefined();
  });
});

describe('model call failures', () => {
  it('maps a cut-off answer and a dropped connection to 502s with a message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(sse(script(true), 'max_tokens'), { status: 200 })));
    await expect(generateScript(parseGenerateInput(baseBody), 'claude')).rejects.toThrow(/cut off/);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    await expect(generateScript(parseGenerateInput(baseBody), 'claude')).rejects.toThrow(/Could not reach/);
  });
});

describe('model choice', () => {
  it('defaults to GPT-6.1 Sol and rejects an unknown model', () => {
    expect(parseModel(undefined)).toBe('gpt-6.1-sol');
    expect(parseModel('claude')).toBe('claude');
    expect(() => parseModel('gemini')).toThrow();
  });

  it('runs on OpenAI with the tool schema in the prompt, and never calls Anthropic', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('OPENAI_API_KEY', 'test-openai');
    vi.mocked(metaAdsJson).mockResolvedValueOnce(script(true));
    const out = await generateScript(parseGenerateInput({ ...baseBody, hook }), 'gpt-6.1-sol');
    expect(out.beats).toHaveLength(3);
    const [messages, options] = vi.mocked(metaAdsJson).mock.calls[0];
    expect(options.model).toBe('gpt-6.1-sol');
    expect(String(messages[0].content)).toContain('CHOSEN HOOK');
    expect(String(messages[0].content)).toContain('"submit_script"');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says so when the OpenAI key is missing', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    await expect(generateScript(parseGenerateInput(baseBody), 'gpt-6.1-sol')).rejects.toThrow(/OPENAI_API_KEY/);
  });
});

describe('prompts', () => {
  it('carry the new principles everywhere and no em dashes', () => {
    const all = [buildGenerateSystem({ format: 'silent_film', structure: 'ai_choose', goal: 'convert', hook }), buildRefineSystem(), buildHooksSystem({ format: 'talking_head', goal: 'attract' })];
    for (const p of all) {
      expect(p).toContain('Stack the hook');
      expect(p).toContain('Re-hook');
      expect(p).not.toContain('—');
    }
  });
});
