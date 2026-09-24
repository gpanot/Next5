/**
 * Unit tests for the Campaign Studio slide generation logic.
 * Verifies payload shape, explicit durations, raster extensions on assets,
 * cost breakdown presence, and guardrail integration.
 *
 * LLM (chatJson) and Prisma calls are mocked.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Hoist mocks ──────────────────────────────────────────────────────────────
const { mockChatJson, mockPrismaStudioCandidate, mockListTemplates } = vi.hoisted(() => ({
  mockChatJson: vi.fn(),
  mockPrismaStudioCandidate: { create: vi.fn() },
  mockListTemplates: vi.fn(),
}));

vi.mock('../../../src/server/ai/openai', () => ({
  chatJson: mockChatJson,
  isOpenAiEnabled: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../src/lib/db', () => ({
  prisma: {
    studioRun: {
      findUnique: vi.fn(),
    },
    studioResearchItem: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    studioCandidate: mockPrismaStudioCandidate,
  },
}));

vi.mock('../../../src/server/templates/repository', () => ({
  listTemplates: mockListTemplates,
}));

import { prisma } from '../../../src/lib/db';
import { runGeneration } from '../../../src/server/studio/generator';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const mockTemplate = {
  id: 'tpl-1',
  legacyId: 4,
  name: 'What We Actually Do',
  pillarName: 'Awareness',
  hookPattern: 'Reveal the real service',
  beats: [
    { label: 'Hook', guidance: 'Open with a bold statement' },
    { label: 'What we do', guidance: 'Explain the service simply' },
    { label: 'Why it matters', guidance: 'Connect to the audience' },
  ],
  suggestedSlides: [
    { text: 'We fix your plumbing fast', bgPrompt: 'plumber at work 9:16 vertical, no text' },
    { text: 'Same-day service in Dallas', bgPrompt: 'Dallas street daytime 9:16 vertical, no text' },
    { text: 'No job too small', bgPrompt: 'happy homeowner 9:16 vertical, no text' },
  ],
  perspective: 'business',
  status: 'active',
};

const mockRun = {
  id: 'run-1',
  brandProfileId: 'profile-1',
  brandProfile: {
    id: 'profile-1',
    version: 2,
    sourceUrl: 'https://acmeplumbing.com',
    data: {
      positioning: { promoting: { value: 'professional plumbing services' } },
      classification: { vertical: { value: 'home_services' } },
    },
  },
};

const mockResearchItem = {
  id: 'item-1',
  runId: 'run-1',
  templateId: 'tpl-1',
  hook: 'Stop wasting money on plumbing emergencies',
  transcript: 'Hey everyone, I fix plumbing all day in Dallas. Here is what most homeowners get wrong.',
  excluded: false,
  createdAt: new Date(),
};

const GOOD_LLM_SLIDES = {
  slides: [
    { text: 'We fix plumbing fast', bgPrompt: 'plumber at work in kitchen 9:16 vertical, no text' },
    { text: 'Same-day service', bgPrompt: 'Dallas neighborhood morning 9:16 vertical, no text' },
    { text: 'Trusted for 20 years', bgPrompt: 'happy homeowner smiling 9:16 vertical, no text' },
  ],
};

// Default LLM setup helper — each test can override by calling this or setting up its own mocks
function setupDefaultMocks(llmSlides = GOOD_LLM_SLIDES) {
  vi.clearAllMocks();
  vi.mocked(prisma.studioRun.findUnique).mockResolvedValue(mockRun as never);
  vi.mocked(prisma.studioResearchItem.findMany).mockResolvedValue([mockResearchItem] as never);
  mockListTemplates.mockResolvedValue([mockTemplate]);
  mockPrismaStudioCandidate.create.mockResolvedValue({ id: 'cand-1' });
  // LLM: first call = slide generation, second call = guardrail check
  mockChatJson
    .mockResolvedValueOnce(llmSlides)
    .mockResolvedValueOnce({ warnings: [] });
}

beforeEach(() => {
  // Clear mocks but do NOT set up LLM responses — each describe block/test does that.
  vi.clearAllMocks();
  vi.mocked(prisma.studioRun.findUnique).mockResolvedValue(mockRun as never);
  vi.mocked(prisma.studioResearchItem.findMany).mockResolvedValue([mockResearchItem] as never);
  mockListTemplates.mockResolvedValue([mockTemplate]);
  mockPrismaStudioCandidate.create.mockResolvedValue({ id: 'cand-1' });
});

describe('runGeneration — payload shape', () => {
  it('creates a StudioCandidate with the correct payload structure', async () => {
    setupDefaultMocks();
    await runGeneration({ runId: 'run-1', profileVersion: 2 });

    expect(mockPrismaStudioCandidate.create).toHaveBeenCalledTimes(1);
    const createCall = mockPrismaStudioCandidate.create.mock.calls[0][0];
    const payload = createCall.data.payload;

    // Required fields
    expect(payload.compositionId).toBe('Slideshow');
    expect(Array.isArray(payload.slides)).toBe(true);
    expect(payload.slides.length).toBeGreaterThan(0);
    expect(typeof payload.durationSeconds).toBe('number');
    expect(typeof payload.perSlideSeconds).toBe('number');
  });

  it('sets durationSeconds = slideCount × perSlideSeconds explicitly', async () => {
    setupDefaultMocks();
    await runGeneration({ runId: 'run-1', profileVersion: 2 });

    const createCall = mockPrismaStudioCandidate.create.mock.calls[0][0];
    const { payload } = createCall.data;

    expect(payload.durationSeconds).toBe(payload.slides.length * payload.perSlideSeconds);
  });

  it('each slide has text and bgPrompt (no undefined values)', async () => {
    setupDefaultMocks();
    await runGeneration({ runId: 'run-1', profileVersion: 2 });

    const createCall = mockPrismaStudioCandidate.create.mock.calls[0][0];
    const slides = createCall.data.payload.slides as Array<{ text: string; bgPrompt: string }>;

    for (const slide of slides) {
      expect(typeof slide.text).toBe('string');
      expect(slide.text.length).toBeGreaterThan(0);
      expect(typeof slide.bgPrompt).toBe('string');
      expect(slide.bgPrompt.length).toBeGreaterThan(0);
    }
  });

  it('bgPrompts end with "9:16 vertical, no text" (raster-safe format)', async () => {
    setupDefaultMocks();
    await runGeneration({ runId: 'run-1', profileVersion: 2 });

    const createCall = mockPrismaStudioCandidate.create.mock.calls[0][0];
    const slides = createCall.data.payload.slides as Array<{ bgPrompt: string }>;
    for (const slide of slides) {
      expect(slide.bgPrompt).toMatch(/9:16 vertical, no text/i);
    }
  });

  it('stores a costBreakdown with slideTextUsdMicros', async () => {
    setupDefaultMocks();
    await runGeneration({ runId: 'run-1', profileVersion: 2 });

    const createCall = mockPrismaStudioCandidate.create.mock.calls[0][0];
    const { costBreakdown } = createCall.data;
    expect(costBreakdown).toBeDefined();
    expect(typeof (costBreakdown as { slideTextUsdMicros: number }).slideTextUsdMicros).toBe('number');
  });

  it('stores costUsdMicros as BigInt', async () => {
    setupDefaultMocks();
    await runGeneration({ runId: 'run-1', profileVersion: 2 });

    const createCall = mockPrismaStudioCandidate.create.mock.calls[0][0];
    expect(typeof createCall.data.costUsdMicros).toBe('bigint');
  });

  it('stores profileVersion matching the input', async () => {
    setupDefaultMocks();
    await runGeneration({ runId: 'run-1', profileVersion: 2 });

    const createCall = mockPrismaStudioCandidate.create.mock.calls[0][0];
    expect(createCall.data.profileVersion).toBe(2);
  });

  it('includes guardrailWarnings array even when no warnings', async () => {
    setupDefaultMocks();
    await runGeneration({ runId: 'run-1', profileVersion: 2 });

    const createCall = mockPrismaStudioCandidate.create.mock.calls[0][0];
    expect(Array.isArray(createCall.data.guardrailWarnings)).toBe(true);
    expect(createCall.data.guardrailWarnings).toHaveLength(0);
  });
});

describe('runGeneration — guardrails integration', () => {
  it('stores guardrail warnings when LLM flags violations', async () => {
    vi.clearAllMocks();
    vi.mocked(prisma.studioRun.findUnique).mockResolvedValue(mockRun as never);
    vi.mocked(prisma.studioResearchItem.findMany).mockResolvedValue([mockResearchItem] as never);
    mockListTemplates.mockResolvedValue([mockTemplate]);
    mockPrismaStudioCandidate.create.mockResolvedValue({ id: 'cand-1' });
    mockChatJson
      .mockResolvedValueOnce(GOOD_LLM_SLIDES) // slide gen
      .mockResolvedValueOnce({
        warnings: [{ type: 'claim', text: 'Save 50%', rule: 'Specific percentage' }],
      }); // guardrail check — violation returned

    await runGeneration({ runId: 'run-1', profileVersion: 2 });

    const createCall = mockPrismaStudioCandidate.create.mock.calls[0][0];
    expect(createCall.data.guardrailWarnings).toHaveLength(1);
    const warning = (createCall.data.guardrailWarnings as Array<{ type: string }>)[0];
    expect(warning.type).toBe('claim');
  });
});

describe('runGeneration — fallback path', () => {
  it('uses suggestedSlides from template when LLM returns empty', async () => {
    setupDefaultMocks({ slides: [] }); // override LLM to return empty → fallback to suggestedSlides

    await runGeneration({ runId: 'run-1', profileVersion: 2 });

    const createCall = mockPrismaStudioCandidate.create.mock.calls[0][0];
    expect(createCall).toBeDefined(); // candidate created from fallback
    const slides = createCall.data.payload.slides as Array<{ text: string }>;
    expect(slides.length).toBeGreaterThan(0);
  });

  it('returns telemetry with candidate count', async () => {
    setupDefaultMocks();

    const result = await runGeneration({ runId: 'run-1', profileVersion: 2 });
    expect(result.candidates).toBeGreaterThanOrEqual(1);
    expect(result.telemetry.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.telemetry.totalCostUsdMicros).toBe('number');
  });
});

describe('runGeneration — duration proportionality', () => {
  it('3-slide candidate has exactly 3x perSlideSeconds duration', async () => {
    setupDefaultMocks({
      slides: [
        { text: 'A', bgPrompt: 'bg A 9:16 vertical, no text' },
        { text: 'B', bgPrompt: 'bg B 9:16 vertical, no text' },
        { text: 'C', bgPrompt: 'bg C 9:16 vertical, no text' },
      ],
    });

    await runGeneration({ runId: 'run-1', profileVersion: 2 });

    const createCall = mockPrismaStudioCandidate.create.mock.calls[0][0];
    const { payload } = createCall.data;
    expect(payload.slides).toHaveLength(3);
    expect(payload.durationSeconds).toBe(3 * payload.perSlideSeconds);
  });

  it('6-slide candidate has exactly 6x perSlideSeconds duration', async () => {
    setupDefaultMocks({
      slides: Array.from({ length: 6 }, (_, i) => ({
        text: `Slide ${i + 1}`,
        bgPrompt: `bg ${i + 1} 9:16 vertical, no text`,
      })),
    });

    await runGeneration({ runId: 'run-1', profileVersion: 2 });

    const createCall = mockPrismaStudioCandidate.create.mock.calls[0][0];
    const { payload } = createCall.data;
    expect(payload.slides).toHaveLength(6);
    expect(payload.durationSeconds).toBe(6 * payload.perSlideSeconds);
  });
});
