import { describe, expect, it } from 'vitest';
import { STAGE_TARGET, WEEK_MIX, batchQuotas, orderByStage, type Stage } from '../../../src/server/labs/blitzFormats';
import { campaignWeek } from '../../../src/server/labs/blitzCampaign';
import { hookClaimIsProven } from '../../../src/server/labs/websiteDeck';

describe('batchQuotas', () => {
  it('takes the two campaign weeks the batch covers, minus the slideshows\' stages', () => {
    expect(batchQuotas(0, [])).toEqual([WEEK_MIX[0], WEEK_MIX[1]]);
    expect(batchQuotas(3, [])).toEqual([WEEK_MIX[3], WEEK_MIX[0]]);
    const [w1, w2] = batchQuotas(0, ['teach']);
    expect(w1!.trust + w2!.trust).toBe(WEEK_MIX[0]!.trust + WEEK_MIX[1]!.trust - 1);
    expect(w2!.trust).toBe(WEEK_MIX[1]!.trust - 1);
  });

  it('every week sums to 7 and the bank target covers any two weeks', () => {
    WEEK_MIX.forEach((w) => expect(Object.values(w).reduce((n, v) => n + v, 0)).toBe(7));
    expect(STAGE_TARGET).toEqual({ attention: 6, trust: 5, proof: 5, conversion: 4 });
  });
});

describe('campaignWeek', () => {
  it('counts weeks from the campaign start and repeats every 28 days', () => {
    const start = new Date('2026-10-10T12:00:00Z');
    const at = (days: number) => new Date(start.getTime() + days * 86_400_000);
    expect([0, 6, 7, 20, 27, 28, 35].map((d) => campaignWeek(at(d), start))).toEqual([0, 0, 1, 2, 3, 0, 1]);
    expect(campaignWeek(new Date('2026-10-10T01:00:00Z'), start)).toBe(0);
  });
});

describe('orderByStage', () => {
  it('keeps neighbouring days on different stages and opens without conversion', () => {
    const stages: Stage[] = ['conversion', 'conversion', 'attention', 'attention', 'attention', 'trust', 'proof'];
    const order = orderByStage(stages).map((i) => stages[i]!);
    expect(order).toHaveLength(stages.length);
    expect(order.slice(0, 2)).not.toContain('conversion');
    order.slice(1).forEach((s, i) => expect(s).not.toBe(order[i]));
  });
});

describe('hookClaimIsProven', () => {
  const proof = [{ claim: 'More than 500,000 satisfied users', evidence: 'More than 500,000 satisfied users.', sourceUrl: '' }];
  it('lets a hook restate proof but not add to it', () => {
    expect(hookClaimIsProven('500,000 satisfied users', proof)).toBe(true);
    expect(hookClaimIsProven('500,000 users know before leaving home', proof)).toBe(false);
    expect(hookClaimIsProven('500,000 satisfied users plan meals before dinner', proof)).toBe(false);
    expect(hookClaimIsProven('Families, know dinner before it starts', proof)).toBe(true);
  });
});
