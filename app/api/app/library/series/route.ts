import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { listSeries, type SeriesFilter } from '../../../../../src/server/generation/library';
import { presignObject } from '../../../../../src/server/storage/objectStore';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';
import type { LibrarySeriesDto } from '../../../../../src/types/business/batches';

const FILTERS: readonly SeriesFilter[] = ['all', 'property', 'theme'];

type SeriesRow = Awaited<ReturnType<typeof listSeries>>['batches'][number];

const categoryOf = (b: SeriesRow): Pick<LibrarySeriesDto, 'category' | 'categoryLabel'> => {
  if (b.listing) return { category: 'property', categoryLabel: `${b.listing.source === 'zillow' ? 'Zillow' : 'Property'} · ${b.listing.label}` };
  if (b.kind === 'trial') return { category: 'trial', categoryLabel: 'Free photos' };
  return { category: 'theme', categoryLabel: b.theme?.title ?? 'Theme' };
};

/** GET /api/app/library/series?filter=all|property|theme&cursor= — her photos grouped by series. */
export const GET = authedRoute(async (req, session) => {
  const p = new URL(req.url).searchParams;
  const ws = await requireWorkspace(session.userId, 'brand');
  const filter = FILTERS.find((f) => f === p.get('filter')) ?? 'all';
  const { batches, nextCursor } = await listSeries(ws.id, filter, p.get('cursor'));
  const series: LibrarySeriesDto[] = await Promise.all(
    batches.map(async (b) => ({
      id: b.id,
      name: b.name,
      ...categoryOf(b),
      coverUrl: b.items[0]?.r2Key ? await presignObject(b.items[0].r2Key) : null,
      photoCount: b.items.length,
      onCalendar: b.items.filter((i) => i._count.slots > 0).length,
      createdAt: b.createdAt.toISOString(),
    })),
  );
  return NextResponse.json({ series, nextCursor });
});
