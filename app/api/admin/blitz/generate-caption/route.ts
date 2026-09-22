import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { chatJson, type ChatMessage } from '../../../../../src/server/ai/openai';

type GenerateCaptionBody = {
  captionText?: string;
  mentionBusiness?: boolean;
  businessText?: string;
  regenPrompt?: string;
};

const SYSTEM_PROMPT =
  'You write short, punchy captions for real-estate TikTok and Reels videos. ' +
  'Sound like a real person talking — simple words, contractions, short sentences. ' +
  'No hashtags, no emojis. Never invent prices, numbers, addresses or facts not in the input. ' +
  'Return JSON only: { "caption": "..." }';

const buildPrompt = (body: GenerateCaptionBody): string => {
  const parts: string[] = [];
  if (body.captionText?.trim()) {
    parts.push(`Current caption: "${body.captionText.trim()}"`);
  }
  if (body.mentionBusiness) {
    const business = body.businessText?.trim().slice(0, 120);
    parts.push(business
      ? `The caption should naturally invite viewers to contact this business: "${business}".`
      : 'The caption should naturally mention or invite viewers to contact the business / agent.');
  }
  if (body.regenPrompt?.trim()) {
    parts.push(`Additional instruction: ${body.regenPrompt.trim()}`);
  }
  parts.push('Write a new caption (1–3 short sentences) that improves on the current one.');
  return parts.join('\n');
};

/**
 * POST /api/admin/blitz/generate-caption
 * Body: { captionText?, mentionBusiness?, businessText?, regenPrompt? }
 * Returns: { caption: string }
 *
 * Updates only the live preview caption — does NOT trigger a render.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as GenerateCaptionBody;

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildPrompt(body) },
  ];

  const result = await chatJson<{ caption?: string }>(messages, {
    maxTokens: 200,
    temperature: 0.8,
    timeoutMs: 20_000,
  });

  const caption = result?.caption?.trim();
  if (!caption) {
    return NextResponse.json({ error: 'Caption generation failed' }, { status: 502 });
  }

  return NextResponse.json({ caption });
});
