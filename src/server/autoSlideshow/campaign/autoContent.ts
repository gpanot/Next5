// server-only — never import from a 'use client' file.
// The Content tab's "Auto": writes the campaign's content slides from the person's prompt, in the hook lines' context
// (every slideshow of the campaign shares these slides, so they must deliver what each hook promises). With research on,
// a web search first gathers facts and numbers the slides may use. Photos are made afterwards, one call per slide
// (autoPhoto in photos.ts), so the editor shows each one as it lands.

import {
  AUTO_FORMATS,
  AUTO_LENGTH_WORDS,
  AUTO_LENGTHS,
  AUTO_MAX_SLIDES,
  AUTO_MIN_SLIDES,
  AUTO_TONES,
  autoSlideCount,
  MAX_AUTO_PROMPT_CHARS,
  MAX_CARD_TITLE_CHARS,
  type AutoContentDto,
  type AutoContentRequest,
  type AutoFormat,
} from '../../../types/admin/slideshowCampaign';
import { HttpError } from '../../http';
import { metaAdsJson } from '../../metaAds/llm';
import { clip } from '../../metaAds/text';

const TONES: Record<AutoContentRequest['tone'], string> = {
  plain: 'plain and clear, like a friend explaining',
  punchy: 'short, bold and direct, every word earns its place',
  expert: 'confident and precise, like a coach who knows the details',
  warm: 'kind and encouraging, like a friend who wants them to win',
};

const SYSTEM = `You write the content slides of a TikTok photo slideshow. The hook slide is already written; your slides
come right after it and must deliver exactly what the hook promises. Simple words a 10-year-old can read.
- {COUNT} One idea per slide, no repeats, in a logical order.
- Each slide is ONE headline of {MIN}-{MAX} words. No line under it. Do not number the slides.
- Tone: {TONE}.
- Every point must be true and useful. Use numbers only when they are well known facts or come from the research notes.
  Never invent studies, statistics or percentages.
- Every hook line below opens its own slideshow with these same slides, so the slides must fit all of them.
- scenes: for each slide, one sentence describing a real-looking background photo that shows the slide's subject.
  Bright daytime light, natural framing, seen from the side or behind. Never night, dusk or moody light. No text, no close-up faces.
- queries: for each slide, a 2-4 word stock photo search for that background (concrete things, not ideas).
- cover_scene and cover_query: one photo that fits every slide at once.
Return JSON: {"titles":[string],"scenes":[string],"queries":[string],"cover_scene":string,"cover_query":string}`;

/** The slides as written; the stock photo matches are added after (stockMatch.ts). */
export type WrittenContent = Omit<AutoContentDto, 'libraryRefs' | 'coverRef'>;

type Raw = { titles?: unknown; scenes?: unknown; queries?: unknown; cover_scene?: unknown; cover_query?: unknown };

const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

/** The request a client sent, cleaned. Needs a prompt or at least one hook line. */
export const parseAutoRequest = (value: unknown): AutoContentRequest => {
  const r = (value ?? {}) as Record<string, unknown>;
  return {
    prompt: typeof r.prompt === 'string' ? r.prompt.trim().slice(0, MAX_AUTO_PROMPT_CHARS) : '',
    format: oneOf(AUTO_FORMATS, r.format, 'plain'),
    length: oneOf(AUTO_LENGTHS, r.length, 'medium'),
    tone: oneOf(AUTO_TONES, r.tone, 'plain'),
    research: r.research === true,
    samePhoto: r.samePhoto === true,
    photoSource: r.photoSource === 'stock' ? 'stock' : 'ai',
  };
};

/** "1. …" or "Step 1: …" in front of each headline; the model writes them bare so the numbers are always right. */
const numbered = (titles: string[], format: AutoFormat): string[] =>
  format === 'plain' ? titles : titles.map((t, i) => (format === 'numbered' ? `${i + 1}. ${t}` : `Step ${i + 1}: ${t}`));

const strings = (v: unknown, max: number): string[] => (Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? clip(x.replace(/\s+/g, ' ').trim(), max) : '')) : []);

/** The model behind "Search the web" (the user's pick, 2026-10-11): it supports the web_search tool. */
const RESEARCH_MODEL = 'gpt-6.1-sol';

