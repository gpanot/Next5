/**
 * Campaign Studio v1 — Generation stage.
 * Generates Blitz Slideshow candidates from research items.
 *
 * For each research item with a matched template, the generator:
 *   1. Generates slide text + bgPrompts via LLM (gpt-4o-mini)
 *   2. Runs a two-pass guardrail check
 *   3. Stores a StudioCandidate with the payload (no MP4 render yet)
 *
 * Background images are NOT generated here — they are generated on accept so the
 * Lambda doesn't time out (reAPI images take ~45s each, 4 slides = ~180s > 120s limit).
 *
 * Cost: ~$0.0003/candidate for slide text LLM.
 */
// server-only
import { chatJson } from '../ai/openai';
import { prisma } from '../../lib/db';
import { listTemplates } from '../templates/repository';
import type { TemplateDto } from '../templates/dto';
import type { GuardrailWarning, SlideshowPayload, StageMetrics } from './types';

// ─── Slide text generation ─────────────────────────────────────────────────────

const PER_SLIDE_SECONDS = 3;

const SLIDE_GEN_SYSTEM = [
  'You write text-card slideshows for small-business TikTok accounts.',
  '',
  'Rules:',
  '- Third-grade reading level. Short words, short sentences, contractions.',
  '- Each slide text is at most 14 words. Readable in under 2 seconds.',
  '- Never invent prices, percentages, years in business, or any number.',
  '- Leave no [BRACKETS] or placeholders. Every slide ready to post as-is.',
  '- Use [BUSINESS_NAME] only where the business name belongs.',
  '- No hashtags. At most one emoji across the whole slideshow.',
  '',
  'Background image prompt (bgPrompt):',
  '- One prompt per slide for a text-to-image model.',
  '- Describe a real photograph matching that slide\'s message.',
  '- Include subject, setting, lighting, mood. End with "9:16 vertical, no text".',
  '- No text, logos, watermarks, or brand names in the image.',
  '',
  'Return JSON only: { "slides": [ { "text": "...", "bgPrompt": "..." } ] }',
].join('\n');

type RawSlide = { text?: unknown; bgPrompt?: unknown };

const isValidSlide = (v: unknown): v is { text: string; bgPrompt: string } =>
  typeof v === 'object' && v !== null &&
  typeof (v as RawSlide).text === 'string' &&
  typeof (v as RawSlide).bgPrompt === 'string';

/** Cost: gpt-4o-mini input $0.15/1M, output $0.60/1M, ~900 token output → ~$0.00054 = 540 micros */
const SLIDE_GEN_COST_MICROS = 540;

async function generateSlideText(
  niche: string,
  template: TemplateDto,
  hook: string,
  transcript: string,
): Promise<{ slides: Array<{ text: string; bgPrompt: string }>; costMicros: number }> {
  const parts = [
    `Niche: ${niche}`,
    '',
    `Template: ${template.name} (${template.pillarName})`,
    `Hook pattern: ${template.hookPattern}`,
    `Structure:`,
    ...template.beats.map((b, i) => `  ${i + 1}. ${b.label}${b.guidance ? `: ${b.guidance}` : ''}`),
  ];

  if (hook.trim()) parts.push('', `Source video hook: "${hook.trim().slice(0, 300)}"`);
  if (transcript.trim()) parts.push('', 'Source transcript excerpt:', transcript.trim().slice(0, 1_200));
  parts.push('', `Write exactly ${template.beats.length} slides for a ${niche} business.`);

  const result = await chatJson<{ slides?: unknown }>(
    [
      { role: 'system', content: SLIDE_GEN_SYSTEM },
      { role: 'user', content: parts.join('\n') },
    ],
    { maxTokens: 900, temperature: 0.75, timeoutMs: 30_000 },
  );

  const raw = Array.isArray(result?.slides) ? result.slides : [];
  const slides = raw
    .filter(isValidSlide)
    .map((s) => ({ text: s.text.trim(), bgPrompt: s.bgPrompt.trim() }))
    .filter((s) => s.text && s.bgPrompt)
    .slice(0, 8);

  // Fallback: use static suggested slides from template if LLM fails
  if (slides.length === 0) {
    const fallback = template.suggestedSlides.map((s) => ({
      text: s.text.replace(/\[(SERVICE_PROVIDER|PROFESSION|PRO|SERVICE|TRADE)\]/gi, niche),
      bgPrompt: `${niche} — ${s.bgPrompt}`,
    }));
    return { slides: fallback, costMicros: 0 };
  }

  return { slides, costMicros: SLIDE_GEN_COST_MICROS };
}

