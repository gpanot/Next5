import { NextResponse, type NextRequest } from 'next/server';
import type { UgcScene } from '../../../../../src/config/ugcLab';
import { adminRoute } from '../../../../../src/server/admin/route';
import { chatJson } from '../../../../../src/server/ai/openai';
import { buildContextBrief } from '../../../../../src/server/admin/ugcContextBrief';

/**
 * POST { hook, industry?, scene?, portraitJson? } → { context: string }
 *
 * Returns the 3-sentence scene-description portion of a Seedance / Wan 3.0 video prompt.
 * The scene is adapted to the niche (location, outfit, lighting) while keeping the
 * character's face/hair/skin from the reference photo.
 *
 * The caller (VideoPanel) wraps it with assemblePromptFromContext(context, script)
 * to produce the full prompt with lip-sync delivery rules.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const { hook, industry, scene, portraitJson } = (await req.json()) as {
    hook?: string;
    industry?: string;
    scene?: UgcScene | null;
    portraitJson?: Record<string, unknown> | null;
  };

  if (!hook?.trim()) {
    return NextResponse.json({ error: 'hook is required' }, { status: 400 });
  }

  const brief = buildContextBrief({
    hook: hook.trim(),
    industry,
    scene,
    portraitJson,
  });

  try {
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
      { model: 'gpt-4o-mini', maxTokens: 250, temperature: 0.65, timeoutMs: 15_000 },
    );

    const context = typeof result?.context === 'string' ? result.context.trim() : null;
    if (!context) {
      return NextResponse.json({ error: 'LLM returned no context' }, { status: 502 });
    }
    return NextResponse.json({ context });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Prompt suggestion failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
});
