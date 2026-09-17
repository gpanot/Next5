import { timingSafeEqual } from 'node:crypto';
import { after, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/db';
import { refreshZillowImport } from '../../../../src/server/listings/zillowImport';
import { downloadPendingImages, refreshConnection } from '../../../../src/server/shopImport/service';

export const maxDuration = 60;

const validSecret = (given: string | null): boolean => {
  const secret = process.env.APIFY_WEBHOOK_SECRET;
  if (!secret || !given) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
};

/** Apify run finished → ingest the store catalog or the Zillow home. Idempotent (the run is claimed before ingest). */
export async function POST(req: Request): Promise<Response> {
  if (!validSecret(new URL(req.url).searchParams.get('secret'))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { resource?: { id?: string } };
  const runId = body.resource?.id;
  if (!runId) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  const listing = await prisma.listing.findFirst({ where: { runId } });
  if (listing) {
    after(() => refreshZillowImport(listing).then(() => undefined));
    return NextResponse.json({ ok: true });
  }
  const connection = await prisma.shopConnection.findFirst({ where: { runId } });
  if (!connection) return NextResponse.json({ ok: true, note: 'unknown_run' });
  after(async () => {
    const refreshed = await refreshConnection(connection);
    if (refreshed.status === 'ready') await downloadPendingImages(refreshed.workspaceId, 60);
  });
  return NextResponse.json({ ok: true });
}
