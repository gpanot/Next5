/**
 * "B2B No Website": hand-typed profile → website engine brief, and product photos → shots.
 * Embeddings are mocked; no DB, no OpenAI.
 */
import { describe, expect, it, vi } from 'vitest';

const { mockEmbed } = vi.hoisted(() => ({ mockEmbed: vi.fn() }));
vi.mock('../../../src/server/ai/embeddings', () => ({ embedQueries: mockEmbed, toVectorLiteral: String }));

import { missingManualFields, manualInputFromProfile, normalizeManualInput, type ProductPhoto } from '../../../src/lib/manualProfile';
import { buildManualProfileData } from '../../../src/server/studio/manualProfile';
import { websiteEngine } from '../../../src/server/slideshow/engines/website/engine';
import { buildWebsiteMeatPrompt } from '../../../src/server/slideshow/engines/website/prompts';
import { planProductShots } from '../../../src/server/slideshow/engines/website/productMedia';

const INPUT = normalizeManualInput({
  businessName: ' Rosa’s Bakery ',
  promoting: 'Custom birthday cakes',
  offer: 'A custom cake ready in 48 hours',
  positioning: 'Real butter, no box mixes',
  description: 'Family bakery since 2012.',
  geography: 'Austin, TX',
  howToBuy: 'Call or text to order',
  audienceDescription: 'Busy parents planning a party',
  customerGroups: ['Busy parents', '', 'Office managers', 'Wedding planners', 'Teachers'],
  tone: 'witty',
  proofPoints: ['4.9 stars from 212 reviews'],
});

const photo = (id: string, description: string, bestFor: ProductPhoto['bestFor']): ProductPhoto =>
  ({ assetId: id, r2Key: `blitz/uploads/${id}.jpg`, description, bestFor });

describe('manual profile', () => {
  it('trims, drops empty list items and caps customer groups at 3', () => {
    expect(INPUT.businessName).toBe('Rosa’s Bakery');
    expect(INPUT.customerGroups).toEqual(['Busy parents', 'Office managers', 'Wedding planners']);
    expect(missingManualFields(INPUT)).toEqual([]);
  });

  it('lists every empty required field', () => {
    const missing = missingManualFields(normalizeManualInput({ businessName: 'X' }));
    expect(missing).toContain('What they sell');
    expect(missing).toContain('Customer groups');
    expect(missing).toContain('How customers buy');
    expect(missing).not.toContain('Slogan');
    expect(missing).not.toContain('Real proof');
  });

  it('round-trips through the stored profile', () => {
    const data = buildManualProfileData(INPUT, []);
    expect(manualInputFromProfile(data)).toEqual(INPUT);
  });

  it('feeds the website engine: one brief per group, photos and how-to-buy in the prompt', () => {
    const products = [photo('a', 'Three-tier white cake with fresh strawberries', ['proof'])];
    const source = { profile: buildManualProfileData(INPUT, products), sourceUrl: 'manual://rosa', workspaceId: null };
    const briefs = websiteEngine.briefs(source);
    expect(briefs.map((b) => b.idc)).toEqual(['Busy parents', 'Office managers', 'Wedding planners']);
    expect(briefs[0]!.tone).toBe('witty');
    const prompt = buildWebsiteMeatPrompt(briefs[0]!);
    expect(prompt).toContain('Three-tier white cake with fresh strawberries');
    expect(prompt).toContain('How customers buy: Call or text to order');
    // Typed proof is its own evidence, so its numbers pass the guard.
    expect(websiteEngine.hookRules(briefs[0]!).guard?.('4.9 stars from 212 reviews')).toBeNull();
  });
});

describe('planProductShots', () => {
  const story = { pain: 'p', oldWay: 'o', mechanism: 'We bake it fresh', proof: 'Kids love it', inaction: 'i', cta: 'Text us' };

  it('gives each product shot a different photo, best match first', async () => {
    // Lines: mechanism, proof, cta; then photos a, b, c.
    mockEmbed.mockResolvedValueOnce([[1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 1, 0], [1, 0, 0], [0, 0, 1]]);
    const photos = [photo('a', 'kid with cake', ['proof']), photo('b', 'baker mixing', ['mechanism']), photo('c', 'storefront', ['cta', 'hook'])];
    const plan = await planProductShots(story, photos);
    expect(plan.shots.mechanism?.[0]?.assetId).toBe('b');
    expect(plan.shots.proof?.[0]?.assetId).toBe('a');
    expect(plan.shots.cta?.[0]?.assetId).toBe('c');
    expect(plan.hero?.assetId).toBe('c');
  });

  it('leaves shots without a photo when there are fewer photos than shots', async () => {
    mockEmbed.mockResolvedValueOnce([null, null, null, null]);
    const plan = await planProductShots(story, [photo('a', 'cake', ['proof'])]);
    expect(plan.shots.mechanism?.[0]?.assetId).toBe('a');
    expect(plan.shots.proof).toBeUndefined();
    expect(plan.shots.cta).toBeUndefined();
  });

  it('returns an empty plan with no photos', async () => {
    expect(await planProductShots(story, [])).toEqual({ shots: {}, hero: null });
  });
});
