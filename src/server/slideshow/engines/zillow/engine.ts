// server-only — zillow engine implementation.
// Generates briefs per eligible listing angle and enforces Fair Housing guardrails.

import type {
  HookRules,
  Issue,
  ListingAngle,
  ShotPlan,
  SlotRules,
  SlideshowEngine,
} from '../../core/types';
import { allowedNumbers, guardLine, usd, type ZillowFacts } from './guardrails';
import { writeMeatWithRetries } from '../../core/meatWriter';
import { buildMeatPrompt, featureTags, zillowHookExamples } from './prompts';

// ── Zillow source / facts ─────────────────────────────────────────────────────

export type ZillowSource = {
  facts: ZillowFacts;
  /** GPT-4o photo tags for the listing (listing photos by tag). */
  photoTags: string[];
  /** Eligible angles produced by eligibleAngles() in slideshowCopy.ts. */
  eligibleAngles: ListingAngle[];
};

export type ZillowBrief = {
  id: string;
  angle: ListingAngle;
  /** 'buyers' for most angles; 'sellers' for 'sold'. */
  audience: 'buyers' | 'sellers';
  facts: ZillowFacts;
  photoTags: string[];
};

// ── Audience by angle ─────────────────────────────────────────────────────────

const ANGLE_AUDIENCE: Record<ListingAngle, 'buyers' | 'sellers'> = {
  just_listed: 'buyers',
  price_reduction: 'buyers',
  open_house: 'buyers',
  feature_highlight: 'buyers',
  sold: 'sellers',
};

export const audienceForAngle = (angle: ListingAngle): 'buyers' | 'sellers' => ANGLE_AUDIENCE[angle];

// ── Engine ────────────────────────────────────────────────────────────────────

export const zillowEngine: SlideshowEngine<ZillowSource, ZillowBrief> = {
  id: 'zillow',

  briefs(source) {
    // Priority order from the spec; top 2 eligible angles only
    const PRIORITY: ListingAngle[] = ['price_reduction', 'open_house', 'just_listed', 'sold', 'feature_highlight'];
    const sorted = PRIORITY.filter((a) => source.eligibleAngles.includes(a)).slice(0, 2);
    return sorted.map((angle, i) => ({
      id: `zillow-brief-${i}`,
      angle,
      audience: ANGLE_AUDIENCE[angle],
      facts: source.facts,
      photoTags: source.photoTags,
    }));
  },

  /** Writes levers + meat + CTA, checks every line against the listing, retries with the errors. */
  async writeMeat(brief) {
    const { facts, angle, audience, photoTags } = brief;
    const allowed = allowedNumbers(facts);
    return writeMeatWithRetries({
      label: 'ZillowEngine',
      systemPrompt: buildMeatPrompt(facts, angle, audience, photoTags),
      guard: (t) => guardLine(t, allowed),
    });
  },

  hookRules(brief) {
    const { facts, angle, photoTags } = brief;
    const allowed = allowedNumbers(facts);
    const rules: HookRules = {
      fewShots: zillowHookExamples(facts, angle, photoTags),
      extraInstruction:
        `Build call_out and action hooks from the city "${facts.city ?? 'the area'}" and the price. ` +
        'proof_result hooks lead with beds, sqft or price exactly as listed.',
      // Listing facts are real proof, so every archetype stays in play (spec 7.1, Zillow column).
      specifics: [
        facts.city,
        facts.state,
        facts.priceUsd != null ? usd(facts.priceUsd) : null,
        ...featureTags(photoTags),
        'buyer', 'seller', 'open house', 'price',
      ].filter((s): s is string => Boolean(s)),
      guard: (text) => guardLine(text, allowed),
    };
    return rules;
  },

  slotRules() {
    const baseRule = { minScore: 0.5, energyLevels: ['medium' as const] };
    const rules: SlotRules = {
      hook: { ...baseRule, slotColumn: 'slot_hook' },
      pain: { ...baseRule, slotColumn: 'slot_problem' },
      oldWay: { ...baseRule, slotColumn: 'slot_problem' },
      mechanism: { ...baseRule, slotColumn: 'slot_payoff', preferKind: 'image' },
      proof: { ...baseRule, slotColumn: 'slot_proof', preferKind: 'image' },
      inaction: { ...baseRule, slotColumn: 'slot_problem' },
      cta: { ...baseRule, slotColumn: 'slot_cta' },
    };
    return rules;
  },

  /** Guardrails on a full plan: runs on generation and again after the user edits a card. */
  validate(plan: ShotPlan, brief) {
    const allowed = allowedNumbers(brief.facts);
    const shots = [
      plan.hook, plan.meat.pain, plan.meat.oldWay,
      plan.meat.mechanism, plan.meat.proof, plan.meat.inaction, plan.cta,
    ];
    return shots.flatMap((shot): Issue[] => {
      const reason = guardLine(shot.text, allowed);
      return reason ? [{ level: 'error', code: 'GUARDRAIL', message: `${shot.role}: ${reason}`, shotRole: shot.role }] : [];
    });
  },
};
