// server-only — website engine prompts (spec 5.3, 5.4).
// The video talks TO the IDC about THEIR problem. The product appears only in Mechanism and CTA.

import type { HookFewShot, ProofPoint, Tone } from '../../core/types';

export type WebsiteBriefInput = {
  idc: string;
  /** Verbatim quote from the site that shows they serve this IDC. */
  idcEvidence: string;
  audienceDescription: string;
  business: {
    name: string;
    promoting: string;
    offer: string;
    positioning: string;
    tagline: string;
    description: string;
    geography: string;
    /** How customers buy or reach them. Manual profiles only; websites leave it empty. */
    howToBuy?: string;
  };
  tone: Tone;
  proofPoints: ProofPoint[];
  /** Hook ideas the profile extractor wrote for this business's end customer. */
  suggestedHooks: string[];
  /** Vision descriptions of the business's own product photos (manual profiles). */
  productPhotos: string[];
  /** The problem this story is about, picked ahead so a bank's stories differ (Blitz Script Bank). */
  problem?: string;
  /** Blitz story format: what beats 1–5 say (one line each, keyed pain…inaction), replacing the default story. */
  storyBeats?: string[];
  /** What the CTA asks (by campaign stage). */
  ctaRule?: string;
  /** The proof quote this story restates, so a bank's stories rotate their proof. */
  proofFocus?: string;
};

function profileBlock(b: WebsiteBriefInput): string {
  return [
    `- Audience (who the video speaks to): ${b.idc}`,
    b.idcEvidence ? `- Site quote showing they serve ${b.idc}: "${b.idcEvidence}"` : '',
    b.audienceDescription ? `- Typical customer: ${b.audienceDescription}` : '',
    `- Business: ${b.business.name}`,
    `- What it is: ${b.business.promoting}`,
    `- Core promise: ${b.business.offer}`,
    `- What makes it different: ${b.business.positioning}`,
    b.business.tagline ? `- Tagline: ${b.business.tagline}` : '',
    b.business.description ? `- Description: ${b.business.description}` : '',
    b.business.geography ? `- Where: ${b.business.geography}` : '',
    b.business.howToBuy ? `- How customers buy: ${b.business.howToBuy}` : '',
    `- Tone: ${b.tone}`,
  ].filter(Boolean).join('\n');
}

function proofBlock(proof: ProofPoint[], focus?: string): string {
  if (proof.length === 0) {
    return `PROOF: the site shows none. Use MECHANISM-AS-PROOF: show how little time or effort the fix takes,
or describe the product doing the job ("Clients pick a slot, you get a text"). No numbers unless the profile above prints them.`;
  }
  return `PROOF (verified quotes from the site; the proof line must restate ONE of these, numbers exactly as written):
${proof.map((p) => `- ${p.claim}  (quote: "${p.evidence}")`).join('\n')}${focus ? `\nUse this one: ${focus}` : ''}`;
}

// Examples use pool cleaners on purpose: few profiles are about them, so the model learns the
// style without copying lines.
const EXAMPLES = `STYLE EXAMPLES (a route app for pool cleaners). Show the style only. Never copy these words.
- pain: "Running a business is hard" (weak, generic) vs "Driving back across town for a missed pool" (strong)
- oldWay: "Using old tools" (weak) vs "Paper route sheets and a group text" (strong)
- mechanism: "Our innovative platform" (weak) vs "The app plans your route every morning" (strong)
- proof: "Trusted by many" (weak) vs "Every stop logged with a photo" (strong, mechanism-as-proof)
- inaction: "Don't wait" (weak) vs "Every wasted mile is unpaid time. Here's the fix:" (strong)`;

