import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import {
  tregCall,
  checkBudget,
  SEEDANCE_PROMPT_TEMPLATE,
} from '../../../../../src/server/admin/ugcLab';

type SeedanceTask = { id?: string; task_id?: string; status?: string };

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as {
    characterUrl?: string;
    hook?: string;
    duration?: number;
    confirmOverBudget?: boolean;
  };

  const { characterUrl, hook, duration = 8, confirmOverBudget = false } = body;

  if (!characterUrl) {
    return NextResponse.json({ error: 'characterUrl is required' }, { status: 400 });
  }
  if (!hook?.trim()) {
    return NextResponse.json({ error: 'hook is required' }, { status: 400 });
  }

  // Budget guard
  const budget = checkBudget(duration);
  if (!budget.ok && !confirmOverBudget) {
    return NextResponse.json(
      {
        error: 'budget_exceeded',
        estimated_cost_usd: budget.estimated_cost_usd,
        cap_usd: budget.cap_usd,
      },
      { status: 402 },
    );
  }

  const estimated_cost_usd = budget.estimated_cost_usd;

  // Submit Seedance 2.5 task via treg
  const task = await tregCall<SeedanceTask>(
    'reapi.video-gen.seedance-2-5.unrestricted',
    {
      method: 'POST',
      body: {
        model: 'doubao-seedance-2.5-face',
        content_filter: false,
        prompt: SEEDANCE_PROMPT_TEMPLATE(hook),
        duration,
        size: '9:16',
        resolution: '480p',
        image_urls: [characterUrl],
        generate_audio: true,
      },
      timeoutMs: 30_000,
    },
  );

  const task_id = task.id ?? task.task_id;
  if (!task_id) {
    return NextResponse.json({ error: 'Seedance returned no task ID' }, { status: 502 });
  }

  return NextResponse.json({ task_id, estimated_cost_usd });
});
