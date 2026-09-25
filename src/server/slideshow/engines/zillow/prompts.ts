// server-only — zillow engine prompts.
// One prompt writes value levers + 5 meat lines + CTA (Hormozi: problem -> solution -> proof -> urgency -> ask).

import type { HookFewShot, ListingAngle } from '../../core/types';
import { angleFact, usd, type ZillowFacts } from './guardrails';

const DESCRIPTION_MAX_CHARS = 1200;

/** Photo tags that name a room or feature a buyer cares about (not "other"). */
export const featureTags = (photoTags: string[]): string[] =>
  [...new Set(photoTags)].filter((t) => t && t !== 'other' && t !== 'exterior');

function factsBlock(facts: ZillowFacts, angle: ListingAngle, photoTags: string[]): string {
  return [
    `- City: ${facts.city ?? 'unknown'}${facts.state ? `, ${facts.state}` : ''}`,
    `- Price: ${facts.priceUsd != null ? usd(facts.priceUsd) : 'not listed'}`,
    `- Beds: ${facts.beds ?? '?'}, Baths: ${facts.baths ?? '?'}, Sqft: ${facts.sqft?.toLocaleString('en-US') ?? '?'}`,
    `- Angle fact: ${angleFact(facts, angle)}`,
    `- Photos we have: ${featureTags(photoTags).join(', ') || 'exterior only'}`,
    `- Listing description: ${(facts.description ?? 'none').slice(0, DESCRIPTION_MAX_CHARS)}`,
  ].join('\n');
}

const BUYER_STORY = `STORY (write the lines in this order, each builds on the one before)
1. Pick ONE standout feature. It must appear in the description or the photos list. This is the mechanism.
2. pain: life without that feature, in the buyer's own words. Qualitative, no statistics.
3. oldWay: the compromise buyers make about that same feature today.
4. mechanism: this home has the feature. Name it concretely (what, where, how big if stated).
5. proof: the hard facts: beds, baths, sqft or price, exactly as listed.
6. inaction: START with the angle fact, stated plainly (it is the real cost of waiting), then a short bridge ending with ":". Do not repeat the pain.
7. cta: one action: DM, book a tour, or come to the open house.`;

const SELLER_STORY = `STORY (sold listing, audience is homeowners thinking of selling)
1. Pick ONE feature this listing led with. It must appear in the description or the photos list.
2. pain: a seller's worry about selling, in their own words. Qualitative, no statistics.
3. oldWay: what sellers usually do: list and wait, or cut the price.
4. mechanism: this home led with that feature. Name it.
5. proof: the sold facts: days on market and price, exactly as listed.
6. inaction: the cost of waiting to sell, then a short bridge ending with ":". Do not repeat the pain.
7. cta: one action, e.g. "DM me for your home's value".`;

// Examples use a home office on purpose: most listings do not have one, so the model learns the
// style without copying lines. Copied examples were the main source of invented details.
const EXAMPLES = `STYLE EXAMPLES (for a home with an office). Show the style only. Never copy these words.
- pain: "Finding the right home is hard" (weak, generic) vs "Taking work calls from the kitchen table" (strong)
- oldWay: "Settling for less" (weak) vs "Squeezing a desk into the guest room" (strong)
- mechanism: "This home has it all" (weak) vs "A real office with a door, off the entry" (strong)
- inaction: "This home won't last long" (weak, market claim) vs "<the angle fact in a few words>. See what you get:" (strong)`;

export function buildMeatPrompt(
  facts: ZillowFacts,
  angle: ListingAngle,
  audience: 'buyers' | 'sellers',
  photoTags: string[],
): string {
  return `You write the story lines of a 26-second vertical real-estate video for ${audience}.
Angle: ${angle}.

LISTING FACTS (the only facts you may use)
${factsBlock(facts, angle, photoTags)}

${audience === 'sellers' ? SELLER_STORY : BUYER_STORY}

RULES
- Max 10 words per line. cta max 7 words.
- Plain words a 9-year-old reads out loud. Short. No hype: stunning, dream home, nestled, must-see, hidden gem, won't last.
- Every number must appear in LISTING FACTS. Never state a date or deadline that is not listed.
- Describe the property, never the people: no "perfect for families", "safe", "great schools", no one's age, faith or family.
- No market claims: no "rare", "hot market", "prices are rising", "selling fast".
- No "!" and no emojis.

${EXAMPLES}

OUTPUT: JSON only.
{
  "levers": { "dreamOutcome": "...", "oldWay": "...", "namedMechanism": "<the feature>", "timeToFirstWin": "..." },
  "meat": { "pain": "...", "oldWay": "...", "mechanism": "...", "proof": "...", "inaction": "..." },
  "cta": "..."
}`;
}

/** Brief-specific hook examples. Every one uses only listing facts, so none can teach a false claim. */
export function zillowHookExamples(facts: ZillowFacts, angle: ListingAngle, photoTags: string[]): HookFewShot[] {
  const city = facts.city ?? 'town';
  const price = facts.priceUsd != null ? usd(facts.priceUsd) : null;
  const room = featureTags(photoTags)[0] ?? 'backyard';
  const shots: HookFewShot[] = [
    { archetype: 'call_out', text: price ? `House hunting in ${city} around ${price}?` : `House hunting in ${city}?` },
    { archetype: 'contrarian', text: `Don't judge this ${city} home by the front` },
    { archetype: 'curiosity', text: `Wait until you see the ${room}` },
    { archetype: 'action', text: `Send this to someone house hunting in ${city}` },
  ];
  if (facts.beds != null && price) {
    shots.push({ archetype: 'proof_result', text: `${facts.beds} beds in ${city} for ${price}` });
  }
  const fear: Partial<Record<ListingAngle, string>> = {
    price_reduction: `Price just dropped on this ${city} home`,
    open_house: `Skip this ${city} open house and regret it`,
    sold: facts.daysOnMarket != null ? `This ${city} home sold in ${facts.daysOnMarket} days` : undefined,
  };
  if (fear[angle]) shots.push({ archetype: 'fear_inaction', text: fear[angle]! });
  return shots;
}
