// Temporary: replays the request bodies saved by gemini36-capture.ts on Gemini 3.6 Flash at each reasoning level.
// Prints per task: success, JSON validity, finish reason, tokens, latency; reAPI cost comes from its balance.
// Run: npx tsx --env-file=.env.local scripts/tmp/gemini36-replay.ts <captured.json> <reapi|openrouter> [repeats=2] [levels=default,minimal,low]
/* eslint-disable no-console */
import fs from 'node:fs';

type Captured = { task: string; body: Record<string, unknown> };
type Row = { task: string; level: string; ok: boolean; json: boolean; finish: string; inTok: number; outTok: number; ms: number; usd: number; served: string; reply: string };

const PROVIDERS = {
  reapi: { url: 'https://reapi.ai/api/v1/chat/completions', key: 'REAPI_API_KEY', model: 'gemini-3.6-flash' },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', key: 'OPENROUTER_API_KEY', model: 'google/gemini-3.6-flash' },
} as const;

const reapiBalance = async (): Promise<number> => {
  const res = await fetch('https://reapi.ai/api/v1/balance', { headers: { Authorization: `Bearer ${process.env.REAPI_API_KEY}` } });
  return ((await res.json()) as { balance: number }).balance;
};

const bodyFor = (c: Captured, provider: keyof typeof PROVIDERS, level: string): Record<string, unknown> => {
  const body: Record<string, unknown> = { ...c.body, model: PROVIDERS[provider].model };
  delete body.reasoning;
  delete body.reasoning_effort;
  if (provider === 'reapi') body.max_tokens = Math.min(Number(body.max_tokens), 8192);
  if (level !== 'default') Object.assign(body, provider === 'reapi' ? { reasoning_effort: level } : { reasoning: { effort: level } });
  if (provider === 'openrouter') body.usage = { include: true };
  if (provider === 'openrouter' && process.env.TIER) body.service_tier = process.env.TIER;
  if (provider === 'openrouter' && process.env.ONLY) body.provider = { only: process.env.ONLY.split(','), allow_fallbacks: false };
  return body;
};

const once = async (c: Captured, provider: keyof typeof PROVIDERS, level: string): Promise<Row> => {
  const p = PROVIDERS[provider];
  const t = Date.now();
  const res = await fetch(p.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env[p.key]}` },
    body: JSON.stringify(bodyFor(c, provider, level)),
  });
  const d = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
    provider?: string;
    service_tier?: string;
    error?: { message?: string };
  };
  const text = d.choices?.[0]?.message?.content ?? '';
  let json = false;
  try { JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); json = true; } catch { /* not JSON */ }
  return {
    task: c.task, level, ok: res.ok, json, finish: d.choices?.[0]?.finish_reason ?? `HTTP ${res.status} ${d.error?.message ?? ''}`.slice(0, 80),
    inTok: d.usage?.prompt_tokens ?? 0, outTok: d.usage?.completion_tokens ?? 0, ms: Date.now() - t, usd: d.usage?.cost ?? 0,
    served: `${d.provider ?? ""}/${d.service_tier ?? ""}`,
    reply: text.replace(/\s+/g, ' ').slice(0, 220),
  };
};

async function main() {
  const [file, provider = 'reapi', repeatsArg = '2', levelsArg = 'default,minimal,low'] = process.argv.slice(2);
  if (!file || !(provider in PROVIDERS)) throw new Error('usage: gemini36-replay.ts <captured.json> <reapi|openrouter> [repeats] [levels]');
  const prov = provider as keyof typeof PROVIDERS;
  // One request per task kind and input (the portrait repair and the detect calls are duplicates otherwise).
  const all = JSON.parse(fs.readFileSync(file, 'utf8')) as Captured[];
  const seen = new Set<string>();
  const cases = all.filter((c) => { const k = `${c.task}|${JSON.stringify(c.body.messages).length}`; return !seen.has(k) && seen.add(k); });
  const rows: Row[] = [];
  for (const level of levelsArg.split(',')) {
    const before = prov === 'reapi' ? await reapiBalance() : 0;
    const levelRows = await Promise.all(Array.from({ length: Number(repeatsArg) }, () => Promise.all(cases.map((c) => once(c, prov, level)))));
    rows.push(...levelRows.flat());
    if (prov === 'reapi') {
      await new Promise((r) => setTimeout(r, 5000));
      console.log(`[${level}] reAPI credits spent: ${before - (await reapiBalance())} for ${levelRows.flat().length} calls`);
    }
  }
  for (const r of rows) console.log(JSON.stringify(r));
  const levels = [...new Set(rows.map((r) => r.level))];
  for (const level of levels) {
    const lr = rows.filter((r) => r.level === level && r.ok);
    const avg = (f: (r: Row) => number) => (lr.length ? Math.round(lr.reduce((s, r) => s + f(r), 0) / lr.length) : 0);
    console.log(`${level}: ok ${lr.length}/${rows.filter((r) => r.level === level).length}, json ${lr.filter((r) => r.json).length}, ` +
      `cut off ${lr.filter((r) => r.finish === 'length').length}, avg ${avg((r) => r.ms)} ms, avg out ${avg((r) => r.outTok)} tok, ` +
      `usd ${lr.reduce((s, r) => s + r.usd, 0).toFixed(4)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
