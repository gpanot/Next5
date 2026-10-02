import { describe, expect, it, vi } from 'vitest';
import type { AutoPhoto, AutoSlide } from '../../../src/types/admin/autoSlideshow';
import type { SlideshowBankContent } from '../../../src/types/admin/slideshowBank';

vi.mock('../../../src/server/metaAds/llm', () => ({ metaAdsJson: vi.fn() }));
vi.mock('../../../src/server/storage/objectStore', () => ({ getObject: vi.fn() }));
vi.mock('../../../src/lib/db', () => ({ prisma: {} }));

const item = (title: string) => ({ title, body: `${title} body.`, photo: `A golfer doing ${title} on a sunny range.` });
const hook = (id: string, meatId: string, score: number) => ({ id, meatId, patternId: 'hook_36', category: 'bold_statement', text: `Hook ${id}`, photo: 'A golfer walking to the tee.', score });

const bank: SlideshowBankContent = {
  meats: [
    { id: 'm1', goal: 'teach', topic: 'Range time', promise: 'p', listicle: true, items: [item('A'), item('B'), item('C')], caption: 'c1', hashtags: ['golf'] },
    { id: 'm2', goal: 'myth', topic: 'Slice myths', promise: 'p', listicle: false, items: [item('D'), item('E'), item('F'), item('G')], caption: 'c2', hashtags: ['golf'] },
    { id: 'm3', goal: 'teach', topic: 'No hooks', promise: 'p', listicle: true, items: [item('H'), item('I'), item('J')], caption: 'c3', hashtags: [] },
  ],
  hooks: [hook('m1h1', 'm1', 12), hook('m1h2', 'm1', 14), hook('m2h1', 'm2', 13)],
  ctas: [
    { id: 'c1', angle: 'direct offer', title: 'Book now', body: 'b', photo: 'A happy golfer.' },
    { id: 'c2', angle: 'easy first step', title: 'Try free', body: 'b', photo: 'A happy golfer.' },
  ],
};

describe('pickCombos', () => {
  it('spreads picks over meats, hooks (best score first) and CTAs, and skips meats without hooks', async () => {
    const { pickCombos, emptyUsage } = await import('../../../src/server/autoSlideshow/bank/pick');
    const combos = pickCombos(bank, emptyUsage(), ['teach', 'teach', 'myth', 'teach']);
    expect(combos.map((c) => c.meatId)).toEqual(['m1', 'm1', 'm2', 'm1']);
    expect(combos.map((c) => c.hookId)).toEqual(['m1h2', 'm1h1', 'm2h1', 'm1h2']);
    expect(combos.map((c) => c.ctaId)).toEqual(['c1', 'c2', 'c1', 'c2']);
  });

  it('falls back to any meat when the bank has none for the goal, and starts from past usage', async () => {
    const { pickCombos, emptyUsage } = await import('../../../src/server/autoSlideshow/bank/pick');
    const usage = emptyUsage();
    usage.meats.set('m1', 5);
    usage.hooks.set('m2h1', 1);
    expect(pickCombos(bank, usage, ['product'])).toEqual([{ meatId: 'm2', hookId: 'm2h1', ctaId: 'c1' }]);
  });
});

describe('hook categories', () => {
  it('opens a batch with different hook categories before reusing one', async () => {
    const { pickCombos, emptyUsage } = await import('../../../src/server/autoSlideshow/bank/pick');
    const meat = bank.meats[0]!;
    const hooks = [
      { ...hook('a', 'm1', 15), category: 'bold_statement' },
      { ...hook('b', 'm1', 14), category: 'bold_statement' },
      { ...hook('c', 'm1', 11), category: 'relatable' },
    ];
    const combos = pickCombos({ ...bank, meats: [meat], hooks }, emptyUsage(), ['teach', 'teach', 'teach']);
    expect(combos.map((c) => c.hookId)).toEqual(['a', 'c', 'b']);
  });
});

describe('swapCombo', () => {
  it('gives another hook of the same meat and another CTA', async () => {
    const { swapCombo, emptyUsage } = await import('../../../src/server/autoSlideshow/bank/pick');
    expect(swapCombo(bank, emptyUsage(), { meatId: 'm1', hookId: 'm1h2', ctaId: 'c1' })).toEqual({ meatId: 'm1', hookId: 'm1h1', ctaId: 'c2' });
    expect(swapCombo(bank, emptyUsage(), { meatId: 'm2', hookId: 'm2h1', ctaId: 'c2' }).hookId).toBe('m2h1');
  });
});

describe('assembleCombo', () => {
  it('builds hook, meat and CTA slides, each with its own photo description', async () => {
    const { assembleCombo } = await import('../../../src/server/autoSlideshow/bank/pick');
    const show = assembleCombo(bank, { meatId: 'm1', hookId: 'm1h1', ctaId: 'c2' });
    expect(show.slides.map((s) => s.role)).toEqual(['hook', 'item', 'item', 'item', 'cta']);
    expect(show.slides.every((s) => s.photoPrompt)).toBe(true);
    expect(show.slides[0]!.title).toBe('Hook m1h1');
    expect(show.slides[4]!.title).toBe('Try free');
    expect(show.caption).toBe('c1');
  });
});

