import { describe, expect, it } from 'vitest';
import { cardScore, learnFrom, scoreOf } from '../../../src/server/labs/blitzLearning';
import { pickScripts, type BlitzBankContent } from '../../../src/server/labs/blitzBank';

const row = (story: string, format: string, archetype: string, status: string, views: number | null = null) =>
  ({ story_id: story, format, archetype, status, views });

describe('blitz learning', () => {
  it('scores swipes, and views against the median once 3 videos have numbers', () => {
    expect(cardScore('kept', null, null)).toBe(1);
    expect(cardScore('discarded', null, null)).toBe(-1);
    expect(cardScore('made', 4000, 1000)).toBe(1 + 1.5 * 2);
    expect(cardScore('made', 250, 1000)).toBe(1 - 1.5 * 2);
  });

  it('adds up per format and hook type, smoothed, and finds winners', () => {
    const l = learnFrom([
      row('s1', 'myth_truth', 'contrarian', 'made', 5000),
      row('s2', 'problem_fix', 'call_out', 'made', 1000),
      row('s3', 'problem_fix', 'call_out', 'made', 800),
      row('s4', 'how_to', 'curiosity', 'discarded'),
      row('s5', 'how_to', 'curiosity', 'proposed'),
    ]);
    expect(l.medianViews).toBe(1000);
    expect(l.posted).toBe(3);
    expect(l.kept).toBe(3);
    expect(l.skipped).toBe(1);
    expect(scoreOf(l.format, 'myth_truth')).toBeGreaterThan(scoreOf(l.format, 'problem_fix'));
    expect(scoreOf(l.format, 'how_to')).toBeLessThan(0);
    expect(l.format.get('how_to')!.cards).toBe(1);
    expect(l.winners.map((w) => w.storyId)).toEqual(['s1']);
  });

  it('ignores views until there are enough to compare', () => {
    const l = learnFrom([row('s1', 'myth_truth', 'contrarian', 'made', 5000)]);
    expect(l.medianViews).toBeNull();
    expect(l.winners).toEqual([]);
    expect(scoreOf(l.format, 'myth_truth')).toBeCloseTo(1 / 3);
  });

  it('leads with the best-scoring hook type and the best-scoring format', () => {
    const hooks = [{ archetype: 'call_out' as const, text: 'Moms, look' }, { archetype: 'curiosity' as const, text: 'Why this works' }];
    const story = (id: string, format: 'problem_fix' | 'mistake') => ({ id, story: { pain: `pain ${id}`, oldWay: 'o', mechanism: 'm', proof: 'p', inaction: 'i', cta: 'c' }, hooks, stage: 'attention' as const, format });
    const content: BlitzBankContent = { audiences: [{ idc: 'A', categories: [], tone: 'casual', proofNote: '', slot: 0, stories: [story('p1', 'problem_fix'), story('m1', 'mistake')] }] };
    const learning = learnFrom([row('x', 'mistake', 'curiosity', 'kept'), row('y', 'mistake', 'curiosity', 'kept')]);
    const [first] = pickScripts(content, new Map(), [{ attention: 1, trust: 0, proof: 0, conversion: 0 }], learning);
    expect(first!.storyId).toBe('m1');
    expect(first!.hooks[0]!.archetype).toBe('curiosity');
  });
});
