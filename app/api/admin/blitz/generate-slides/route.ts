import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { chatJson, type ChatMessage } from '../../../../../src/server/ai/openai';
import { getTemplateByLegacyId } from '../../../../../src/server/templates/repository';
import type { TemplateDto } from '../../../../../src/server/templates/dto';

type GenerateSlidesBody = {
  /** Niche the user searched for, e.g. "auto mechanic". */
  niche?: string;
  /** Phase 0A template id (1–18) whose structure the slides must follow. */
  templateId?: number;
  /** Opening hook of the source TikTok — grounds the copy in what already worked. */
  hook?: string;
  /** Transcript of the source TikTok, used for concrete details. */
  transcript?: string;
};

export type GeneratedSlide = { text: string; bgPrompt: string };

const SYSTEM_PROMPT = [
  'You write text-card slideshows for US small-business TikTok accounts.',
  '',
  'Copy rules:',
  '- Third-grade reading level. Short words, short sentences, contractions.',
  '- Each slide text is at most 14 words. It must be readable in under 2 seconds.',
  '- Write for the niche you are given. Use the words that niche\'s real customers use.',
  '- Never invent prices, percentages, review counts, years in business, or any other number.',
  '- Leave no [BRACKETS] and no placeholders. Every slide must be ready to post as-is.',
  '- The one exception: write the literal token [BUSINESS_NAME] where the business name belongs.',
  '- No hashtags. At most one emoji across the whole slideshow.',
  '',
  'Background image prompt rules (bgPrompt):',
  '- One prompt per slide, for a text-to-image model.',
  '- Describe a real photograph of that niche that matches that slide\'s message.',
  '- Include subject, setting, lighting and mood. End with "9:16 vertical, no text".',
  '- Never ask for text, logos, watermarks or brand names in the image.',
  '',
  'Return JSON only: { "slides": [ { "text": "...", "bgPrompt": "..." } ] }',
].join('\n');

const buildPrompt = (niche: string, template: TemplateDto, hook: string, transcript: string): string => {
  const parts = [
    `Niche: ${niche}`,
    '',
    `Template: ${template.name} (${template.pillarName})`,
    `Hook pattern: ${template.hookPattern}`,
    `Structure (one slide per step, in order):`,
    ...template.beats.map((beat, i) => `  ${i + 1}. ${beat.label}${beat.guidance ? `: ${beat.guidance}` : ''}`),
  ];

  if (hook.trim()) {
    parts.push('', `The source video opened with: "${hook.trim().slice(0, 300)}"`);
  }
  if (transcript.trim()) {
    parts.push(
      '',
      'Transcript of the source video — mine it for concrete, niche-specific details:',
      transcript.trim().slice(0, 1200),
    );
  }

  parts.push(
    '',
    `Write exactly ${template.beats.length} slides for a ${niche} business, one per structure step.`,
    'Slide 1 is the hook and follows the hook pattern above, rewritten for this niche.',
    'The last slide is the call to action.',
  );
  return parts.join('\n');
};

/**
 * Fallback when the LLM is unavailable: swap the generic placeholders in the
 * static template for the niche so the user still sees something usable.
 */
const localiseFallback = (template: TemplateDto, niche: string): GeneratedSlide[] => {
  const swap = (s: string) =>
    s
      .replace(/\[(SERVICE_PROVIDER|PROFESSION|PRO|SERVICE|TRADE)\]/gi, niche)
      .replace(/\[(CUSTOMERS|AUDIENCE)\]/gi, `${niche} customers`);
  return template.suggestedSlides.map((s) => ({
    text: swap(s.text),
    bgPrompt: `${niche} — ${s.bgPrompt}`,
  }));
};

const isSlide = (v: unknown): v is GeneratedSlide =>
  typeof v === 'object' && v !== null
  && typeof (v as GeneratedSlide).text === 'string'
  && typeof (v as GeneratedSlide).bgPrompt === 'string';

// Transcript-grounded generation for up to 5 slides can pass the 15 s default.
export const maxDuration = 60;

/**
 * POST /api/admin/blitz/generate-slides
 * Body: { niche, templateId, hook?, transcript? }
 * Returns: { slides: [{ text, bgPrompt }], generated: boolean }
 *
 * `generated: false` means the LLM was unavailable and the caller is looking at
 * the localised static template, not fresh copy.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as GenerateSlidesBody;
  const niche = body.niche?.trim();

  if (!niche) {
    return NextResponse.json({ error: 'niche is required' }, { status: 400 });
  }

  // templateId is the Phase 0A number (1–18); the library now lives in the database.
  const template = typeof body.templateId === 'number' ? await getTemplateByLegacyId(body.templateId) : null;
  if (!template) {
    return NextResponse.json({ error: 'Unknown templateId' }, { status: 400 });
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildPrompt(niche, template, body.hook ?? '', body.transcript ?? '') },
  ];

  const result = await chatJson<{ slides?: unknown }>(messages, {
    maxTokens: 900,
    temperature: 0.75,
    timeoutMs: 30_000,
  });

  const raw = Array.isArray(result?.slides) ? result.slides : [];
  const slides = raw
    .filter(isSlide)
    .map((s) => ({ text: s.text.trim(), bgPrompt: s.bgPrompt.trim() }))
    .filter((s) => s.text && s.bgPrompt)
    .slice(0, 10);

  if (slides.length === 0) {
    console.warn(`[blitz/generate-slides] LLM returned nothing for "${niche}" — serving localised fallback`);
    return NextResponse.json({ slides: localiseFallback(template, niche), generated: false });
  }

  return NextResponse.json({ slides, generated: true });
});
