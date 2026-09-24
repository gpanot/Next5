/**
 * Unit tests for profile extractor.
 * Tests the placeholder path and data shape contracts.
 * Full LLM + Exa integration tests require real API keys (run manually / CI with secrets).
 */
import { describe, expect, it, vi, afterEach } from 'vitest';

// Note: vi.mock() is hoisted to the top of the file by vitest.
// The mock path must match what profileExtractor.ts imports.
vi.mock('../../../src/server/ai/openai', () => ({
  chatJson: vi.fn().mockResolvedValue(null), // returns null by default → LLM unavailable
  isOpenAiEnabled: vi.fn().mockReturnValue(false),
}));

// Stub global fetch — fail by default (simulate Exa unavailable)
vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unavailable')));

import { extractProfile } from '../../../src/server/studio/profileExtractor';

afterEach(() => vi.clearAllMocks());

describe('extractProfile — fallback path (no external APIs)', () => {
  it('returns a valid StudioProfileData structure when crawl fails', async () => {
    const result = await extractProfile({ sourceUrl: 'https://acmeplumbing.com' });

    // Top-level sections always present
    expect(result.data.classification).toBeDefined();
    expect(result.data.identity).toBeDefined();
    expect(result.data.positioning).toBeDefined();
    expect(result.data.market).toBeDefined();
    expect(result.data.tone).toBeDefined();
  });

  it('uses the hostname as business name when crawl fails', async () => {
    const result = await extractProfile({ sourceUrl: 'https://acmeplumbing.com' });
    expect(result.data.identity.businessName.value).toBe('acmeplumbing.com');
    expect(result.data.identity.businessName.confidence).toBe(0);
  });

  it('has zero cost when no API calls succeed', async () => {
    const result = await extractProfile({ sourceUrl: 'https://acmeplumbing.com' });
    expect(result.telemetry.totalCostUsdMicros).toBe(0);
  });

  it('returns correct telemetry shape', async () => {
    const result = await extractProfile({ sourceUrl: 'https://acmeplumbing.com' });
    const { stages } = result.telemetry;
    expect(typeof stages.crawl.durationMs).toBe('number');
    expect(typeof stages.crawl.costUsdMicros).toBe('number');
    expect(typeof stages.infer.durationMs).toBe('number');
    expect(typeof stages.competitors.durationMs).toBe('number');
    expect(typeof stages.keywords.durationMs).toBe('number');
  });

  it('all field envelopes have required shape', async () => {
    const result = await extractProfile({ sourceUrl: 'https://test.com' });

    const checkEnvelope = (env: unknown, path: string) => {
      expect(typeof (env as { value: unknown }).value !== 'undefined', `${path}.value defined`).toBe(true);
      expect(typeof (env as { source: string }).source).toBe('string');
      expect(typeof (env as { confidence: number }).confidence).toBe('number');
      expect(typeof (env as { locked: boolean }).locked).toBe('boolean');
    };

    checkEnvelope(result.data.identity.businessName, 'identity.businessName');
    checkEnvelope(result.data.identity.tagline, 'identity.tagline');
    checkEnvelope(result.data.classification.vertical, 'classification.vertical');
    checkEnvelope(result.data.positioning.promoting, 'positioning.promoting');
    checkEnvelope(result.data.market.competitors, 'market.competitors');
    checkEnvelope(result.data.market.keywords, 'market.keywords');
    checkEnvelope(result.data.tone.tone, 'tone.tone');
    checkEnvelope(result.data.tone.hooks, 'tone.hooks');
  });

  it('strips www from hostname', async () => {
    const result = await extractProfile({ sourceUrl: 'https://www.acmeplumbing.com' });
    expect(result.data.identity.businessName.value).toBe('acmeplumbing.com');
  });

  it('competitors and keywords are empty arrays in placeholder', async () => {
    const result = await extractProfile({ sourceUrl: 'https://test.com' });
    expect(Array.isArray(result.data.market.competitors.value)).toBe(true);
    expect(result.data.market.competitors.value).toHaveLength(0);
    expect(Array.isArray(result.data.market.keywords.value)).toBe(true);
    expect(result.data.market.keywords.value).toHaveLength(0);
  });

  it('returns the generic vertical in placeholder', async () => {
    const result = await extractProfile({ sourceUrl: 'https://test.com' });
    expect(result.data.classification.vertical.value).toBe('generic');
  });
});