export function buildWebsiteMeatPrompt(b: WebsiteBriefInput): string {
  return `You write the story lines of a 26-second vertical video for ${b.idc}.
It speaks TO ${b.idc} about THEIR day, not about the software or company.
The business and product appear only in "mechanism" and "cta".

PROFILE (the only facts you may use)
${profileBlock(b)}

${proofBlock(b.proofPoints, b.proofFocus)}
${photoBlock(b.productPhotos)}
STORY (write the lines in this order, each builds on the one before)
${problemStep(b)}
${storySteps(b)}

RULES
- Max 10 words per line. cta max 7 words.
- Plain words a 9-year-old reads out loud. No hype: innovative, seamless, game-changer, unlock, elevate.
- No number that is not printed in the profile or proof quotes. No "guaranteed", "#1", "best", "leading".
- Never name a competitor. No "!" and no emojis.

${EXAMPLES}

OUTPUT: JSON only.
{
  "levers": { "dreamOutcome": "...", "oldWay": "...", "namedMechanism": "<what the product does>", "timeToFirstWin": "...", "effortAvoided": "..." },
  "meat": { "pain": "...", "oldWay": "...", "mechanism": "...", "proof": "...", "inaction": "..." },
  "cta": "..."
}`;
}

function storySteps(b: WebsiteBriefInput): string {
  const cta = b.ctaRule
    ? `cta: ${b.ctaRule.replaceAll('{name}', b.business.name)}`
    : 'cta: one action the business offers (book a demo, start a trial, call). Use "How customers buy" or the site\'s wording when the profile has it.';
  const beats = b.storyBeats ?? [
    `pain: that problem in ${b.idc}'s own words, a moment from their workday.`,
    `oldWay: how ${b.idc} cope with it today.`,
    'mechanism: what the product does about it, named plainly. Name the ONE thing that fixes this exact problem, never a list of everything it does.',
    'proof: see PROOF above.',
    'inaction: the cost of leaving THIS problem as it is, then a short bridge ending with ":". Do not repeat the pain.',
  ];
  return [...beats, cta].map((line, i) => `${i + 2}. ${line}`).join('\n');
}

function problemStep(b: WebsiteBriefInput): string {
  if (b.problem) return `1. The story is about this, already chosen: "${b.problem}". Tell exactly this, not a nearby one.`;
  return `1. Pick ONE concrete problem ${b.idc} have that this business solves. It must follow from the profile.`;
}

/** Real product photos: mechanism and proof are written to match one, so the photo plays behind the line. */
function photoBlock(photos: string[]): string {
  if (photos.length === 0) return '';
  return `\nPRODUCT PHOTOS (real photos from the business; they play behind "mechanism", "proof" and "cta")
${photos.map((d, i) => `- photo ${i + 1}: ${d}`).join('\n')}
Write "mechanism" and "proof" so each one describes something a photo above shows. Never describe what no photo shows.
Photos are facts about what they sell, not proof of numbers.\n`;
}

/** What a hook calls the audience: the IDC up to its first "and/who/looking…" ("Home cooks and families looking…" → "Home cooks"). */
export const shortAudience = (idc: string): string =>
  idc.replace(/[.\s]+$/, '').split(/\s+(?:and|who|that|looking|with|in|for|wanting|trying)\b/i)[0]!.trim() || idc;

/** Brief-specific hook examples built from the IDC name and the profile's own hook ideas. */
export function websiteHookExamples(b: WebsiteBriefInput): HookFewShot[] {
  const idc = shortAudience(b.idc);
  const lower = idc.toLowerCase();
  const shots: HookFewShot[] = [
    { archetype: 'call_out', text: `${idc}, this one is for you` },
    { archetype: 'action', text: `Send this to ${/^[aeiou]/i.test(lower) ? 'an' : 'a'} ${lower.replace(/s$/, '')} you know` },
    { archetype: 'curiosity', text: `What ${lower} wish they knew sooner` },
  ];
  if (b.proofPoints[0]) shots.push({ archetype: 'proof_result', text: b.proofPoints[0].claim });
  // Profile hook ideas are unlabeled; offered as curiosity examples.
  b.suggestedHooks.slice(0, 2).forEach((h) => shots.push({ archetype: 'curiosity', text: h }));
  return shots;
}
