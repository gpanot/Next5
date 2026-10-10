import { describe, expect, it } from 'vitest';
import { groupNeeds, type BatchNeed } from '../../../src/server/slideshow/core/imageNeeds';

const need = (script: number, role: BatchNeed['need']['role'], text: string, audience = 'home cooks'): BatchNeed =>
  ({ script, audience, categories: ['home_services'], need: { key: `${audience}:${role}`, role, text } });

describe('groupNeeds', () => {
  it('makes one image for the same proof quote across stories', () => {
    const groups = groupNeeds([
      need(0, 'proof', 'More than 500,000 satisfied users.'),
      need(1, 'proof', '500,000 satisfied users'),
      need(2, 'proof', 'Rated 4.5 stars from 7,000+ reviews.'),
      need(3, 'proof', '4.5 stars from 7,000+ reviews'),
    ]);
    expect(groups.map((g) => g.members.map((m) => m.script))).toEqual([[0, 1], [2, 3]]);
  });

  it('keeps shots, audiences and different moments apart', () => {
    const groups = groupNeeds([
      need(0, 'pain', 'Leftovers hide until they smell bad.'),
      need(1, 'pain', 'You buy pasta, then find extra boxes at home.'),
      need(2, 'mechanism', 'Leftovers hide until they smell bad.'),
      need(3, 'pain', 'Leftovers hide until they smell bad.', 'parents'),
    ]);
    expect(groups).toHaveLength(4);
  });

  it('gives each lead a key unique in the batch', () => {
    const keys = groupNeeds([need(0, 'pain', 'One thing'), need(1, 'pain', 'Something else entirely')]).map((g) => g.lead.key);
    expect(new Set(keys).size).toBe(2);
  });
});
