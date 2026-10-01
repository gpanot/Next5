import { describe, expect, it } from 'vitest';
import { assignGoals, goalFitsPattern } from '../../../src/types/admin/contentGoals';

const count = (goals: string[]) => goals.reduce<Record<string, number>>((m, g) => ({ ...m, [g]: (m[g] ?? 0) + 1 }), {});

describe('assignGoals', () => {
  it('follows the mix over 20 slideshows: 8 teach, 4 proof, 3 myth, 3 story, 2 product', () => {
    expect(count(assignGoals(20))).toEqual({ teach: 8, proof: 4, myth: 3, story: 3, product: 2 });
  });

  it('starts with teach, and a small batch gets several goals', () => {
    const goals = assignGoals(5);
    expect(goals[0]).toBe('teach');
    expect(new Set(goals).size).toBeGreaterThanOrEqual(4);
  });

  it('"Get more" balances against the slideshows already made', () => {
    expect(assignGoals(1, ['teach', 'teach', 'teach'])).toEqual(['proof']);
    expect(assignGoals(1, [null, undefined])).toEqual(['teach']);
  });
});

describe('goalFitsPattern', () => {
  it('matches formats and hook types', () => {
    expect(goalFitsPattern('myth', { format: 'listicle', hookArchetype: 'contrarian' })).toBe(true);
    expect(goalFitsPattern('story', { format: 'listicle', hookArchetype: 'call_out' })).toBe(false);
    expect(goalFitsPattern('product', { format: 'other', hookArchetype: 'action' })).toBe(true);
  });
});
