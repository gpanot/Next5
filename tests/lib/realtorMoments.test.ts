import { describe, expect, it } from 'vitest';
import { disclosureLine, eventHours, momentLine, withDisclosure } from '../../src/lib/playbookMoment';
import { EVERGREEN, OPEN_HOUSE, PLAYBOOKS, beatOf, fillBeats, fillIdea, playbookForStatus, placeEventBeats } from '../../src/lib/realtorPlaybooks';

const noRecent = new Map<string, string>();

describe('placeEventBeats', () => {
  it('ends on the open house day', () => {
    const placed = placeEventBeats(OPEN_HOUSE.beats, '2026-11-22', '2026-11-12');
    expect(placed.map((p) => p.date)).toEqual(['2026-11-20', '2026-11-21', '2026-11-22']);
    expect(placed.at(-1)!.beat.key).toBe('open_house.today');
  });

  it('drops beats that would land before today', () => {
    const placed = placeEventBeats(OPEN_HOUSE.beats, '2026-11-13', '2026-11-12');
    expect(placed.map((p) => p.beat.key)).toEqual(['open_house.tips', 'open_house.today']);
  });
});

describe('fillBeats', () => {
  it('puts one pool beat on each free day only', () => {
    const placed = fillBeats(EVERGREEN.beats, '2026-11-16', new Set(['2026-11-17', '2026-11-19']), 7, { hasFace: true, hasArea: true, recent: noRecent });
    expect(placed.map((p) => p.date)).toEqual(['2026-11-16', '2026-11-18', '2026-11-20', '2026-11-21', '2026-11-22']);
    expect(new Set(placed.map((p) => p.beat.key)).size).toBe(placed.length);
  });

  it('skips the face beat when faceless and the spotlight without an area', () => {
    const placed = fillBeats(EVERGREEN.beats, '2026-11-16', new Set(), 14, { hasFace: false, hasArea: false, recent: noRecent });
    const keys = placed.map((p) => p.beat.key);
    expect(keys).not.toContain('evergreen.day_in_life');
    expect(keys).not.toContain('evergreen.spotlight');
    expect(placed).toHaveLength(EVERGREEN.beats.length - 2);
  });

  it('uses the least recently used beats first', () => {
    const recent = new Map([['evergreen.buyer_myth', '2026-11-10'], ['evergreen.seller_myth', '2026-11-01']]);
    const placed = fillBeats(EVERGREEN.beats, '2026-11-16', new Set(), 7, { hasFace: false, hasArea: false, recent });
    const keys = placed.map((p) => p.beat.key);
    expect(keys[0]).toBe('evergreen.first_time');
    expect(keys.slice(-2)).toEqual(['evergreen.seller_myth', 'evergreen.buyer_myth']);
  });
});

describe('playbooks', () => {
  it('every beat key resolves and has a seeded template id', () => {
    for (const pb of Object.values(PLAYBOOKS)) {
      for (const b of pb.beats) {
        expect(beatOf(b.key)).toBe(b);
        expect(b.templateId).toMatch(/^tpl_rp_[a-z]{2}_[a-z_]+$/);
      }
    }
  });

  it('suggests a playbook from the Zillow status', () => {
    expect(playbookForStatus('just_listed')).toBe('just_listed');
    expect(playbookForStatus('open_house')).toBe('open_house');
    expect(playbookForStatus('sold')).toBe('just_sold');
    expect(playbookForStatus('pending')).toBeNull();
  });

  it('fills moment placeholders', () => {
    expect(fillIdea('Now {price}, was {oldPrice}', { street: '', city: '', price: '$400,000', oldPrice: '$425,000' })).toBe('Now $400,000, was $425,000');
    expect(fillIdea('Today {hours} at {street}', { street: '12 Oak St', city: '' })).toBe('Today at 12 Oak St');
  });
});

describe('moment lines', () => {
  it('formats open house hours', () => {
    expect(eventHours(new Date('2026-11-22T13:00:00Z'), new Date('2026-11-22T15:00:00Z'))).toBe('1–3pm');
    expect(eventHours(new Date('2026-11-22T11:30:00Z'), new Date('2026-11-22T13:00:00Z'))).toBe('11:30am–1pm');
  });

  it('writes the price drop line only with a lower new price', () => {
    const base = { eventAt: null, eventEndAt: null, daysOnMarket: null };
    expect(momentLine('price_drop', { ...base, newPriceCents: 40_000_000, oldPriceCents: 42_500_000 })).toBe('New price $400,000. Old price $425,000.');
    expect(momentLine('price_drop', { ...base, newPriceCents: 40_000_000, oldPriceCents: null })).toBe('New price $400,000.');
  });

  it('adds the brokerage line above the hashtags, once', () => {
    const line = disclosureLine('Ana Ruiz', 'Compass');
    const caption = withDisclosure('Just listed.\nComment TOUR\n#AustinHomes #RealEstate', line);
    expect(caption).toBe('Just listed.\nComment TOUR\nListed by Ana Ruiz, Compass\n#AustinHomes #RealEstate');
    expect(withDisclosure(caption, line)).toBe(caption);
    expect(disclosureLine('Ana', '')).toBeNull();
  });
});
