import { NextRequest, NextResponse } from 'next/server';
import { pollTask } from '../../../../src/lib/wavespeed';
import { isMockGeneration } from '../../../../src/lib/mock';
import { photoRoutes } from '../../../../src/data/routes';

export type PollResponseBody = {
  status: string;
  url: string | null;
  error: string | null;
};

const MOCK_PREFIX = 'mock-';
const MOCK_GENERATION_MS = 5000;

/** Reads back the studioId + start time `POST /api/preview` encoded into the
 *  taskId, so this stateless route can simulate a believable "processing"
 *  window before resolving to that studio's shot-1 placeholder image. */
const pollMockTask = (taskId: string): PollResponseBody => {
  const rest = taskId.slice(MOCK_PREFIX.length);
  const lastDash = rest.lastIndexOf('-');
  const studioId = rest.slice(0, lastDash);
  const startedAt = Number(rest.slice(lastDash + 1));

  if (Date.now() - startedAt < MOCK_GENERATION_MS) {
    return { status: 'processing', url: null, error: null };
  }

  const route = photoRoutes.find((r) => r.id === studioId) ?? photoRoutes[0];
  return { status: 'completed', url: route.shots[0].src, error: null };
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await params;

    if (isMockGeneration() || taskId.startsWith(MOCK_PREFIX)) {
      return NextResponse.json(pollMockTask(taskId));
    }

    const result = await pollTask(taskId);
    return NextResponse.json(result satisfies PollResponseBody);
  } catch (err) {
    console.error('[preview] GET poll error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Poll error', status: 'failed', url: null },
      { status: 500 },
    );
  }
}
