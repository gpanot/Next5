import { NextRequest, NextResponse } from 'next/server';
import { pollTask } from '../../../../src/lib/wavespeed';

export type PollResponseBody = {
  status: string;
  url: string | null;
  error: string | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await params;
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
