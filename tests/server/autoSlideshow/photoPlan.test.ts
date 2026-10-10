import { describe, expect, it, vi } from 'vitest';
import type { AutoSlide } from '../../../src/types/admin/autoSlideshow';
import type { BrandProfile } from '../../../src/types/admin/companyIntel';
import type { BrandPhotoFacts } from '../../../src/server/brandContent/productPhotos';

vi.mock('../../../src/server/metaAds/llm', () => ({ metaAdsJson: vi.fn() }));
vi.mock('../../../src/server/storage/objectStore', () => ({ getObject: vi.fn() }));
vi.mock('../../../src/lib/db', () => ({ prisma: {} }));

const slide = (role: AutoSlide['role'], title: string): Omit<AutoSlide, 'imageKey'> => ({ role, title, body: '', photoIndex: 0, photoPrompt: `Idea for ${title}` });
const slides = [slide('hook', 'Hook'), slide('item', 'Tip one'), slide('item', 'Tip two'), slide('cta', 'Shop now')];
const profile = { brandName: 'EQL', valueProp: 'Activewear', audience: 'Women' } as BrandProfile;
const cast = { id: 'cast1', name: 'Maya, 28', look: '28 years old. Curly dark hair.', imageKey: 'brand-cast/ws/cast1.jpg' };
const photo = (id: string, over: Partial<BrandPhotoFacts> = {}): BrandPhotoFacts => ({
  id, r2Key: `user-uploads/ws/${id}.jpg`, description: `Photo ${id}`, photoType: 'product_on_person', productName: `set ${id}`,
  looksLikeAd: true, usableAsBackground: false, usableAsReference: true, ...over,
});

const reply = (products: string[]) => ({
  setting: 'a sunny city park', wardrobe: 'red leggings and sports bra',
  ...Object.fromEntries(slides.flatMap((_, i) => [
    [`slide_${i + 1}_scene`, `Medium shot: the main person stretching, scene ${i + 1}.`],
    [`slide_${i + 1}_person`, 'main'],
    [`slide_${i + 1}_product`, products[i] ?? 'none'],
  ])),
});

describe('slidesFromReply', () => {
  it('puts the cast member on the slides with her anchor as image 1 and the clothes in the prompt', async () => {
    const { slidesFromReply } = await import('../../../src/server/autoSlideshow/photoPlan');
    const out = slidesFromReply(reply([]), { slides, goal: 'teach', profile, bible: null, cast, photos: [] });
    expect(out[1]!.photoRefs).toEqual([cast.imageKey]);
    expect(out[1]!.castId).toBe('cast1');
    expect(out[1]!.photoPrompt).toContain('Curly dark hair');
    expect(out[1]!.photoPrompt).toContain('Wearing red leggings');
    expect(out[1]!.photoRefNote).toMatch(/^Image 1 is the main person/);
    expect(out[1]!.title).toBe('Tip one');
  });

  it('keeps the product off teaching slides and allows it on the CTA, as image 2 after the person', async () => {
    const { slidesFromReply } = await import('../../../src/server/autoSlideshow/photoPlan');
    const out = slidesFromReply(reply(['P1', 'P1', 'P1', 'P1']), { slides, goal: 'teach', profile, bible: null, cast, photos: [photo('a')] });
    expect(out.slice(0, 3).map((s) => s.photoRefs)).toEqual([[cast.imageKey], [cast.imageKey], [cast.imageKey]]);
    expect(out[3]!.photoRefs).toEqual([cast.imageKey, 'user-uploads/ws/a.jpg']);
    expect(out[3]!.photoRefNote).toContain('Image 2 is the brand\'s product (set a)');
  });

  it('uses a real-looking brand photo as it is on a product slide without the main person, at most 2 product slides', async () => {
    const { slidesFromReply } = await import('../../../src/server/autoSlideshow/photoPlan');
    const raw = { ...reply(['P1', 'P1', 'P1', 'P1']), slide_2_person: 'none' };
    const real = photo('b', { looksLikeAd: false, usableAsBackground: true });
    const out = slidesFromReply(raw, { slides, goal: 'product', profile, bible: null, cast, photos: [real] });
    expect(out[0]!.brandPhotoKey).toBeUndefined();
    expect(out[1]!.brandPhotoKey).toBe('user-uploads/ws/b.jpg');
    expect(out.filter((s) => s.brandPhotoKey || s.photoRefs?.includes('user-uploads/ws/b.jpg'))).toHaveLength(2);
  });

  it('without a cast, "main" is just someone in the scene: no reference, no cast id', async () => {
    const { slidesFromReply } = await import('../../../src/server/autoSlideshow/photoPlan');
    const out = slidesFromReply(reply([]), { slides, goal: 'story', profile, bible: null, cast: null, photos: [] });
    expect(out.every((s) => !s.photoRefs && !s.castId)).toBe(true);
    expect(out[0]!.photoPrompt).toBe('Medium shot: the main person stretching, scene 1.');
  });

  it('keeps the bank photo idea of a slide the reply skipped', async () => {
    const { slidesFromReply } = await import('../../../src/server/autoSlideshow/photoPlan');
    const raw = { ...reply([]), slide_3_scene: '' };
    const out = slidesFromReply(raw, { slides, goal: 'teach', profile, bible: null, cast, photos: [] });
    expect(out[2]).toEqual(slides[2]);
  });
});
