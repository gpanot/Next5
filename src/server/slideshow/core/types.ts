// server-only — never import from a 'use client' file.
// Shared type foundation for both slideshow engines (website + zillow).
// Everything downstream of the engine (deck, editor, render) reads/writes only these types.

// ── Primitives ────────────────────────────────────────────────────────────────

export type MediaKind = 'image' | 'video' | 'ugc';

export type EnergyLevel = 'low' | 'medium' | 'high';

export type Tone = 'casual' | 'authoritative' | 'witty' | 'inspirational' | 'educational';

export type CaptionPreset =
  | 'bold_white'
  | 'minimal_black'
  | 'neon_outline'
  | 'serif_cream'
  | 'sans_yellow'
  | 'cinematic_subtitle'
  | 'typewriter';

// ── Hook archetypes ───────────────────────────────────────────────────────────

export type HookArchetype =
  | 'call_out'      // name the audience
  | 'contrarian'    // flip a belief
  | 'proof_result'  // show the outcome first (requires proofPoints)
  | 'fear_inaction' // show a hidden loss
  | 'curiosity'     // open a loop
  | 'action';       // demand a response

export const HOOK_ARCHETYPES: HookArchetype[] = [
  'call_out',
  'contrarian',
  'proof_result',
  'fear_inaction',
  'curiosity',
  'action',
];

// ── Listing angles (Zillow engine) ────────────────────────────────────────────

export type ListingAngle =
  | 'just_listed'
  | 'price_reduction'
  | 'open_house'
  | 'sold'
  | 'feature_highlight';
// 'neighborhood' excluded in v1 (Fair Housing risk)

// ── Shot roles ────────────────────────────────────────────────────────────────

export type ShotRole = 'hook' | 'pain' | 'old_way' | 'mechanism' | 'proof' | 'inaction' | 'cta';

// ── Core Shot type ────────────────────────────────────────────────────────────

export type Shot = {
  role: ShotRole;
  media: {
    kind: MediaKind;
    key: string;          // R2 key
    assetId?: string;     // blitz_assets / ugc_videos id, when from the library
    trimStart?: number;   // seconds, video only
    trimEnd?: number;     // seconds, video only
  };
  text: string;
  textZone: 'top' | 'middle' | 'bottom';
  /** Runner-up asset ids for one-tap swap in the editor. */
  alternatives: string[];
};

// ── ShotPlan — the contract between engine, deck, editor, and render ──────────

export type ShotPlan = {
  hook: Shot;
  meat: {
    pain: Shot;
    oldWay: Shot;
    mechanism: Shot;
    proof: Shot;
    inaction: Shot;
  };
  cta: Shot;
  audio: { assetId: string; key: string; startAt: number } | null;
  style: CaptionPreset;
  tags: {
    engine: 'website' | 'zillow';
    briefId: string;
    /** Website engine: "Electricians" */
    idc?: string;
    /** Zillow engine */
    angle?: ListingAngle;
    archetype: HookArchetype;
  };
};

// ── Proof point (website engine) ─────────────────────────────────────────────

export type ProofPoint = {
  claim: string;
  evidence: string;
  sourceUrl: string;
};

// ── Value levers (Hormozi Value Equation step 1) ──────────────────────────────

export type ValueLevers = {
  dreamOutcome: string;
  oldWay: string;
  namedMechanism: string;
  timeToFirstWin?: string;
  effortAvoided?: string;
  proofPoints: ProofPoint[];
};

// ── Meat lines (output of the per-brief LLM call) ────────────────────────────

export type MeatLines = {
  pain: string;
  oldWay: string;
  mechanism: string;
  proof: string;
  inaction: string;
  cta: string;
};

// ── Slot rules — how each engine configures asset selection ──────────────────

export type SlotRule = {
  slotColumn: 'slot_hook' | 'slot_problem' | 'slot_payoff' | 'slot_proof' | 'slot_cta';
  minScore: number;
  energyLevels: EnergyLevel[];
  preferKind?: MediaKind;
};

export type SlotRules = {
  hook: SlotRule;
  pain: SlotRule;
  oldWay: SlotRule;
  mechanism: SlotRule;
  proof: SlotRule;
  inaction: SlotRule;
  cta: SlotRule;
};

// ── Hook rules — per-engine tuning for hook generation ───────────────────────

export type HookFewShot = {
  archetype: HookArchetype;
  text: string;
  context?: string;
};

export type HookRules = {
  fewShots: HookFewShot[];
  extraInstruction?: string;
  /** Archetypes to skip for this brief (e.g. 'proof_result' when no proofPoints exist). */
  droppedArchetypes?: HookArchetype[];
  /**
   * Terms that make a hook specific to this brief: IDC name, city, listing numbers, feature words.
   * Used by the "why care" test and the specificity ranking.
   */
  specifics?: string[];
  /** Engine guardrail on one hook line (numbers, Fair Housing, proof). Returns a reason, or null when OK. */
  guard?: (text: string) => string | null;
};

// ── Validation issue ─────────────────────────────────────────────────────────

export type IssueLevel = 'error' | 'warning';

export type Issue = {
  level: IssueLevel;
  code: string;
  message: string;
  /** Which shot the issue applies to, if any. */
  shotRole?: ShotRole;
};

// ── SlideshowRenderPayload — what the blitz-worker receives ──────────────────

export type SlideshowRenderPayload = {
  compositionId: 'Slideshow7';
  fps: 30;
  shots: Array<{
    role: ShotRole;
    durationSec: number;
    media: Shot['media'];
    text: string;
    textZone: string;
  }>;
  audio: { key: string; startAt: number } | null;
  style: CaptionPreset;
};

// ── Engine interface ─────────────────────────────────────────────────────────

export interface SlideshowEngine<Source, Brief> {
  id: 'website' | 'zillow';
  briefs(source: Source): Brief[];
  writeMeat(brief: Brief): Promise<{ levers: ValueLevers; meat: MeatLines; cta: string }>;
  hookRules(brief: Brief): HookRules;
  slotRules(brief: Brief): SlotRules;
  validate(plan: ShotPlan, brief: Brief): Issue[];
}

// ── Deck item ────────────────────────────────────────────────────────────────

export type SwipeAction = 'keep' | 'discard' | 'open';

export type DeckItemStatus = 'proposed' | 'kept' | 'discarded' | 'edited' | 'rendered' | 'failed';

export type DeckItem = {
  variantId: string;
  briefId: string;
  plan: ShotPlan;
  status: DeckItemStatus;
  /** Poster frame URL for card thumbnail (optional, shown while preview loads). */
  posterUrl?: string;
};
