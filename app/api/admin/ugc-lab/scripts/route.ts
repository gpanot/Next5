import { NextResponse, type NextRequest } from 'next/server';
import {
  UGC_DURATIONS, UGC_MAX_WORDS, UGC_TARGET_WORDS, countWords, isUgcDuration,
  type UgcDuration, type UgcScene,
} from '../../../../../src/config/ugcLab';
import { adminRoute } from '../../../../../src/server/admin/route';
import { chatJson, type ChatMessage } from '../../../../../src/server/ai/openai';
import { buildContextBrief } from '../../../../../src/server/admin/ugcContextBrief';

export type GeneratedScript = { duration: UgcDuration; text: string; words: number };

const SYSTEM_PROMPT =
  'You write short spoken scripts for TikTok and Reels talking-head videos. ' +
  'Sound like a real person talking, not an ad: simple words, contractions, short sentences. No hashtags, no emojis. ' +
  'Every script starts with the given hook (you may tighten its wording), then pays off its promise. ' +
  'Never invent prices, numbers, names or facts that are not in the input. ' +
  'Word limits are hard limits — a script that is too long gets cut off mid-sentence in the video. ' +
  'Return JSON only: { "scripts": [ { "duration": 8, "text": "..." }, { "duration": 16, "text": "..." }, { "duration": 24, "text": "..." } ] }';

const brief = (hook: string, scene: UgcScene | null): string => {
  const place = scene
    ? `The speaker: ${scene.person}. They are in ${scene.setting}, ${scene.action}. The script can mention this place naturally.`
    : 'The speaker is the person in the photo.';
  const lengths = UGC_DURATIONS.map((d) => `- ${d}s: about ${UGC_TARGET_WORDS[d]} words, never more than ${UGC_MAX_WORDS[d]}`).join('\n');
  return `${place}\n\nHook: "${hook}"\n\nWrite 3 scripts:\n${lengths}\n8s = hook + one punchy line. 16s = hook + short explanation + call to action. 24s = hook + explanation + example + call to action.`;
};

const parseScripts = (value: unknown): Map<UgcDuration, string> => {
  const scripts = new Map<UgcDuration, string>();
  const list = (value as { scripts?: unknown } | null)?.scripts;
  if (!Array.isArray(list)) return scripts;
  for (const item of list as { duration?: unknown; text?: unknown }[]) {
    if (isUgcDuration(item.duration) && typeof item.text === 'string' && item.text.trim()) {
      scripts.set(item.duration, item.text.trim());
    }
  }
  return scripts;
};

/** Cuts a script back to the word limit, ending on the last full sentence when there is one. */
const trimToWords =(text: string, max: number): string => {
  const words = text.trim().split(/\s+/);
  if (words.length <= max) return text.trim();
  const cut = words.slice(0, max).join(' ');
  const lastStop = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
  return lastStop > cut.length / 2 ? cut.slice(0, lastStop + 1) : `${cut.replace(/[,;:]$/, '')}.`;
};

const tooLong = (scripts: Map<UgcDuration, string>): UgcDuration[] =>
  UGC_DURATIONS.filter((d) => countWords(scripts.get(d) ?? '') > UGC_MAX_WORDS[d]);

const ask = async (messages: ChatMessage[]) =>
  parseScripts(await chatJson<unknown>(messages, { maxTokens: 700, temperature: 0.7, timeoutMs: 30_000 }));

// ── Suggested video context (niche-aware scene description for Seedance / Wan3 prompt) ──

const generateSuggestedContext = async (
  hook: string,
  scene: UgcScene | null,
  industry: string,
): Promise<string | null> => {
  // Skip when there is nothing niche-specific to improve on.
  if (!industry.trim() && !scene) return null;
  try {
    const brief = buildContextBrief({ hook, industry, scene });
    const result = await chatJson<{ context?: string }>(
      [
        {
          role: 'system',
          content:
            'You write concise 3-sentence scene descriptions for Seedance and Wan 3.0 AI video generation prompts. ' +
            'You adapt the scene to the creator\'s niche while preserving their identity from the reference photo. ' +
            'Never include spoken dialogue, delivery notes, subtitles, or post-production rules.',
        },
        { role: 'user', content: brief },
      ],
      { maxTokens: 250, temperature: 0.65, timeoutMs: 15_000 },
    );
    const ctx = typeof result?.context === 'string' ? result.context.trim() : null;
    return ctx || null;
  } catch {
    return null;
  }
};

/** POST { hook, scene?, industry? } → 8 s, 16 s and 24 s scripts + optional suggestedVideoContext. */
export const POST = adminRoute(async (req: NextRequest) => {
  const { hook, scene = null, industry = '' } = (await req.json()) as {
    hook?: string;
    scene?: UgcScene | null;
    industry?: string;
  };
  if (!hook?.trim()) {
    return NextResponse.json({ error: 'hook is required' }, { status: 400 });
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: brief(hook.trim(), scene) },
  ];

  // Run script generation and video context suggestion in parallel.
  const [scriptsResult, suggestedVideoContext] = await Promise.all([
    ask(messages),
    generateSuggestedContext(hook.trim(), scene, industry),
  ]);
  let scripts = scriptsResult;

  // One retry when a script is over its limit, naming the counts so the model can fix them.
  const over = tooLong(scripts);
  if (over.length > 0) {
    const counts = over.map((d) => `${d}s has ${countWords(scripts.get(d) ?? '')} words (max ${UGC_MAX_WORDS[d]})`).join('; ');
    const retry = await ask([...messages, { role: 'user', content: `Too long: ${counts}. Rewrite all 3 within the limits.` }]);
    if (retry.size > 0) scripts = new Map([...scripts, ...retry]);
  }

  if (scripts.size === 0) {
    return NextResponse.json({ error: 'Script generation failed' }, { status: 502 });
  }

  const result: GeneratedScript[] = UGC_DURATIONS.map((duration) => {
    const text = trimToWords(scripts.get(duration) ?? '', UGC_MAX_WORDS[duration]);
    return { duration, text, words: countWords(text) };
  });
  return NextResponse.json({
    scripts: result,
    ...(suggestedVideoContext ? { suggestedVideoContext } : {}),
  });
});
