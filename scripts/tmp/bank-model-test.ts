// Temporary: rebuilds one workspace's Blitz Script Bank with a model swapped in for gpt-5.5 (no images), timed and priced.
// Run: npx tsx --env-file=.env.local scripts/tmp/bank-model-test.ts <workspaceId> <model|same> [effort]
/* eslint-disable no-console */
export {};

type Call = { ms: number; model: string; inTok: number; outTok: number; reasoningTok: number; usd: number; ok: boolean };

const calls: Call[] = [];
const realFetch = globalThis.fetch;

async function main() {
  const [workspaceId, swapModel = 'same', effort] = process.argv.slice(2);
  if (!workspaceId) throw new Error('usage: bank-model-test.ts <workspaceId> <model|same> [effort]');
  const { openAiCostMicros } = await import('../../src/server/metaAds/cost');

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!href.startsWith('https://api.openai.com/') || typeof init?.body !== 'string') return realFetch(input, init);
    const body = JSON.parse(init.body) as Record<string, unknown>;
    if (body.model === 'gpt-5.5' && swapModel !== 'same') {
      body.model = swapModel;
      if (effort) body.reasoning_effort = effort;
      // Higher effort spends more reasoning tokens, which count against the cap.
      body.max_completion_tokens = Math.min(100_000, Number(body.max_completion_tokens ?? 8_000) * 5);
    }
    // No app timeout: measure the real wait.
    const start = Date.now();
    const res = await realFetch(input, { ...init, signal: undefined, body: JSON.stringify(body) });
    const ms = Date.now() - start;
    const data = (await res.clone().json().catch(() => ({}))) as {
      usage?: { prompt_tokens?: number; completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } };
      model?: string;
    };
    const inTok = data.usage?.prompt_tokens ?? 0;
    const outTok = data.usage?.completion_tokens ?? 0;
    const model = String(body.model);
    const finish = ((await res.clone().json().catch(() => ({}))) as { choices?: { finish_reason?: string }[] }).choices?.[0]?.finish_reason;
    console.log(`[call] ${model} ${res.status} ${(ms / 1000).toFixed(1)}s in ${data.usage?.prompt_tokens ?? 0} out ${data.usage?.completion_tokens ?? 0} reasoning ${data.usage?.completion_tokens_details?.reasoning_tokens ?? 0} finish ${finish}`);
    calls.push({ ms, model, inTok, outTok, reasoningTok: data.usage?.completion_tokens_details?.reasoning_tokens ?? 0, usd: openAiCostMicros(model, inTok, outTok) / 1e6, ok: res.ok });
    return res;
  }) as typeof fetch;

  const { prisma } = await import('../../src/lib/db');
  const { workspaceRunId } = await import('../../src/server/labs/workspaceRun');
  const { ensureBlitzBank } = await import('../../src/server/labs/blitzBank');
  const runId = await workspaceRunId(workspaceId);
  const { brandProfileId } = await prisma.studioRun.findUniqueOrThrow({ where: { id: runId }, select: { brandProfileId: true } });
  await prisma.blitzScriptBank.deleteMany({ where: { brandProfileId } });

  const t0 = Date.now();
  let weekAt = 0;
  const content = await ensureBlitzBank(runId, { onEnough: () => { weekAt = Date.now() - t0; } }).catch((err: unknown) => {
    console.log(`FAILED after ${((Date.now() - t0) / 1000).toFixed(1)}s:`, err instanceof Error ? err.message : err);
    return { audiences: [] };
  });
  const total = Date.now() - t0;

  const stories = content.audiences.flatMap((a) => a.stories);
  console.log(`\nMODEL ${swapModel === 'same' ? 'gpt-5.5 (low)' : `${swapModel} (${effort ?? 'default'})`}`);
  console.log(`first 7 stories: ${(weekAt / 1000).toFixed(1)}s, full bank: ${(total / 1000).toFixed(1)}s, ${stories.length} stories, ${stories.reduce((n, s) => n + s.hooks.length, 0)} hooks`);
  const groups = new Map<string, Call[]>();
  calls.forEach((c) => groups.set(c.model, [...(groups.get(c.model) ?? []), c]));
  for (const [model, list] of groups) {
    const sum = (f: (c: Call) => number) => list.reduce((n, c) => n + f(c), 0);
    console.log(`  ${model.padEnd(14)} ×${list.length} (${list.filter((c) => !c.ok).length} failed)  $${sum((c) => c.usd).toFixed(4)}  in ${sum((c) => c.inTok)} out ${sum((c) => c.outTok)} (reasoning ${sum((c) => c.reasoningTok)})  avg ${(sum((c) => c.ms) / list.length / 1000).toFixed(1)}s  max ${(Math.max(...list.map((c) => c.ms)) / 1000).toFixed(1)}s`);
  }
  console.log(`TOTAL $${calls.reduce((n, c) => n + c.usd, 0).toFixed(4)}`);
  console.log('\nSAMPLE STORIES');
  stories.slice(0, 4).forEach((s) => console.log(`- [${s.stage}/${s.format}] ${Object.values(s.story).join(' / ')}\n  hooks: ${s.hooks.map((h) => h.text).join(' | ')}`));
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
