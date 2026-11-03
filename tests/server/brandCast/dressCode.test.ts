import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/server/shorts/llm', () => ({ creativeJson: vi.fn() }));

const { dressCodeOf, personNote } = await import('../../../src/server/brandCast/dressCode');
const { ageOf, anchorPrompt } = await import('../../../src/server/brandCast/personas');
const { slidesFromReply } = await import('../../../src/server/autoSlideshow/photoPlan');

const STAFF_LOOK = '34 years old. Woman with warm brown skin and a short dark bob. Dress code: navy polo with a white chest logo, khaki trousers.';
const PLAIN_LOOK = '28 years old. Woman with long red hair. Outfit: white tank top, black leggings.';

describe('dress code in a cast member look', () => {
  it('reads the clothes from the look', () => {
    expect(dressCodeOf(STAFF_LOOK)).toBe('navy polo with a white chest logo, khaki trousers');
    expect(dressCodeOf(PLAIN_LOOK)).toBeNull();
  });

  it('keeps the clothes in the reference note only for a dress code', () => {
    expect(personNote(STAFF_LOOK)).toContain('SAME clothes');
    expect(personNote(PLAIN_LOOK)).toContain('change the pose, place and clothes');
  });

  it('asks the anchor photo to keep the clothes and their logos', () => {
    const prompt = anchorPrompt({ name: 'Thanh', look: STAFF_LOOK }, { person: true, outfit: null });
    expect(prompt).toContain('exactly the same clothes');
    expect(prompt).toContain('except what is on the clothes');
  });

  it('leaves the Auto anchor prompt as it was', () => {
    const prompt = anchorPrompt({ name: 'Maya, 28', look: PLAIN_LOOK }, { person: true, outfit: null });
    expect(prompt).toContain('keep the same face, hair, skin tone and build.');
    expect(prompt).toContain('No text, no logos, no other people.');
  });
});

describe('ageOf', () => {
  it('reads the name first, then the look', () => {
    expect(ageOf({ name: 'Maya, 28', look: '40 years old. Woman.' })).toBe(28);
    expect(ageOf({ name: 'Thanh', look: STAFF_LOOK })).toBe(34);
    expect(ageOf({ name: 'Thanh', look: 'Woman with short hair.' })).toBeNull();
  });
});

describe('slideshow photos of a member with a dress code', () => {
  const slides = [{ role: 'hook', title: 'Hi', body: '' }];
  const input = (look: string) => ({
    slides,
    goal: 'teach',
    profile: { brandName: 'B', valueProp: 'V', audience: 'A' },
    bible: null,
    cast: { id: 'c1', name: 'Thanh', look, imageKey: 'k' },
    photos: [],
  }) as unknown as Parameters<typeof slidesFromReply>[1];
  const reply = { setting: 'office', wardrobe: 'red hoodie', slide_1_scene: 'The main person at a desk.', slide_1_person: 'main', slide_1_product: 'none' };

  it('wears the dress code instead of the planned clothes', () => {
    const [slide] = slidesFromReply(reply, input(STAFF_LOOK));
    expect(slide!.photoPrompt).toContain('Wearing navy polo with a white chest logo, khaki trousers.');
    expect(slide!.photoPrompt).not.toContain('red hoodie');
    expect(slide!.photoRefNote).toContain('SAME clothes');
  });

  it('still wears the planned clothes without one', () => {
    const [slide] = slidesFromReply(reply, input(PLAIN_LOOK));
    expect(slide!.photoPrompt).toContain('Wearing red hoodie.');
    expect(slide!.photoPrompt).not.toContain('white tank top');
    expect(slide!.photoRefNote).toContain('change the pose, place and clothes');
  });
});
