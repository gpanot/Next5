// server-only — website engine implementation (spec section 5).
// One brief per IDC from the Campaign Studio profile; the video speaks to the IDC about their problem.

import { contentWords } from '../../core/copyGuards';
import { writeMeatWithRetries } from '../../core/meatWriter';
import type { StudioProfileData } from '../../../studio/types';
import type {
  HookRules,
  Issue,
  ProofPoint,
  ShotPlan,
  SlotRules,
  SlideshowEngine,
  Tone,
} from '../../core/types';
import { lineGuard, type WebsiteFacts } from './guardrails';
import { buildWebsiteMeatPrompt, websiteHookExamples, type WebsiteBriefInput } from './prompts';

/** Cap per deck: 3 audiences × 6 hooks = 18 cards (spec open question: 30 cards is too many). */
export const MAX_WEBSITE_BRIEFS = 3;

// ── Source ────────────────────────────────────────────────────────────────────

export type WebsiteSource = {
  profile: StudioProfileData;
  sourceUrl: string;
  workspaceId: string | null;
};

export type WebsiteBrief = WebsiteBriefInput & {
  id: string;
  facts: WebsiteFacts;
};

const TONES: Tone[] = ['casual', 'authoritative', 'witty', 'inspirational', 'educational'];

/** Profile → the facts every brief shares. Older profiles have no proof points: mechanism-as-proof. */
function sharedBrief(source: WebsiteSource): Omit<WebsiteBriefInput, 'idc' | 'idcEvidence'> & { facts: WebsiteFacts } {
  const p = source.profile;
  const proofPoints: ProofPoint[] = (p.market.proofPoints?.value ?? []).map((pp) => ({ ...pp, sourceUrl: source.sourceUrl }));
  const business = {
    name: p.identity.businessName.value,
    promoting: p.positioning.promoting.value,
    offer: p.positioning.offer.value,
    positioning: p.positioning.positioning.value,
    tagline: p.identity.tagline.value,
    description: p.identity.description.value,
    geography: p.positioning.geography.value,
  };
  const rawTone = p.tone.tone.value;
  return {
    audienceDescription: p.market.audienceDescription.value,
    business,
    tone: (TONES.find((t) => rawTone.startsWith(t)) ?? 'casual') as Tone,
    proofPoints,
    suggestedHooks: p.tone.hooks.value ?? [],
    facts: {
      siteText: [business.promoting, business.offer, business.positioning, business.tagline, business.description],
      proofPoints,
      competitors: p.market.competitors.value ?? [],
    },
  };
}

// ── Engine ────────────────────────────────────────────────────────────────────

export const websiteEngine: SlideshowEngine<WebsiteSource, WebsiteBrief> = {
  id: 'website',

  /** One brief per evidenced IDC (max 3); B2C or no evidence → one brief for the described customer. */
  briefs(source) {
    const shared = sharedBrief(source);
    const market = source.profile.market;
    const idcs = market.targetCustomerIndustries.value ?? [];
    const evidence = market.targetCustomerIndustries.evidence ?? [];
    const lenses = idcs.length > 0
      ? idcs.slice(0, MAX_WEBSITE_BRIEFS).map((idc, i) => ({ idc, idcEvidence: evidence[i] ?? '' }))
      : [{ idc: shared.audienceDescription || 'Customers', idcEvidence: '' }];
    return lenses.map((lens, i) => ({ ...shared, ...lens, id: `website-brief-${i}` }));
  },

  async writeMeat(brief) {
    return writeMeatWithRetries({
      label: `WebsiteEngine:${brief.idc}`,
      systemPrompt: buildWebsiteMeatPrompt(brief),
      guard: lineGuard(brief.facts),
      proofPoints: brief.proofPoints,
    });
  },

  hookRules(brief) {
    const rules: HookRules = {
      fewShots: websiteHookExamples(brief),
      extraInstruction:
        `Build call_out and action hooks directly from "${brief.idc}". The hook speaks to ${brief.idc}, never about the company.`,
      // Result-first needs real proof (spec 7.4); without it the slot is refilled from fear/curiosity.
      droppedArchetypes: brief.proofPoints.length === 0 ? ['proof_result'] : undefined,
      specifics: [...contentWords(brief.idc), ...(brief.business.geography ? contentWords(brief.business.geography) : [])],
      guard: lineGuard(brief.facts),
    };
    return rules;
  },

  /** Kept for the SlideshowEngine interface; media direction lives in media.ts. */
  slotRules() {
    const base = { minScore: 0.4, energyLevels: ['medium' as const] };
    const rules: SlotRules = {
      hook: { ...base, slotColumn: 'slot_hook' },
      pain: { ...base, slotColumn: 'slot_problem' },
      oldWay: { ...base, slotColumn: 'slot_problem' },
      mechanism: { ...base, slotColumn: 'slot_payoff' },
      proof: { ...base, slotColumn: 'slot_proof' },
      inaction: { ...base, slotColumn: 'slot_problem' },
      cta: { ...base, slotColumn: 'slot_cta' },
    };
    return rules;
  },

  validate(plan: ShotPlan, brief) {
    const guard = lineGuard(brief.facts);
    const shots = [plan.hook, plan.meat.pain, plan.meat.oldWay, plan.meat.mechanism, plan.meat.proof, plan.meat.inaction, plan.cta];
    return shots.flatMap((shot): Issue[] => {
      const reason = guard(shot.text);
      return reason ? [{ level: 'error', code: 'GUARDRAIL', message: `${shot.role}: ${reason}`, shotRole: shot.role }] : [];
    });
  },
};