// ─── Guardrail check ──────────────────────────────────────────────────────────

const GUARDRAIL_SYSTEM = [
  'You check marketing slides for policy violations.',
  'Flag any slide that contains:',
  '  1. Specific claims (prices, percentages, revenue guarantees, review counts)',
  '  2. Competitor brand mentions by name',
  '  3. Price guarantees ("cheapest", "lowest price guaranteed")',
  '  4. Profanity',
  'Return JSON: { "warnings": [{ "type": "claim|competitor_mention|price_guarantee|profanity", "text": "...", "rule": "..." }] }',
  'Return { "warnings": [] } when there are no violations.',
].join('\n');

async function runGuardrailCheck(
  slides: Array<{ text: string }>,
): Promise<GuardrailWarning[]> {
  if (slides.length === 0) return [];

  const slideText = slides.map((s, i) => `${i + 1}. ${s.text}`).join('\n');
  const result = await chatJson<{ warnings?: unknown[] }>(
    [
      { role: 'system', content: GUARDRAIL_SYSTEM },
      { role: 'user', content: slideText },
    ],
    { maxTokens: 400, temperature: 0, timeoutMs: 15_000 },
  );

  const raw = Array.isArray(result?.warnings) ? result.warnings : [];
  return raw
    .filter((w): w is GuardrailWarning =>
      typeof w === 'object' && w !== null &&
      typeof (w as GuardrailWarning).type === 'string' &&
      typeof (w as GuardrailWarning).text === 'string' &&
      typeof (w as GuardrailWarning).rule === 'string',
    )
    .slice(0, 10);
}

// ─── Profile niche extraction ─────────────────────────────────────────────────

