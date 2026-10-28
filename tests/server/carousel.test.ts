import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCarouselHooksSystem, buildCarouselRefineSystem, buildCarouselSystem, buildCarouselUser } from '../../src/server/scriptGenerator/carouselPrompts';
import { generateCarousel, normalizeCarousel, parseCarouselInput } from '../../src/server/scriptGenerator/carouselService';
import type { CarouselInput } from '../../src/types/admin/carousel';

const answers = { field: 'Hair salon owner in Austin', audience: 'New salon owners with empty chairs', topic: 'Signs your salon is ready to hire', start: '2019: renting a chair', pursuit: 'Posted every day', now: 'Own salon, 4 stylists', result: 'Booked out', work: '6 am every day' };

const slides = (n: number, split = false) =>
  Array.from({ length: n }, (_, i) => ({ label: `S${i}`, text: `line ${i} — here`, photo: 'p', bottomText: split ? 'b' : '', bottomPhoto: split ? 'bp' : '' }));

/** Mocks the Anthropic Messages API: answers with `input` as the tool call and records the system prompts. */
function mockModel(input: unknown) {
  const systems: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: { body: string }) => {
    systems.push((JSON.parse(init.body) as { system: string }).system);
    const json = JSON.stringify(input);
    const events = [
      { type: 'content_block_start', content_block: { type: 'tool_use' } },
      { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: json } },
      { type: 'message_delta', delta: { stop_reason: 'tool_use' } },
    ];
    return new Response(events.map((e) => `event: x\ndata: ${JSON.stringify(e)}\n\n`).join(''), { status: 200 });
  }));
  return systems;
}

beforeEach(() => vi.stubEnv('ANTHROPIC_API_KEY', 'test-key'));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('carousel input', () => {
  it('asks only the template questions and needs the required ones', () => {
    const story = parseCarouselInput({ template: 'story_6', answers: { field: 'Salon owner', audience: 'ignored' } });
    expect(story.answers).toEqual({ field: 'Salon owner' });
    expect(() => parseCarouselInput({ template: 'story_3p', answers: { field: 'x', audience: 'y' } })).toThrow(/Where did you start/);
    expect(() => parseCarouselInput({ template: 'nope', answers })).toThrow();
  });

  it('keeps a list length from the offered ones, and her or him only on To be her', () => {
    expect(parseCarouselInput({ template: 'list_signs', answers, listCount: 14 }).listCount).toBe(14);
    expect(parseCarouselInput({ template: 'list_signs', answers, listCount: 99 }).listCount).toBe(10);
    expect(parseCarouselInput({ template: 'split_to_be_her', answers, pronoun: 'him' }).pronoun).toBe('him');
    expect(parseCarouselInput({ template: 'split_then_now', answers, pronoun: 'him' }).pronoun).toBeUndefined();
  });

  it('drops a hook on a template whose slide 1 is fixed', () => {
    expect(parseCarouselInput({ template: 'story_6', answers, hook: { text: 'x', photo: 'y' } }).hook).toBeUndefined();
  });
});

describe('carousel prompts', () => {
  const input = (template: CarouselInput['template'], extra: Partial<CarouselInput> = {}): CarouselInput => ({ template, answers, ...extra });

  it('carry the craft rules and the slide plan', () => {
    const story = buildCarouselSystem(input('story_3p'));
    expect(story).toContain('about the viewer and their problem');
    expect(story).toContain('builds to a crescendo');
    expect(story).toContain('Write exactly 19 slides');
    expect(story).toContain('Slides 15 to 19');
    expect(buildCarouselSystem(input('list_signs', { listCount: 14 }))).toContain('Write exactly 16 slides');
    expect(buildCarouselHooksSystem(input('list_signs', { listCount: 7 }))).toContain("'7 signs you");
    expect(buildCarouselSystem(input('story_6'))).toContain("Text: 'dear younger me'");
    expect(buildCarouselSystem(input('split_to_be_her', { pronoun: 'him' }))).toContain('I had to be him');
  });

  it('send only the template answers as data, and have no em dashes', () => {
    expect(buildCarouselUser(input('story_6'))).toContain('<field');
    expect(buildCarouselUser(input('story_6'))).not.toContain('<audience');
    for (const t of ['story_3p', 'story_6', 'list_mistakes', 'split_then_now'] as const) {
      for (const p of [buildCarouselSystem(input(t)), buildCarouselHooksSystem(input(t)), buildCarouselRefineSystem(input(t))]) expect(p).not.toContain('—');
    }
  });
});

describe('carousel output', () => {
  it('needs the exact slide count, strips em dashes, and keeps halves only on split screens', async () => {
    const input = parseCarouselInput({ template: 'story_6', answers });
    mockModel({ title: 'T', slides: slides(6), song: 's', caption: 'c', bioCta: 'b' });
    const out = await generateCarousel(input, 'claude');
    expect(out.slides).toHaveLength(6);
    expect(out.slides[0]).toEqual({ label: 'S0', text: 'line 0, here', photo: 'p' });
    const split = normalizeCarousel({ title: 'T', slides: slides(6, true) }, parseCarouselInput({ template: 'split_then_now', answers }));
    expect(split.slides[0].bottomText).toBe('b');
  });

  it('retries once on a wrong slide count, then gives up', async () => {
    const input = parseCarouselInput({ template: 'story_6', answers });
    const systems = mockModel({ title: 'T', slides: slides(5) });
    await expect(generateCarousel(input, 'claude')).rejects.toThrow(/shape we cannot use/);
    expect(systems).toHaveLength(2);
  });
});
