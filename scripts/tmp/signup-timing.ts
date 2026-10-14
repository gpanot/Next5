// Temporary: one real signup (new workspace + first run + first ideas), with every paid call timed and priced.
// Run: npx tsx --env-file=.env.local scripts/tmp/signup-timing.ts <url>
/* eslint-disable no-console */

type Call = { at: number; ms: number; kind: string; model: string; inTok: number; outTok: number; usd: number; label: string };

const T0 = Date.now();
const calls: Call[] = [];
const sec = (ms: number) => (ms / 1000).toFixed(1);
const realFetch = globalThis.fetch;

// Approximate rates for calls without a price in the code (USD per token).
const OPENROUTER_RATES: Record<string, { in: number; out: number }> = {
  'google/gemini-3.5-flash': { in: 0.3e-6, out: 2.5e-6 },
  'google/gemini-3.5-flash-lite': { in: 0.1e-6, out: 0.4e-6 },
};

const bodyOf = (init?: RequestInit): Record<string, unknown> => {
  try {
    return typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

async function main() {
  const url = process.argv[2];
  if (!url) throw new Error('usage: signup-timing.ts <url>');
  const { openAiCostMicros } = await import('../../src/server/metaAds/cost');

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const start = Date.now();
    const res = await realFetch(input, init);
    const ms = Date.now() - start;
    const body = bodyOf(init);
    const model = String(body.model ?? '');
    const record = (kind: string, inTok: number, outTok: number, usd: number, label = '') =>
      calls.push({ at: start - T0, ms, kind, model, inTok, outTok, usd, label });
    try {
      if (href.startsWith('https://api.openai.com/')) {
        const data = (await res.clone().json()) as { usage?: { prompt_tokens?: number; completion_tokens?: number }; model?: string };
        const inTok = data.usage?.prompt_tokens ?? 0;
        const outTok = data.usage?.completion_tokens ?? 0;
        record('openai', inTok, outTok, openAiCostMicros(data.model ?? model, inTok, outTok) / 1e6);
      } else if (href.startsWith('https://openrouter.ai/api/alpha/decisions')) {
        record('jev', 0, 0, 0.00002);
      } else if (href.startsWith('https://openrouter.ai/')) {
        const data = (await res.clone().json()) as { usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number } };
        const inTok = data.usage?.prompt_tokens ?? 0;
        const outTok = data.usage?.completion_tokens ?? 0;
        const rate = OPENROUTER_RATES[model] ?? { in: 0.3e-6, out: 2.5e-6 };
        record('openrouter', inTok, outTok, data.usage?.cost ?? inTok * rate.in + outTok * rate.out);
      } else if (href.startsWith('https://reapi.ai/') && init?.method === 'POST') {
        record('image', 0, 0, model.includes('nano-banana') ? 0.03 : 0.03, model);
      } else if (href.startsWith('https://api.exa.ai/')) {
        const urls = Array.isArray(body.urls) ? body.urls.length : 1;
        record('exa', 0, 0, 0.001 * urls);
      }
    } catch {
      record('unparsed', 0, 0, 0, href.slice(0, 60));
    }
    return res;
  }) as typeof fetch;

  const { prisma } = await import('../../src/lib/db');
  const { createSlideshowWorkspace } = await import('../../src/server/autoSlideshow/workspaces');
  const { runAutoPipeline } = await import('../../src/server/autoSlideshow/pipeline');
  const user = await prisma.user.findUniqueOrThrow({ where: { email: 'giompanot@gmail.com' } });

  const ws = await createSlideshowWorkspace(user.id, { websiteUrl: url });
  const run = await prisma.autoSlideshowRun.create({ data: { url: ws.websiteUrl!, count: 1, workspaceId: ws.id } });
  console.log(`[t ${sec(Date.now() - T0)}] workspace ${ws.id}, run ${run.id}`);

  // Milestones, polled from the database.
  const seen = new Set<string>();
  const mark = (key: string, text: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    console.log(`[t ${sec(Date.now() - T0)}] ${text}`);
  };
  let pipelineDone = false;
  void runAutoPipeline(run.id, 1).then(() => { pipelineDone = true; });
  const deadline = Date.now() + 15 * 60_000;
  for (;;) {
    const r = await prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id: run.id } });
    mark(`status:${r.status}`, `run ${r.status}`);
    const profileId = r.brandProfileId;
    if (profileId) {
      const bank = await prisma.blitzScriptBank.findUnique({ where: { brandProfileId: profileId } });
      const content = bank?.content as { audiences?: { stories: unknown[] }[] } | null;
      const n = content?.audiences?.reduce((s, a) => s + a.stories.length, 0) ?? 0;
      if (n > 0) mark(`bank:${n}`, `Blitz bank ${bank!.status}: ${n} stories`);
      if (bank) mark(`bankstatus:${bank.status}`, `Blitz bank status ${bank.status}`);
    }
    const ideas = await prisma.slideshowVariant.findMany({ where: { workspaceId: ws.id, plannedAt: { not: null } }, select: { plan: true } });
    if (ideas.length > 0) mark(`ideas:${ideas.length}`, `calendar ideas: ${ideas.length}`);
    const finishing = ideas.filter((i) => (i.plan as { card?: { finishing?: boolean } }).card?.finishing).length;
    if (ideas.length >= 14) mark(`finishing:${finishing}`, `cards still finishing: ${finishing}`);
    const quietFor = Date.now() - T0 - Math.max(0, ...calls.map((c) => c.at + c.ms));
    if (pipelineDone && ideas.length >= 14 && finishing === 0 && quietFor > 60_000) break;
    if (Date.now() > deadline) { console.log('timeout'); break; }
    await new Promise((res) => setTimeout(res, 2_000));
  }

  const r = await prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id: run.id } });
  console.log('\nstep_timings', JSON.stringify(r.stepTimings), 'run total', r.finishedAt ? sec(r.finishedAt.getTime() - r.startedAt!.getTime()) : '-');
  const groups = new Map<string, { n: number; usd: number; inTok: number; outTok: number; ms: number }>();
  for (const c of calls) {
    const key = `${c.kind} ${c.model || c.label}`;
    const g = groups.get(key) ?? { n: 0, usd: 0, inTok: 0, outTok: 0, ms: 0 };
    groups.set(key, { n: g.n + 1, usd: g.usd + c.usd, inTok: g.inTok + c.inTok, outTok: g.outTok + c.outTok, ms: g.ms + c.ms });
  }
  console.log('\ncalls by model:');
  for (const [key, g] of [...groups.entries()].sort((a, b) => b[1].usd - a[1].usd)) {
    console.log(`  ${key.padEnd(48)} ×${String(g.n).padStart(3)}  $${g.usd.toFixed(4)}  in ${g.inTok} out ${g.outTok}  avg ${sec(g.ms / g.n)}s`);
  }
  console.log(`TOTAL $${calls.reduce((s, c) => s + c.usd, 0).toFixed(3)} over ${calls.length} calls`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