function extractNiche(profileData: Record<string, unknown>): string {
  const positioning = profileData.positioning as { promoting?: { value?: string } } | undefined;
  const classification = profileData.classification as { vertical?: { value?: string } } | undefined;
  const niche =
    positioning?.promoting?.value?.trim() ||
    classification?.vertical?.value?.replace(/_/g, ' ').trim() ||
    'small business';
  return niche.slice(0, 80);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export type GenerateInput = {
  runId: string;
  profileVersion: number;
};

export type GenerateResult = {
  candidates: number;
  telemetry: {
    slideText: StageMetrics;
    guardrails: StageMetrics;
    totalDurationMs: number;
    totalCostUsdMicros: number;
  };
};

const MAX_ITEMS_TO_GENERATE = 6;

export async function runGeneration(input: GenerateInput): Promise<GenerateResult> {
  const run = await prisma.studioRun.findUnique({
    where: { id: input.runId },
    include: { brandProfile: true },
  });
  if (!run) throw new Error(`Studio run ${input.runId} not found`);

  const profileData = run.brandProfile.data as Record<string, unknown>;
  const niche = extractNiche(profileData);

  // Load research items that have a matched template
  const items = await prisma.studioResearchItem.findMany({
    where: { runId: input.runId, excluded: false, templateId: { not: null } },
    orderBy: { createdAt: 'asc' },
    take: MAX_ITEMS_TO_GENERATE,
  });

  // Load all active templates once
  const allTemplates = await listTemplates({ status: 'active' });
  const templateMap = new Map<string, TemplateDto>(allTemplates.map((t) => [t.id, t]));

  const slideTextStart = Date.now();
  let totalSlideTextCost = 0;
  let candidatesCreated = 0;

  const guardrailStart_ref = { value: 0 };

  for (const item of items) {
    const template = item.templateId ? templateMap.get(item.templateId) : null;
    if (!template) continue;

    const { slides, costMicros } = await generateSlideText(
      niche,
      template,
      item.hook ?? '',
      item.transcript ?? '',
    );
    totalSlideTextCost += costMicros;

    if (slides.length === 0) continue;

    // Guardrail pass
    if (guardrailStart_ref.value === 0) guardrailStart_ref.value = Date.now();
    const guardrailWarnings = await runGuardrailCheck(slides);

    const durationSeconds = slides.length * PER_SLIDE_SECONDS;

    const payload: SlideshowPayload = {
      slides: slides.map((s) => ({
        text: s.text,
        bgPrompt: s.bgPrompt,
        // backgroundUrl is null until accept triggers image generation
        backgroundUrl: '',
        backgroundIsImage: true,
      })),
      compositionId: 'Slideshow',
      durationSeconds,
      perSlideSeconds: PER_SLIDE_SECONDS,
    };

    await prisma.studioCandidate.create({
      data: {
        runId: input.runId,
        researchItemId: item.id,
        engine: 'blitz_slideshow',
        templateId: item.templateId,
        angle: item.hook?.slice(0, 120) ?? null,
        payload: payload as unknown as object,
        costBreakdown: { slideTextUsdMicros: costMicros },
        costUsdMicros: BigInt(costMicros),
        profileVersion: input.profileVersion,
        guardrailWarnings: guardrailWarnings as unknown as object[],
      },
    });

    candidatesCreated++;
  }

  // Also generate one candidate per unused template (to ensure coverage)
  if (candidatesCreated < 3) {
    const usedTemplateIds = new Set(items.map((i) => i.templateId).filter(Boolean));
    const unusedTemplates = allTemplates.filter((t) => !usedTemplateIds.has(t.id)).slice(0, 3);

    for (const template of unusedTemplates) {
      if (candidatesCreated >= 8) break;

      const { slides, costMicros } = await generateSlideText(niche, template, '', '');
      totalSlideTextCost += costMicros;
      if (slides.length === 0) continue;

      const guardrailWarnings = await runGuardrailCheck(slides);
      const durationSeconds = slides.length * PER_SLIDE_SECONDS;
      const payload: SlideshowPayload = {
        slides: slides.map((s) => ({ text: s.text, bgPrompt: s.bgPrompt, backgroundUrl: '', backgroundIsImage: true })),
        compositionId: 'Slideshow',
        durationSeconds,
        perSlideSeconds: PER_SLIDE_SECONDS,
      };

      await prisma.studioCandidate.create({
        data: {
          runId: input.runId,
          researchItemId: null,
          engine: 'blitz_slideshow',
          templateId: template.id,
          angle: null,
          payload: payload as unknown as object,
          costBreakdown: { slideTextUsdMicros: costMicros },
          costUsdMicros: BigInt(costMicros),
          profileVersion: input.profileVersion,
          guardrailWarnings: guardrailWarnings as unknown as object[],
        },
      });

      candidatesCreated++;
    }
  }

  const totalDurationMs = Date.now() - slideTextStart;
  const guardrailDurationMs = guardrailStart_ref.value > 0 ? Date.now() - guardrailStart_ref.value : 0;

  return {
    candidates: candidatesCreated,
    telemetry: {
      slideText: { durationMs: totalDurationMs - guardrailDurationMs, costUsdMicros: totalSlideTextCost },
      guardrails: { durationMs: guardrailDurationMs, costUsdMicros: 0 },
      totalDurationMs,
      totalCostUsdMicros: totalSlideTextCost,
    },
  };
}
