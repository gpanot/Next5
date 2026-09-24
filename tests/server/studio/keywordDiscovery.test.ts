/**
 * Unit tests for TikTok search-term discovery + the relevance guardrail.
 *
 * Real bug this pins down: a booking-software site for auto mechanics got research keywords
 * like "fitness studio management" and "beauty salon strategies". Two causes: the niches were
 * padded from LLM world knowledge, and the keywords were "business tips" phrases that match
 * generic business-coach videos. Search terms are now plain niche names, the way the Blitz
 * researcher is used ("auto mechanic").
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const chatJsonMock = vi.fn();
vi.mock('../../../src/server/ai/openai', () => ({
  chatJson: (...args: unknown[]) => chatJsonMock(...args),
}));

import { discoverKeywords, toSearchTerm } from '../../../src/server/studio/keywordDiscovery';

afterEach(() => {
  chatJsonMock.mockReset();
});


describe('toSearchTerm', () => {
  it('strips generic add-on words that pull in business-coach content', () => {
    expect(toSearchTerm('Mechanic Business Advice')).toBe('mechanic');
    expect(toSearchTerm('auto repair tips')).toBe('auto repair');
    expect(toSearchTerm('small electrical business growth')).toBe('electrical');
    expect(toSearchTerm('diner owner')).toBe('diner owner');
  });

  it('keeps plain niche names untouched', () => {
    expect(toSearchTerm('auto mechanics')).toBe('auto mechanics');
    expect(toSearchTerm('day spa')).toBe('day spa');
  });
});

describe('discoverKeywords — B2B uses the grounded niches directly', () => {
  it('turns target customer industries into search terms without calling the LLM', async () => {
    const result = await discoverKeywords({
      businessName: 'Avenue',
      vertical: 'saas',
      audienceType: 'b2b',
      promoting: 'Booking software for service businesses',
      targetCustomerIndustries: ['auto mechanics', 'electricians'],
    });

    expect(chatJsonMock).not.toHaveBeenCalled();
    expect(result.keywords).toEqual(['auto mechanics', 'electricians']);
    expect(result.verified).toBe(true);
  });

  it('caps at 3 terms and dedupes after stripping', () => {
    return discoverKeywords({
      businessName: 'Avenue',
      vertical: 'saas',
      audienceType: 'b2b',
      promoting: '',
      targetCustomerIndustries: ['auto mechanics', 'auto mechanics business', 'electricians', 'plumbers', 'roofers'],
    }).then((r) => expect(r.keywords).toEqual(['auto mechanics', 'electricians', 'plumbers']));
  });

  it('B2B with no niches returns no search terms (never the vendor\'s own vertical)', async () => {
    const result = await discoverKeywords({
      businessName: 'Avenue',
      vertical: 'saas',
      audienceType: 'b2b',
      promoting: 'Booking software for service businesses',
      targetCustomerIndustries: [],
    });

    expect(chatJsonMock).not.toHaveBeenCalled();
    expect(result.keywords).toEqual([]);
  });

  it('generic vertical with no signal uses the generic pack', async () => {
    const result = await discoverKeywords({
      businessName: 'Unknown Co',
      vertical: 'generic',
      audienceType: 'b2c',
      promoting: '',
      targetCustomerIndustries: [],
    });

    expect(chatJsonMock).not.toHaveBeenCalled();
    expect(result.keywords).toContain('business tips');
  });
});

describe('discoverKeywords — B2C names its own trade', () => {
  const autoShop = {
    businessName: 'KC Auto Solutions',
    vertical: 'automotive',
    audienceType: 'b2c',
    promoting: 'Dependable auto repair services for all makes and models',
    targetCustomerIndustries: [],
  };

  it('asks the LLM for the trade name, strips filler, then verifies', async () => {
    chatJsonMock
      .mockResolvedValueOnce({ terms: ['auto repair tips', 'mechanic'] })
      .mockResolvedValueOnce({ checks: [{ query: 'auto repair', relevant: true }, { query: 'mechanic', relevant: true }] });

    const result = await discoverKeywords(autoShop);

    expect(chatJsonMock).toHaveBeenCalledTimes(2);
    expect(result.keywords).toEqual(['auto repair', 'mechanic']);
    expect(result.verified).toBe(true);
  });

  it('drops an off-topic term and does NOT refill from the vertical pack', async () => {
    chatJsonMock
      .mockResolvedValueOnce({ terms: ['auto repair', 'fitness studio'] })
      .mockResolvedValueOnce({ checks: [{ query: 'auto repair', relevant: true }, { query: 'fitness studio', relevant: false }] });

    const result = await discoverKeywords(autoShop);

    expect(result.keywords).toEqual(['auto repair']);
  });

  it('a dentist never gets chiropractor terms from the shared health_wellness pack', async () => {
    chatJsonMock
      .mockResolvedValueOnce({ terms: ['dental implants', 'teeth whitening', 'gym'] })
      .mockResolvedValueOnce({
        checks: [
          { query: 'dental implants', relevant: true },
          { query: 'teeth whitening', relevant: true },
          { query: 'gym', relevant: false },
        ],
      });

    const result = await discoverKeywords({
      businessName: 'Independence Family Dentistry',
      vertical: 'health_wellness',
      audienceType: 'b2c',
      promoting: 'Expert dental care for families in Independence, KY.',
      targetCustomerIndustries: [],
    });

    expect(result.keywords).toEqual(['dental implants', 'teeth whitening']);
    expect(result.keywords.some((k) => /chiropract|back pain/i.test(k))).toBe(false);
  });

  it('never reports verified=true when the validation call returns null', async () => {
    chatJsonMock.mockResolvedValueOnce({ terms: ['auto repair', 'mechanic'] }).mockResolvedValueOnce(null);

    const result = await discoverKeywords(autoShop);

    expect(result.keywords).toEqual(['auto repair', 'mechanic']);
    expect(result.verified).toBe(false);
  });

  it('returns no terms (not a pack guess) when the LLM call fails', async () => {
    chatJsonMock.mockRejectedValueOnce(new Error('network error'));

    const result = await discoverKeywords(autoShop);

    expect(result.keywords).toEqual([]);
    expect(result.verified).toBe(false);
  });
});
