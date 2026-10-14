// Temporary experiment: today's Blitz bank (20 stories, ~60 gpt-5.5 calls) vs a compact writer (4-5 calls) on the same
// site and the same 20 slots, scored by the code's own checks and a blind gpt-5.5 judge. Plus: does Jev pick better hooks?
// Run: npx tsx --env-file=.env.local scripts/tmp/blitz-compact-test.ts <workspaceId> <outDir>
/* eslint-disable no-console */
import { readFileSync, writeFileSync } from 'node:fs';

type Usage = { calls: number; usd: number; ms: number };
const usage: Record<string, Usage> = {};
let phase = 'setup';
const realFetch = globalThis.fetch;
const T0 = Date.now();
const sec = (ms: number) => (ms / 1000).toFixed(1);

const BEATS = ['pain', 'oldWay', 'mechanism', 'proof', 'inaction'] as const;
type Lines = { pain: string; oldWay: string; mechanism: string; proof: string; inaction: string; cta: string };
type Hook = { archetype: string; text: string };
type Story = { slot: number; stage: string; format: string; problem?: string; lines: Lines; hooks: Hook[]; photos: number; photoSample?: string };

async function main() {
  const [workspaceId, outDir] = process.argv.slice(2);
  if (!workspaceId || !outDir) throw new Error('usage: <workspaceId> <outDir>');
  const { openAiCostMicros } = await import('../../src/server/metaAds/cost');
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const start = Date.now();
    const res = await realFetch(input, init);
    const u = (usage[phase] ??= { calls: 0, usd: 0, ms: 0 });
    if (href.startsWith('https://api.openai.com/')) {
      const data = (await res.clone().json().catch(() => ({}))) as { usage?: { prompt_tokens?: number; completion_tokens?: number }; model?: string };
      u.calls += 1;
      u.usd += openAiCostMicros(data.model ?? 'gpt-5.5', data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0) / 1e6;
      u.ms += Date.now() - start;
    } else if (href.includes('openrouter.ai/api/alpha/decisions')) {
      u.calls += 1;
      u.usd += 0.00002;
    }
    return res;
  }) as typeof fetch;

  const { prisma } = await import('../../src/lib/db');
  const { chatJsonWithMeta } = await import('../../src/server/ai/openai');
  const { workspaceRunId } = await import('../../src/server/labs/workspaceRun');
  const { loadWebsiteSource, photoBrand, hookClaimIsProven } = await import('../../src/server/labs/websiteDeck');
  const { websiteEngine } = await import('../../src/server/slideshow/engines/website/engine');
  const { buildWebsiteMeatPrompt, shortAudience } = await import('../../src/server/slideshow/engines/website/prompts');
  const { lineGuard } = await import('../../src/server/slideshow/engines/website/guardrails');
  const { checkMeatDraft } = await import('../../src/server/slideshow/core/meatCheck');
  const { FORMAT_DEFS, STAGE_CTA } = await import('../../src/server/labs/blitzFormats');
  const { libraryFewShots } = await import('../../src/server/slideshow/core/hookLibrary');
  const { contentWords, findSlopPhrase, wordCount, wordOverlap } = await import('../../src/server/slideshow/core/copyGuards');
  const { generateHooks } = await import('../../src/server/slideshow/core/hooks');
  type Format = keyof typeof FORMAT_DEFS;
  type Stage = keyof typeof STAGE_CTA;

  const ask = async <T>(system: string, user: string, maxTokens: number, timeoutMs = 240_000): Promise<T | null> =>
    (await chatJsonWithMeta<T>([{ role: 'system', content: system }, { role: 'user', content: user }], { model: 'gpt-5.5', reasoningEffort: 'low', maxTokens, timeoutMs })).result;

  // ── Inputs: same site, same brief, same 20 slots as today's bank ──
  const studioRunId = await workspaceRunId(workspaceId);
  const source = await loadWebsiteSource(studioRunId);
  const brief = websiteEngine.briefs(source)[0]!;
  const studio = await prisma.studioRun.findUniqueOrThrow({ where: { id: studioRunId }, select: { brandProfileId: true } });
  const bank = await prisma.blitzScriptBank.findUniqueOrThrow({ where: { brandProfileId: studio.brandProfileId } });
  type BankStory = { story: Lines; hooks: Hook[]; stage: Stage; format: Format; trigger?: string; photos?: Record<string, { prompt: string }> };
  const bankStories = ((bank.content as unknown as { audiences: { stories: BankStory[] }[] }).audiences[0]!.stories).slice(0, 20);
  const guard = lineGuard(brief.facts);
  const rules = websiteEngine.hookRules(brief);
  const terms = [...[...contentWords(brief.idc)].filter((w) => w.length > 3), ...(rules.specifics ?? [])].map((t) => t.toLowerCase());

  const hookProblem = (h: Hook, story: Lines): string | null => {
    const storyTerms = [...terms, ...contentWords(story.pain), ...contentWords(story.mechanism)].map((t) => t.toLowerCase());
    const t = h.text.trim();
    if (!t) return 'empty';
    if (t.includes('!')) return 'exclamation';
    if (wordCount(t) > 8) return 'too long';
    if (findSlopPhrase(t)) return 'slop';
    const lower = t.toLowerCase();
    if (!/\d/.test(t) && !storyTerms.some((term) => lower.includes(term))) return 'nothing specific';
    if (!hookClaimIsProven(t, brief.proofPoints)) return 'unproven claim';
    return guard(t);
  };

  const baseline: Story[] = bankStories.map((s, i) => ({
    slot: i + 1, stage: s.stage, format: s.format, problem: s.trigger, lines: s.story, hooks: s.hooks,
    photos: Object.keys(s.photos ?? {}).length, photoSample: s.photos?.pain?.prompt,
  }));

  // ── Compact writer: call 1 writes all 20 stories, call 2 repairs the failed ones, call 3 all hooks, calls 4-5 photos ──
  phase = 'compact';
  const compactStart = Date.now();
  const full = buildWebsiteMeatPrompt({ ...brief, problem: undefined, storyBeats: undefined, ctaRule: undefined, proofFocus: undefined });
  const head = full.slice(0, full.indexOf('STORY (write the lines'));
  const rulesPart = full.slice(full.indexOf('RULES'), full.indexOf('OUTPUT:'));
  const slotText = baseline.map((s) => {
    const def = FORMAT_DEFS[s.format as Format];
    const beats = BEATS.map((b, k) => `line ${k + 1} = ${def.beats[b]}`).join(' | ');
    return `${s.slot}. stage ${s.stage}, format ${s.format}. Beats: ${beats} | cta: ${STAGE_CTA[s.stage as Stage].replaceAll('{name}', brief.business.name)}`;
  }).join('\n');
  const storySystem = `${head.replace('You write the story lines of a 26-second vertical video', 'You write the story lines of 20 different 26-second vertical videos')}
WRITE 20 STORIES, one per SLOT below. Each story is about its own concrete problem: a different real moment of their day.
No two stories share a problem, a setting or a punchline. Rotate the proof quotes across the stories.
For each story: "problem" (the moment, one line), then the five lines (pain = line 1, oldWay = line 2, mechanism = line 3,
proof = line 4, inaction = line 5) as its slot's beats say, then "cta" as its slot says. Write only the line text, no labels.
Beat 5 ("inaction") always ends with ":".

SLOTS
${slotText}

${rulesPart}
${full.slice(full.indexOf('STYLE EXAMPLES'), full.indexOf('OUTPUT:'))}
OUTPUT: JSON only, flat keys.
{"stories":[{"slot":1,"problem":"...","pain":"...","oldWay":"...","mechanism":"...","proof":"...","inaction":"...","cta":"..."}]}`;
  type RawStory = Partial<Lines> & { slot?: number; problem?: string };
  const clean = (v?: string) => (v ?? '').replace(/^\s*(pain|oldWay|old way|mechanism|proof|inaction|cta|line \d)\s*[:=]\s*/i, '').trim();
  const toLines = (r: RawStory): Lines => ({ pain: clean(r.pain), oldWay: clean(r.oldWay), mechanism: clean(r.mechanism), proof: clean(r.proof), inaction: clean(r.inaction), cta: clean(r.cta) });
  const t1 = Date.now();
  const reuse = process.env.REUSE ? (JSON.parse(readFileSync(process.env.REUSE, 'utf8')) as { compact: Story[] }).compact : null;
  const written = reuse ? [] : (await ask<{ stories?: RawStory[] }>(storySystem, 'Write the JSON now.', 20_000))?.stories ?? [];
  const storiesMs = Date.now() - t1;
  const compact: Story[] = baseline.map((b) => {
    const r = written.find((w) => Number(w.slot) === b.slot) ?? {};
    const old = reuse?.find((x) => x.slot === b.slot);
    if (old) return { ...old, hooks: [] };
    return { slot: b.slot, stage: b.stage, format: b.format, problem: r.problem, lines: toLines(r), hooks: [], photos: 0 };
  });
  const errorsOf = (s: Story) => checkMeatDraft(s.lines, s.lines.cta, guard);
  const firstPassFailed = compact.filter((s) => errorsOf(s).length > 0).map((s) => ({ slot: s.slot, errors: errorsOf(s) }));
  if (firstPassFailed.length > 0 && !reuse) {
    const fix = await ask<{ stories?: RawStory[] }>(storySystem, `Your stories:\n${JSON.stringify(compact.map((s) => ({ slot: s.slot, problem: s.problem, ...s.lines })))}\n\nThese broke the rules:\n${firstPassFailed.map((f) => `slot ${f.slot}: ${f.errors.join(' | ')}`).join('\n')}\n\nRewrite ONLY those slots, fixing every error. Same JSON shape.`, 8_000);
    for (const r of fix?.stories ?? []) {
      const s = compact.find((c) => c.slot === Number(r.slot));
      if (s) { s.lines = toLines(r); if (r.problem) s.problem = r.problem; }
    }
  }

  const archetypes = rules.droppedArchetypes ? ['call_out', 'contrarian', 'proof_result', 'fear_inaction', 'curiosity', 'action'].filter((a) => !rules.droppedArchetypes!.includes(a as never)) : ['call_out', 'contrarian', 'proof_result', 'fear_inaction', 'curiosity', 'action'];
  const shots = libraryFewShots();
  const hookSystem = `You write scroll-stopping hooks (the first on-screen line) for short vertical videos.
For EACH story below write 2 hooks per archetype (${archetypes.length * 2} per story).

AUDIENCE: ${brief.idc} (call them "${shortAudience(brief.idc)}")
PROOF: ${brief.proofPoints.map((p) => p.claim).join(' | ') || 'none. Do not invent any.'}

HARD RULES (a hook that breaks one is thrown away):
1. Max 8 words. Count them.
2. No "!" and no emojis.
3. Specific: name the audience, the place, a real number from PROOF, or the concrete feature. Generic hooks fail.
4. Only facts from the story and PROOF. No invented numbers, dates, deadlines or claims. A hook with a number restates a PROOF claim word for word.
5. Plain words a 9-year-old reads out loud. No hype words.
6. The hook speaks to the audience, never about the company. Hooks of one story say different things.

ARCHETYPES
${archetypes.map((a) => `[${a}] examples: ${shots.filter((f) => f.archetype === a).map((f) => `"${f.text}"`).join(', ')}`).join('\n')}

OUTPUT: JSON only, one entry per story, "slot" = the STORY number:
{"stories":[{"slot":1,"hooks":[{"archetype":"call_out","text":"..."}]}]}`;
  const t3 = Date.now();
  const hooksRaw = ((await ask<{ stories?: Array<{ slot?: number | string; hooks?: Hook[] }> }>(hookSystem, compact.map((s) => `STORY ${s.slot}: ${Object.values(s.lines).join(' / ')}`).join('\n'), 20_000))?.stories ?? [])
    .flatMap((st) => (st.hooks ?? []).map((h) => ({ ...h, slot: st.slot })));
  const hooksMs = Date.now() - t3;
  const hookDebug: Array<{ slot: number; raw: number; rejected: string[] }> = [];
  console.log(`hooks returned: ${hooksRaw.length}`, JSON.stringify(hooksRaw.slice(0, 3)));
  let hookTotal = 0;
  let hookValid = 0;
  for (const s of compact) {
    const slotOf = (h: { slot?: number | string }) => Number(String(h.slot ?? '').replace(/\D/g, ''));
    const mine = hooksRaw.filter((h) => slotOf(h) === s.slot).map((h) => ({ archetype: String(h.archetype).toLowerCase(), text: String(h.text ?? '').trim() }));
    hookTotal += mine.length;
    const valid = mine.filter((h) => !hookProblem(h, s.lines));
    hookDebug.push({ slot: s.slot, raw: mine.length, rejected: mine.flatMap((h) => { const why = hookProblem(h, s.lines); return why ? [`${why}: ${h.text}`] : []; }) });
    hookValid += valid.length;
    s.hooks = archetypes.flatMap((a) => valid.filter((h) => h.archetype === a).slice(0, 1));
  }

  const shotRules = /const RULES = `([\s\S]*?)`;/.exec(readFileSync('src/server/slideshow/core/shotPhotos.ts', 'utf8'))![1]!;
  const brand = photoBrand(source);
  const brandText = [`BUSINESS: ${brand.business}: ${brand.sells}`, `AUDIENCE: ${brief.idc}`, `Visual style: ${brand.look || 'everyday scenes of the audience at home or at work'}`, `Product as subject: ${brand.productAsSubject ? 'yes' : 'no'}`].join('\n');
  const t4 = Date.now();
  await Promise.all((reuse ? [] : [compact.slice(0, 10), compact.slice(10)]).map(async (group) => {
    const user = [brandText, ...group.map((s) => {
      const def = FORMAT_DEFS[s.format as Format];
      return [`STORY ${s.slot}: ${Object.values(s.lines).join(' / ')}`, ...BEATS.map((b) => `${s.slot}-${b} | ${def.labels[b]} (${b} shot) | line: "${s.lines[b]}"`)].join('\n');
    })].join('\n\n');
    const items = (await ask<{ items?: Array<{ key?: string; prompt?: string }> }>(shotRules, user, 20_000))?.items ?? [];
    for (const s of group) {
      const mine = items.filter((it) => it.key?.startsWith(`${s.slot}-`) && it.prompt);
      s.photos = mine.length;
      s.photoSample = mine.find((it) => it.key === `${s.slot}-pain`)?.prompt;
    }
  }));
  const photosMs = Date.now() - t4;
  const compactMs = Date.now() - compactStart;

  // ── Checks on both sets ──
  const dupPairs = (set: Story[]) => {
    let n = 0;
    set.forEach((a, i) => set.slice(i + 1).forEach((b) => { if (wordOverlap(a.lines.pain, b.lines.pain) >= 0.5) n += 1; }));
    return n;
  };
  const summary = (set: Story[]) => ({
    storiesPassingChecks: set.filter((s) => errorsOf(s).length === 0).length,
    lengthOnlyIssues: set.filter((s) => errorsOf(s).length > 0 && errorsOf(s).every((e) => e.startsWith('Too long'))).length,
    duplicatePainPairs: dupPairs(set),
    avgHooksKept: +(set.reduce((n, s) => n + s.hooks.length, 0) / set.length).toFixed(2),
    hooksFailingRules: set.reduce((n, s) => n + s.hooks.filter((h) => hookProblem(h, s.lines)).length, 0),
    shotsWithPhotoPrompt: set.reduce((n, s) => n + s.photos, 0),
  });

  // ── Blind judge, slot by slot ──
  phase = 'judge';
  const profile = head.slice(head.indexOf('PROFILE'));
  const show = (s: Story) => `HOOKS: ${s.hooks.map((h) => `"${h.text}"`).join(', ')}\nLINES: ${BEATS.map((b) => `${b}: ${s.lines[b]}`).join(' / ')} / cta: ${s.lines.cta}`;
  const verdicts = await Promise.all(baseline.map(async (b, i) => {
    const c = compact[i]!;
    const flip = Math.random() < 0.5;
    const [A, B] = flip ? [c, b] : [b, c];
    const v = await ask<{ winner?: string; scoreA?: number; scoreB?: number; reason?: string }>(
      `You judge scripts for a short TikTok video that will be posted by this business to reach ${brief.idc}.
${profile}
Score each script 1-10 for how well it would work as a real post: hooks that stop the scroll, a specific and believable
story from the audience's real life, true to the profile (no invented facts), clear plain words, a CTA that fits its stage (${b.stage}).
JSON only: {"scoreA":n,"scoreB":n,"winner":"A"|"B"|"tie","reason":"one short sentence"}`,
      `SCRIPT A\n${show(A)}\n\nSCRIPT B\n${show(B)}`, 2_000, 90_000);
    const win = v?.winner === 'tie' ? 'tie' : (v?.winner === 'A') !== flip ? 'today' : 'compact';
    return { slot: b.slot, winner: v ? win : 'error', today: flip ? v?.scoreB : v?.scoreA, compact: flip ? v?.scoreA : v?.scoreB, reason: v?.reason };
  }));

  // ── Jev: does its pick beat the plain pick (first valid hook per archetype, in the writer's order)? ──
  phase = 'jev';
  const jevStories = process.env.SKIP_JEV ? [] : baseline.slice(0, 8);
  const jevRows = await Promise.all(jevStories.map(async (s) => {
    const gen = await generateHooks({
      briefId: `test-${s.slot}`, audience: brief.idc, pain: s.lines.pain, dreamOutcome: '', proofLine: brief.proofPoints[0]?.claim ?? null,
      lensLine: brief.idcEvidence ? `Site says: "${brief.idcEvidence}"` : undefined, rules, levers: { dreamOutcome: '', oldWay: s.lines.oldWay, namedMechanism: s.lines.mechanism, proofPoints: brief.proofPoints },
    });
    const scores = gen.scores ?? {};
    const valid = gen.all.filter((h) => scores[h.text] !== undefined);
    phase = 'judge';
    const rated = await ask<{ ratings?: Array<{ i?: number; score?: number }> }>(
      `Rate each opening line of a TikTok video for ${brief.idc}: how likely is this viewer to stop scrolling and keep watching? 1-10. Judge each on its own.
JSON only: {"ratings":[{"i":0,"score":n}]}`,
      valid.map((h, i) => `${i}. "${h.text}"`).join('\n'), 3_000, 90_000);
    phase = 'jev';
    const judgeScore = new Map(valid.map((h, i) => [h.text, rated?.ratings?.find((r) => Number(r.i) === i)?.score ?? null]));
    const picks = archetypes.map((a) => {
      const pool = valid.filter((h) => h.archetype === a);
      const jevPick = [...pool].sort((x, y) => (scores[y.text] ?? 0) - (scores[x.text] ?? 0))[0];
      return { archetype: a, jevPick: jevPick?.text, plainPick: pool[0]?.text, jevJudge: jevPick ? judgeScore.get(jevPick.text) : null, plainJudge: pool[0] ? judgeScore.get(pool[0].text) : null };
    });
    return { slot: s.slot, valid: valid.map((h) => ({ text: h.text, archetype: h.archetype, jev: +scores[h.text]!.toFixed(2), judge: judgeScore.get(h.text) })), picks };
  }));
  const rank = (xs: number[]) => { const order = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]); const r = new Array<number>(xs.length); order.forEach(([, i], k) => { r[i] = k; }); return r; };
  const spearman = (a: number[], b: number[]) => { const ra = rank(a); const rb = rank(b); const n = a.length; const d = ra.reduce((s, x, i) => s + (x - rb[i]!) ** 2, 0); return 1 - (6 * d) / (n * (n * n - 1)); };
  const rhos = jevRows.map((r) => { const v = r.valid.filter((h) => typeof h.judge === 'number'); return v.length > 3 ? spearman(v.map((h) => h.jev), v.map((h) => h.judge as number)) : null; }).filter((x): x is number => x !== null);
  const differing = jevRows.flatMap((r) => r.picks).filter((p) => p.jevPick && p.plainPick && p.jevPick !== p.plainPick);
  const jevBetter = differing.filter((p) => (p.jevJudge ?? 0) > (p.plainJudge ?? 0)).length;
  const plainBetter = differing.filter((p) => (p.plainJudge ?? 0) > (p.jevJudge ?? 0)).length;

  const result = {
    timing: { compactTotalS: sec(compactMs), storiesS: sec(storiesMs), hooksS: sec(hooksMs), photosS: sec(photosMs), firstPassFailed: firstPassFailed.length },
    usage,
    checks: { today: summary(baseline), compact: summary(compact) },
    judge: {
      today: verdicts.filter((v) => v.winner === 'today').length, compact: verdicts.filter((v) => v.winner === 'compact').length, tie: verdicts.filter((v) => v.winner === 'tie').length,
      avgToday: +(verdicts.reduce((n, v) => n + (v.today ?? 0), 0) / verdicts.length).toFixed(2), avgCompact: +(verdicts.reduce((n, v) => n + (v.compact ?? 0), 0) / verdicts.length).toFixed(2),
    },
    hookDebug, hookTotal, hookValid,
    jev: { stories: jevRows.length, avgSpearmanJevVsJudge: rhos.length ? +(rhos.reduce((a, b) => a + b, 0) / rhos.length).toFixed(2) : null, picksDiffering: differing.length, picksTotal: jevRows.flatMap((r) => r.picks).length, jevPickJudgedBetter: jevBetter, plainPickJudgedBetter: plainBetter },
    verdicts, baseline, compact, jevRows, totalS: sec(Date.now() - T0),
  };
  writeFileSync(`${outDir}/blitz-compact-result${process.env.REUSE ? '-3' : process.env.SKIP_JEV ? '-2' : ''}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ timing: result.timing, usage, checks: result.checks, judge: result.judge, jev: result.jev }, null, 2));
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
