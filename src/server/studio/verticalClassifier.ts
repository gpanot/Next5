/**
 * Campaign Studio — vertical classification.
 *
 * Asked inside the big profile prompt, gpt-4o-mini kept labelling the vendor by its customers
 * (booking software for mechanics → "automotive") or a product brand by its product (acne
 * skincare brand → "beauty_spa"). A small dedicated call at temperature 0, given only what the
 * business sells and how, is far more stable. ~$0.0001 per profile.
 */
// server-only
import { chatJson } from '../ai/openai';
import { KNOWN_VERTICALS } from './verticalPacks';

export type VerticalInput = {
  businessName: string;
  promoting: string;
  description: string;
  businessModel: string;
};

const SYSTEM = `Classify what kind of business THIS is — the business itself, never its customers.
Options: ${KNOWN_VERTICALS.join(', ')}, generic.
- saas: sells software or an app, whoever its customers are (booking software for mechanics is saas).
- ecommerce: sells physical products online as a brand (skincare, supplements, apparel, gadgets).
- beauty_spa: a place people visit for treatments (day spa, salon, massage, nails).
- health_wellness: a clinic or practitioner (chiropractor, dentist, physical therapy, med spa).
- automotive: repairs or services vehicles (auto repair, detailing, tires).
- home_services: works on homes (HVAC, plumbing, roofing, cleaning, remodeling).
- real_estate: agents, teams, brokerages.
- restaurant: restaurants, cafes, diners, bars, food trucks.
- generic: nothing above fits.
Return JSON only: { "vertical": "..." }`;

/** Returns a known vertical, or null when the call fails (caller keeps its fallback). */
export async function classifyVertical(input: VerticalInput): Promise<string | null> {
  const result = await chatJson<{ vertical?: string }>(
    [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `Business: ${input.businessName}\nWhat they sell: ${input.promoting}\nDescription: ${input.description}\nBusiness model: ${input.businessModel}`,
      },
    ],
    { maxTokens: 20, temperature: 0, model: 'gpt-4o-mini' },
  );
  const v = result?.vertical?.trim().toLowerCase();
  if (!v) return null;
  return v === 'generic' || KNOWN_VERTICALS.includes(v) ? v : null;
}
