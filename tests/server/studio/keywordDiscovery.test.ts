/**
 * Unit tests for TikTok keyword discovery + the relevance guardrail.
 * This is the fix for a real production bug: a B2B SaaS site (booking software for
 * mechanics/electricians) produced totally unrelated TikTok keywords ("fitness studio
 * management", "healthcare tips") because the vendor's own vertical ("saas") was handed to
 * the LLM as if it were a real-world audience, directly contradicting the "don't write about
 * software" rule in the same prompt. These tests pin down the fix and the backstop guardrail
 * so this class of mistake cannot ship again for any vertical — not just SaaS.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const chatJsonMock = vi.fn();
vi.mock('../../../src/server/ai/openai', () => ({
  chatJson: (...args: unknown[]) => chatJsonMock(...args),
}));

import { discoverKeywords } from '../../../src/server/studio/keywordDiscovery';

afterEach(() => {
  chatJsonMock.mockReset();
});

describe('discoverKeywords — no-signal cases never reach the LLM', () => {
  it('B2B vendor with no target customer industries uses the vertical pack, never the LLM', async () => {
    const result = await discoverKeywords({
      businessName: 'Avenue',
      vertical: 'saas',
      audienceType: 'b2b',
      promoting: 'Booking software for service businesses',
      targetCustomerIndustries: [],
    });

    expect(chatJsonMock).not.toHaveBeenCalled();
    expect(result.verified).toBe(true);
    expect(result.keywords.length).toBeGreaterThan(0);
    // The real-world failure mode: unrelated hallucinated niches must never appear.
    expect(result.keywords.some((k) => /fitness|healthcare/i.test(k))).toBe(false);
  });

  it('generic vertical (crawl too thin to classify) uses the generic pack, not a guess', async () => {
    const result = await discoverKeywords({
      businessName: 'Unknown Co',
      vertical: 'generic',
      audienceType: 'b2c',
      promoting: '',
      targetCustomerIndustries: [],
    });

    expect(chatJsonMock).not.toHaveBeenCalled();
    expect(result.keywords).toEqual(expect.arrayContaining(['business tips']));
  });
});

describe('discoverKeywords — grounded LLM generation', () => {
  it('B2C business with a real vertical (auto repair) generates on-topic queries', async () => {
    chatJsonMock
      .mockResolvedValueOnce({ queries: ['mechanic tips', 'auto shop day in the life', 'car repair advice', 'oil change tips'] })
      .mockResolvedValueOnce({
        checks: [
          { query: 'mechanic tips', relevant: true },
          { query: 'auto shop day in the life', relevant: true },
          { query: 'car repair advice', relevant: true },
          { query: 'oil change tips', relevant: true },
        ],
      });

    const result = await discoverKeywords({
      businessName: "Joe's Auto Repair",
      vertical: 'automotive',
      audienceType: 'b2c',
      promoting: 'Full-service auto repair shop',
      targetCustomerIndustries: [],
    });

    expect(chatJsonMock).toHaveBeenCalledTimes(2);
    expect(result.keywords).toContain('mechanic tips');
    expect(result.verified).toBe(true);
  });

  it('B2B vendor with real target customer industries generates niche-grounded queries, never vendor-vertical ones', async () => {
    chatJsonMock
      .mockResolvedValueOnce({
        queries: ['mechanic scheduling tips', 'electrician business advice', 'auto shop tips', 'electrical contractor advice'],
      })
      .mockResolvedValueOnce({
        checks: [
          { query: 'mechanic scheduling tips', relevant: true },
          { query: 'electrician business advice', relevant: true },
          { query: 'auto shop tips', relevant: true },
          { query: 'electrical contractor advice', relevant: true },
        ],
      });

    const result = await discoverKeywords({
      businessName: 'Avenue',
      vertical: 'saas',
      audienceType: 'b2b',
      promoting: 'Booking software for mechanics and electricians',
      targetCustomerIndustries: ['auto mechanics', 'electricians'],
    });

    expect(result.keywords.every((k) => !/\bsaas\b|\bsoftware\b|\bapp\b/i.test(k))).toBe(true);
    expect(result.keywords).toContain('mechanic scheduling tips');
  });
});

describe('discoverKeywords — relevance guardrail rejects hallucinated queries', () => {
  it('drops an off-topic query the LLM invented and backfills from the vertical pack', async () => {
    chatJsonMock
      .mockResolvedValueOnce({
        queries: ['mechanic tips', 'fitness studio management', 'car repair advice', 'healthcare tips'],
      })
      .mockResolvedValueOnce({
        checks: [
          { query: 'mechanic tips', relevant: true },
          { query: 'fitness studio management', relevant: false },
          { query: 'car repair advice', relevant: true },
          { query: 'healthcare tips', relevant: false },
        ],
      });

    const result = await discoverKeywords({
      businessName: "Joe's Auto Repair",
      vertical: 'automotive',
      audienceType: 'b2c',
      promoting: 'Full-service auto repair shop',
      targetCustomerIndustries: [],
    });

    expect(result.keywords).not.toContain('fitness studio management');
    expect(result.keywords).not.toContain('healthcare tips');
    expect(result.keywords).toContain('mechanic tips');
    expect(result.keywords).toContain('car repair advice');
    expect(result.keywords.length).toBeLessThanOrEqual(4);
    expect(result.verified).toBe(true);
  });

  it('passes queries through unverified (not silently dropped) when the validation call itself fails', async () => {
    chatJsonMock
      .mockResolvedValueOnce({ queries: ['mechanic tips', 'auto shop advice', 'car repair tips', 'oil change tips'] })
      .mockRejectedValueOnce(new Error('timeout'));

    const result = await discoverKeywords({
      businessName: "Joe's Auto Repair",
      vertical: 'automotive',
      audienceType: 'b2c',
      promoting: 'Full-service auto repair shop',
      targetCustomerIndustries: [],
    });

    expect(result.keywords).toHaveLength(4);
    expect(result.verified).toBe(false);
  });

  it('never reports verified=true when the validation call returns null (chatJson\'s real failure mode never throws)', async () => {
    chatJsonMock
      .mockResolvedValueOnce({ queries: ['mechanic tips', 'auto shop advice', 'car repair tips', 'oil change tips'] })
      .mockResolvedValueOnce(null);

    const result = await discoverKeywords({
      businessName: "Joe's Auto Repair",
      vertical: 'automotive',
      audienceType: 'b2c',
      promoting: 'Full-service auto repair shop',
      targetCustomerIndustries: [],
    });

    expect(result.keywords).toHaveLength(4);
    expect(result.verified).toBe(false);
  });
});

describe('discoverKeywords — LLM discovery failure falls back to niche-derived keywords', () => {
  it('falls back to "<niche> tips" when the discovery LLM call fails entirely', async () => {
    chatJsonMock.mockRejectedValueOnce(new Error('network error'));

    const result = await discoverKeywords({
      businessName: 'Avenue',
      vertical: 'saas',
      audienceType: 'b2b',
      promoting: 'Booking software for mechanics and electricians',
      targetCustomerIndustries: ['auto mechanics', 'electricians'],
    });

    expect(result.keywords).toEqual(['auto mechanics tips', 'electricians tips']);
    expect(result.verified).toBe(false);
  });
});