/** Facts and numbers about the topic from a web search (OpenAI Responses API, web_search tool). */
const research = async (topic: string): Promise<string> => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new HttpError(503, 'research_unavailable', 'Web search is not set up. Turn Research off.');
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    signal: AbortSignal.timeout(90_000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.CAMPAIGN_RESEARCH_MODEL ?? RESEARCH_MODEL,
      tools: [{ type: 'web_search' }],
      input: `Search the web and list 8-12 short, accurate facts with numbers (and their source site) for TikTok slides about: ${topic}`,
    }),
  });
  if (!res.ok) throw new HttpError(502, 'research_failed', 'Web search failed. Try again, or turn Research off.');
  const data = (await res.json()) as { output?: { type?: string; content?: { type?: string; text?: string }[] }[] };
  const text = (data.output ?? []).flatMap((o) => (o.type === 'message' ? (o.content ?? []) : [])).map((c) => (c.type === 'output_text' ? c.text ?? '' : '')).join('\n');
  return clip(text.trim(), 6_000);
};

const brief = (req: AutoContentRequest, hooks: string[], notes: string) =>
  [
    `Hook lines: ${hooks.length ? hooks.map((h) => `"${h}"`).join(' · ') : '(none yet)'}`,
    `What the slides are about: ${req.prompt || '(follow the hook lines)'}`,
    notes && `Research notes:\n${notes}`,
  ].filter(Boolean).join('\n');

/** The count rule for the prompt: the hook's number, else the writer picks within the range (and what the balance covers). */
const countRule = (fixed: number | null, max: number): string =>
  fixed !== null
    ? `Write exactly ${fixed} slides: the hook promises ${fixed}.`
    : `Decide how many slides the topic needs, between ${AUTO_MIN_SLIDES} and ${max}: enough to deliver the hook, no filler.`;

/**
 * Writes the content slides. Their count: the number the first hook promises (3-15), else the writer's pick between 3
 * and `maxSlides` (15, or fewer when the balance covers fewer). A count outside the rule is retried with the reason.
 */
export const writeAutoContent = async (req: AutoContentRequest, hooks: string[], maxSlides = AUTO_MAX_SLIDES): Promise<WrittenContent> => {
  if (!req.prompt && hooks.length === 0) throw new HttpError(400, 'auto_empty', 'Say what the slides are about, or add a hook first.');
  const notes = req.research ? await research(`${req.prompt} ${hooks.join(' / ')}`.trim()) : '';
  const [min, max] = AUTO_LENGTH_WORDS[req.length];
  const fixed = autoSlideCount(hooks);
  const most = Math.max(AUTO_MIN_SLIDES, Math.min(AUTO_MAX_SLIDES, maxSlides));
  const system = SYSTEM.replace('{COUNT}', countRule(fixed, most)).replace('{MIN}', String(min)).replace('{MAX}', String(max)).replace('{TONE}', TONES[req.tone]);
  let problem = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const raw = await metaAdsJson<Raw>(
      [
        { role: 'system', content: system },
        { role: 'user', content: brief(req, hooks, notes) + (problem ? `\n\nYour last answer was rejected: ${problem}. Fix it.` : '') },
      ],
      { maxTokens: 4_000, label: 'OpenAI campaign auto content' },
    );
    const titles = strings(raw.titles, MAX_CARD_TITLE_CHARS - 9).filter(Boolean);
    if (fixed !== null ? titles.length !== fixed : titles.length < AUTO_MIN_SLIDES || titles.length > most) {
      problem = `${titles.length} titles; ${fixed !== null ? `write exactly ${fixed}` : `write ${AUTO_MIN_SLIDES} to ${most}`}`;
      continue;
    }
    const scenes = strings(raw.scenes, 400);
    const queries = strings(raw.queries, 80);
    const coverScene = strings([raw.cover_scene], 400)[0] || scenes[0] || titles[0]!;
    const coverQuery = strings([raw.cover_query], 80)[0] || queries[0] || req.prompt.slice(0, 60);
    return {
      titles: numbered(titles, req.format),
      scenes: titles.map((t, i) => scenes[i] || t),
      queries: titles.map((t, i) => queries[i] || coverQuery || t),
      coverScene,
      coverQuery,
    };
  }
  throw new HttpError(502, 'auto_failed', 'Could not write the slides. Try again.');
};
