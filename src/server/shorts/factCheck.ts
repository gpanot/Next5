// server-only — never import from a 'use client' file.
// Fact check: every checkable claim in the script must be backed by the brand's source text, or else by the web
// (Exa answer via treg). The script step rewrites a draft until no claim is unsupported (or gives up and flags it).

import type { CostMeter } from '../metaAds/cost';
import { metaAdsJson } from '../metaAds/llm';
import type { ShortClaim, ShortInputs, ShortScript } from '../../types/admin/shorts';
import { stripTags } from './voice';
import { tregJson } from './treg';

/** gpt-5.4-nano was too literal (2026-10-08): it flagged the hook and plain explanations and burned every redraft. */
const MODEL = process.env.SHORTS_TEXT_MODEL ?? 'gpt-5.4-mini';

const SYSTEM = `You fact-check the voiceover of a short brand video against SOURCE.

1. List every checkable claim in the narration: numbers, prices, names, product features, comparisons, "first/only/best",
   results, statistics, dates, studies. Skip opinions, advice, the brand's own slogans quoted from SOURCE, and plain
   explanations of general ideas any expert would agree with ("a company follow means they know you exist"): the short
   teaches, so it explains things in its own words. Also skip the common belief the narration sets up only to contradict
   it ("most founders chase every lead"), and the closing takeaway stated as a lesson or advice ("a ready lead leaves
   signs before they reply"). Always check: claims about the brand, its customers or any number, and any cause given
   for a named customer's result ("KubaLabs booked 5 demos BECAUSE of intent signals" needs SOURCE to say why).
2. For each claim decide: "supported" if SOURCE states it (same meaning, numbers identical), else "unsupported".
   Common knowledge about the product category does not count: only SOURCE.

Return JSON: {"claims": [{"claim": string, "supported": boolean, "evidence": string}]}
"evidence" = the exact SOURCE words that support it, or "" when unsupported.`;

type Judged = { claims?: { claim?: string; supported?: boolean; evidence?: string }[] };
type ExaAnswer = { answer?: { supported?: boolean; evidence?: string } | string; citations?: { url?: string }[] };

const webCheck = async (brand: string, claim: string, meter: CostMeter): Promise<ShortClaim> => {
  try {
    const { data, costMicros } = await tregJson<ExaAnswer>('exa.web.answer', {
      body: {
        query: `Is this statement about ${brand} true? "${claim}". Say supported=true only if a reliable source confirms it exactly (same numbers).`,
        outputSchema: {
          type: 'object',
          properties: { supported: { type: 'boolean' }, evidence: { type: 'string' } },
          required: ['supported', 'evidence'],
        },
      },
      timeoutMs: 45_000,
    });
    meter.add('Web fact check (Exa via treg)', costMicros || 5_000);
    const answer = typeof data.answer === 'object' && data.answer ? data.answer : null;
    const source = data.citations?.[0]?.url ?? '';
    if (answer?.supported) return { claim, verdict: 'web', evidence: `${answer.evidence ?? ''}${source ? ` (${source})` : ''}`.trim() };
    return { claim, verdict: 'unsupported', evidence: answer?.evidence ?? '' };
  } catch (err) {
    return { claim, verdict: 'unsupported', evidence: `Web check failed: ${err instanceof Error ? err.message : String(err)}` };
  }
};

/** Every claim with its verdict. Claims SOURCE does not back are checked on the web, in parallel. */
export const factCheck = async (script: ShortScript, inputs: ShortInputs, meter: CostMeter): Promise<ShortClaim[]> => {
  // The hook is checked too: since 2026-10-08 the writer may rewrite the bank hook into a clear lesson hook.
  const body = [script.hook, ...script.mechanismLines, script.payoffLine].join(' ');
  const judged = await metaAdsJson<Judged>(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `SOURCE:\n${inputs.sourceText}\n\nNARRATION:\n${stripTags(body)}` },
    ],
    { maxTokens: 4_000, model: MODEL, reasoningEffort: 'medium', meter, label: `Fact check (${MODEL})` },
  );
  const claims = (judged.claims ?? []).filter((c) => c.claim?.trim());
  return Promise.all(
    claims.map((c) =>
      c.supported ? Promise.resolve<ShortClaim>({ claim: c.claim as string, verdict: 'source', evidence: c.evidence ?? '' }) : webCheck(inputs.brandName, c.claim as string, meter),
    ),
  );
};

/** What the writer must change, or null when every claim is backed. */
export const factFeedback = (claims: ShortClaim[]): string | null => {
  const bad = claims.filter((c) => c.verdict === 'unsupported');
  if (!bad.length) return null;
  return `These claims are not in SOURCE and could not be verified. Remove them or replace them with facts from SOURCE:\n${bad.map((c) => `- ${c.claim}`).join('\n')}`;
};
