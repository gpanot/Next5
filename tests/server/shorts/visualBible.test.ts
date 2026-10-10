import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShortBeat, ShortInputs } from '../../../src/types/admin/shorts';

const creativeJson = vi.fn();
vi.mock('../../../src/server/shorts/llm', () => ({ smartModel: () => 'gpt-6.1-sol', creativeJson: (...args: unknown[]) => creativeJson(...args) }));

const { toVisualBible } = await import('../../../src/server/shorts/visualBible');
const { anchorPrompt, biblePhotoPrompt, planStoryboard } = await import('../../../src/server/shorts/storyboard');
const { checkPhoto } = await import('../../../src/server/shorts/photoQa');

const meter = { add: vi.fn(), summary: vi.fn() } as never;

const rawBible = {
  business_category: 'luxury performance cars',
  hero_product: 'a black Porsche 911 Carrera coupe',
  primary_subject: 'the car itself',
  person_age_range: '30-55',
  person_look: 'composed, affluent drivers with clean grooming',
  wardrobe: 'tailored neutral jackets',
  environments: ['modern showroom', 'golden sunset coastal road pull-off'],
  visual_style: 'Polished luxury automotive photography, moody cinematic dusk light, crisp reflections.',
  product_visibility: 'the car is always the hero',
  shot_vocabulary: 'wheel close-up | cockpit detail',
  consistency_rules: 'same car, same driver',
  avoid: 'cluttered streets',
  design_story: 'Engineered restraint.',
};

const beat = (idx: number, role: ShortBeat['role'], text: string): ShortBeat => ({ idx, role, text, startS: idx * 3, spanS: 3 });
const inputs = { brandName: 'Porsche', audience: 'luxury car buyers' } as ShortInputs;

beforeEach(() => {
  creativeJson.mockReset();
});

describe('toVisualBible', () => {
  it('keeps every field as text, joins lists, and strips light words from style and places', () => {
    const bible = toVisualBible(rawBible, ['https://x.com/a.jpg']);
    expect(bible?.environments).toBe('modern showroom, coastal road pull-off');
    expect(bible?.visual_style).not.toMatch(/moody|cinematic|dusk/i);
    expect(bible?.hero_product).toBe('a black Porsche 911 Carrera coupe');
    expect(bible?.source).toBe('auto');
    expect(bible?.images).toEqual(['https://x.com/a.jpg']);
  });

  it('refuses a bible without a hero product or a people look', () => {
    expect(toVisualBible({ ...rawBible, hero_product: '' }, [])).toBeNull();
    expect(toVisualBible({ ...rawBible, person_look: ' ' }, [])).toBeNull();
  });
});

describe('storyboard', () => {
  it('reads flat keys per beat, leaves out beats the model skipped, and strips light words from settings', async () => {
    creativeJson.mockResolvedValue({
      beat_0_shot: 'front three-quarter hero view',
      beat_0_setting: 'golden daylight urban street',
      beat_0_person: 'woman in her 30s, dark bob, beige suit',
      beat_0_product: 'the whole car',
    });
    const bible = toVisualBible(rawBible, [])!;
    const boards = await planStoryboard([beat(0, 'hook', 'Turn a drive into a decision.'), beat(1, 'payoff', 'Plan it.')], bible, inputs, meter);
    expect(boards[0]).toEqual({ shot: 'front three-quarter hero view', setting: 'daylight urban street', person: 'woman in her 30s, dark bob, beige suit', product: 'the whole car' });
    expect(boards[1]).toBeNull();
  });

  it('gives no storyboard rows when the call fails (the shot plans then decide alone)', async () => {
    creativeJson.mockRejectedValue(new Error('down'));
    const boards = await planStoryboard([beat(0, 'hook', 'x')], toVisualBible(rawBible, [])!, inputs, meter);
    expect(boards).toEqual([null]);
  });
});

describe('anchor and photo prompts', () => {
  const bible = toVisualBible(rawBible, [])!;
  const board = { shot: 'medium', setting: 'showroom', person: 'woman in her 30s, dark bob, beige suit', product: 'the car' };

  it('names the hero product and the main character in the anchor (an unnamed car came out a Mercedes)', () => {
    const prompt = anchorPrompt(bible, [{ ...beat(0, 'hook', 'x'), board: { ...board, person: 'no person' } }, { ...beat(1, 'mechanism', 'y'), board }]);
    expect(prompt).toContain('a black Porsche 911 Carrera coupe');
    expect(prompt).toContain('woman in her 30s, dark bob, beige suit');
    expect(prompt).toContain('whole car visible');
  });

  it('adds the reference note only when a reference image goes along', () => {
    const b = { ...beat(1, 'mechanism', 'Test the brakes.'), imagePrompt: 'Cockpit close-up of hands on the wheel.' };
    expect(biblePhotoPrompt(b, bible, true)).toContain('SAME person');
    expect(biblePhotoPrompt(b, bible, false)).not.toContain('Reference image');
    expect(biblePhotoPrompt(b, bible, false)).toContain('Photographic style: ');
  });
});

describe('photo check', () => {
  it('passes the photo when the check cannot run', async () => {
    creativeJson.mockRejectedValue(new Error('down'));
    const sharp = (await import('sharp')).default;
    const photo = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#888' } }).jpeg().toBuffer();
    expect(await checkPhoto(photo, beat(0, 'hook', 'x'), 'p', null, meter)).toEqual({ ok: true, problem: '', fix: '' });
  });

  it('reads a rejection with its fix', async () => {
    creativeJson.mockResolvedValue({ ok: false, problem: 'legs missing', fix: 'Show her full body.' });
    const sharp = (await import('sharp')).default;
    const photo = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#888' } }).jpeg().toBuffer();
    expect(await checkPhoto(photo, beat(1, 'mechanism', 'x'), 'p', 'https://r2/anchor.jpg', meter)).toEqual({ ok: false, problem: 'legs missing', fix: 'Show her full body.' });
  });
});
