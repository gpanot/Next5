import { describe, expect, it } from 'vitest';
import { beatOf, fillIdea, JUST_LISTED, MARKET_UPDATE, nextMonday, placeBeats } from '../../src/lib/realtorPlaybooks';

describe('placeBeats', () => {
  it('puts every beat on its own day when the calendar is empty', () => {
    const placed = placeBeats(JUST_LISTED.beats, '2026-11-16', new Set(), 14);
    expect(placed.map((p) => p.date)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']);
  });

  it('skips busy days and keeps beat order', () => {
    const placed = placeBeats(JUST_LISTED.beats, '2026-11-16', new Set(['2026-11-17', '2026-11-18']), 14);
    expect(placed.map((p) => p.date)).toEqual(['2026-11-16', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24']);
    expect(placed[1]!.beat.key).toBe('just_listed.editorial');
  });

  it('drops beats that no longer fit the window', () => {
    const placed = placeBeats(JUST_LISTED.beats, '2026-11-16', new Set(['2026-11-18', '2026-11-19', '2026-11-20']), 7);
    expect(placed).toHaveLength(4);
  });
});

describe('beats', () => {
  it('finds a beat by key and fills its idea', () => {
    const b = beatOf('just_listed.neighborhood');
    expect(b?.slideshow).toBe('neighborhood');
    expect(fillIdea(b!.idea, { street: '12 Oak St', city: 'Austin' })).toContain('12 Oak St');
    expect(beatOf('nope.x')).toBeNull();
  });

  it('points each beat at its seeded template', () => {
    expect(JUST_LISTED.beats.map((b) => b.templateId)).toContain('tpl_rp_jl_coming_soon');
    expect(new Set(JUST_LISTED.beats.map((b) => b.templateId)).size).toBe(JUST_LISTED.beats.length);
  });
});

describe('market update', () => {
  it('uses its own seeded template', () => {
    expect(MARKET_UPDATE.beats[0]!.templateId).toBe('tpl_rp_mu_stats');
    expect(beatOf('market_update.stats')?.slideshow).toBe('market_stats');
  });

  it('goes out on the next Monday', () => {
    expect(nextMonday(new Date('2026-11-12T10:00:00Z'))).toBe('2026-11-16');
    expect(nextMonday(new Date('2026-11-16T10:00:00Z'))).toBe('2026-11-16');
  });
});
