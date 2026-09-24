/**
 * Unit tests for competitor discovery.
 * Real-world reference bug: a competing tool (Fastlane) returns real-estate marketing
 * companies as competitors for a general booking-software vendor — an LLM-memory guess that
 * landed in the wrong category. This module replaces LLM memory with an Exa company search
 * plus an LLM validation pass, so a wrong-category candidate can be filtered out instead of
 * invented from scratch.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const chatJsonMock = vi.fn();
vi.mock('../../../src/server/ai/openai', () => ({
  chatJson: (...args: unknown[]) => chatJsonMock(...args),
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { findCompetitors } from '../../../src/server/studio/competitors';

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => {
  chatJsonMock.mockReset();
  fetchMock.mockReset();
  process.env.EXA_API_KEY = 'test-key';
});

afterEach(() => vi.clearAllMocks());

describe('findCompetitors', () => {
  it('returns validated competitors from a category=company Exa search', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ results: [{ title: 'Workiz', url: 'https://workiz.com' }, { title: 'Keap', url: 'https://keap.com' }] }),
    );
    chatJsonMock.mockResolvedValueOnce({ competitors: ['Workiz', 'Keap'] });

    const result = await findCompetitors({
      businessName: 'Avenue',
      promoting: 'Booking software for service businesses',
      geography: 'Australia',
      sourceUrl: 'https://www.avenue2.au/',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.exa.ai/search');
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.category).toBe('company');
    expect(body.excludeDomains).toEqual(['avenue2.au']);

    expect(result.competitors).toEqual(['Workiz', 'Keap']);
    expect(result.exaCalls).toBe(1);
  });

  it('retries with a plain search when the category=company search returns nothing', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ results: [] }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ title: 'Acme', url: 'https://acme.com' }] }));
    chatJsonMock.mockResolvedValueOnce({ competitors: ['Acme'] });

    const result = await findCompetitors({ businessName: 'X', promoting: 'Y', geography: '', sourceUrl: 'https://x.com' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.exaCalls).toBe(2);
    expect(result.competitors).toEqual(['Acme']);
  });

  it('returns empty competitors rather than falling back to an LLM-memory guess when Exa has nothing', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }));

    const result = await findCompetitors({ businessName: 'X', promoting: 'Y', geography: '', sourceUrl: 'https://x.com' });

    expect(result.competitors).toEqual([]);
    expect(chatJsonMock).not.toHaveBeenCalled();
  });

  it('lets the validation pass drop a wrong-category candidate', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: [
          { title: 'Workiz', url: 'https://workiz.com' },
          { title: 'Luxury Presence', url: 'https://luxurypresence.com' }, // real-estate marketing — wrong category
        ],
      }),
    );
    // The validation prompt instructs the model to drop mismatched candidates;
    // simulate it doing exactly that.
    chatJsonMock.mockResolvedValueOnce({ competitors: ['Workiz'] });

    const result = await findCompetitors({
      businessName: 'Avenue',
      promoting: 'Booking software for service businesses',
      geography: 'Australia',
      sourceUrl: 'https://www.avenue2.au/',
    });

    expect(result.competitors).toEqual(['Workiz']);
    expect(result.competitors).not.toContain('Luxury Presence');
  });
});