describe('hook checks', () => {
  const listMeat = { goal: 'teach' as const, listicle: true, items: [item('A'), item('B'), item('C')] };
  const storyMeat = { ...listMeat, goal: 'story' as const, listicle: false };

  it('reads the pattern id however the model wrote it', async () => {
    const { toPatternId } = await import('../../../src/server/autoSlideshow/bank/library');
    expect(['hook_36', 'hook36', '36'].map(toPatternId)).toEqual(['hook_36', 'hook_36', 'hook_36']);
  });

  it('allows a number only on a list meat, and only its slide count', async () => {
    const { hookProblems } = await import('../../../src/server/autoSlideshow/bank/checks');
    // hook_111: "[X] ways to [achieve goal] (without [common method]):"
    const draft = (text: string) => ({ patternId: 'hook_111', text, photo: 'A golfer on a sunny range.' });
    expect(hookProblems(draft('3 ways to practice smarter (without long sessions):'), listMeat, 'Scratch')).toEqual([]);
    expect(hookProblems(draft('5 ways to practice smarter (without long sessions):'), listMeat, 'Scratch')).toContain('number 5 but 3 slides');
    expect(hookProblems(draft('3 ways to practice smarter (without long sessions):'), storyMeat, 'Scratch')).toContain('a number on a meat that is not a list');
  });

  it('flags a hook naming the business or with a screen in its photo', async () => {
    const { hookProblems } = await import('../../../src/server/autoSlideshow/bank/checks');
    const problems = hookProblems({ patternId: 'hook_36', text: 'Stop booking without Scratch. Here\'s why:', photo: 'A manager looking at a laptop screen.' }, listMeat, 'Scratch');
    expect(problems).toContain('names the business or a price');
    expect(problems.some((p) => p.startsWith('photo shows'))).toBe(true);
  });

  it('accepts a phone in hand and ignores what the photo says is absent', async () => {
    const { photoProblem } = await import('../../../src/server/autoSlideshow/bank/checks');
    expect(photoProblem('A mechanic holding a phone beside his van, no text or logos.')).toBeNull();
    expect(photoProblem('A calendar on a desk.')).toBe('photo shows "calendar"');
  });
});

describe('keepBest', () => {
  it('keeps passing, well-scored hooks, one per pattern, best first', async () => {
    const { keepBest } = await import('../../../src/server/autoSlideshow/bank/hooks');
    const d = (patternId: string, score: number, minAxis = 4, problems: string[] = []) => ({ patternId, text: patternId, photo: '', problems, score, minAxis });
    const kept = keepBest([d('a', 12), d('b', 14), d('a', 13), d('c', 15, 2), d('d', 15, 4, ['too long']), d('e', 10)]);
    expect(kept.map((h) => `${h.patternId}${h.score}`)).toEqual(['b14', 'a13']);
  });
});

describe('slide photos', () => {
  const slide = (photoPrompt?: string, photoIndex = 0): AutoSlide => ({ role: 'item', title: 't', body: '', photoIndex, imageKey: null, ...(photoPrompt ? { photoPrompt } : {}) });
  const photo = (prompt: string, imageKey: string | null, extra: Partial<AutoPhoto> = {}): AutoPhoto => ({ prompt, imageKey, error: null, ...extra });

  it('gives two slideshows on the same meat their own photos', async () => {
    const { ownPhotoEntries } = await import('../../../src/server/autoSlideshow/slidePhotos');
    const shows = [{ id: 's1', slides: [slide('p1'), slide('p2')], bank: true }, { id: 's2', slides: [slide('p1'), slide('p2')], bank: true }];
    const entries = ownPhotoEntries(0, [], shows);
    expect(entries.map((e) => e.owner)).toEqual(['s1:0', 's1:1', 's2:0', 's2:1']);
    expect(ownPhotoEntries(0, entries.map((e) => photo(e.prompt, 'k', e)), shows)).toHaveLength(4);
  });

  it('points slides at their made photos and fills a failed one from the slideshow', async () => {
    const { withOwnPhotos } = await import('../../../src/server/autoSlideshow/slidePhotos');
    const { slidePhotoIndexes } = await import('../../../src/server/autoSlideshow/render');
    const photos = [photo('p1', 'k0', { kind: 'slide', owner: 's1:0' }), photo('p2', null, { kind: 'slide', owner: 's1:1', error: 'failed' })];
    const slides = withOwnPhotos({ id: 's1', slides: [slide('p1', 9), slide('p2', 9)], bank: true }, photos);
    expect(slides.map((s) => s.photoIndex)).toEqual([0, 9]);
    expect(slidePhotoIndexes(slides, 0, photos)).toEqual([0, 0]);
  });

  it('keeps older runs on the shared pool, with the hook on its own photo', async () => {
    const { slidePhotoIndexes } = await import('../../../src/server/autoSlideshow/render');
    const photos = [photo('a', 'k0'), photo('b', 'k1'), photo('c', 'k2'), photo('h', 'k3', { kind: 'hook' })];
    expect(slidePhotoIndexes([slide('h', 3), slide(), slide()], 0, photos)).toEqual([3, 1, 2]);
  });
});
