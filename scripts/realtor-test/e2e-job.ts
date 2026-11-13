/** E2E without the browser: create the two rows for a Zillow listing and run the app prep; the worker renders. */
import { prisma } from '../../src/lib/db';
import { prepareListingVideos, LISTING_VIDEO_PRESETS } from '../../src/server/realtorVideo/jobs';

const main = async () => {
  const listing = await prisma.listing.findFirst({ where: { source: 'zillow', archivedAt: null, priceCents: { not: null } }, include: { materials: true }, orderBy: { createdAt: 'desc' } });
  if (!listing) throw new Error('No Zillow listing in the DB');
  console.log('listing', listing.id, listing.label, (listing.candidates as unknown[] | null)?.length);
  const rows = await Promise.all(LISTING_VIDEO_PRESETS.map((preset) => prisma.listingVideo.create({ data: { workspaceId: listing.workspaceId, listingId: listing.id, preset } })));
  await prepareListingVideos(listing, rows);
  console.log(await prisma.listingVideo.findMany({ where: { id: { in: rows.map((r) => r.id) } }, select: { id: true, preset: true, status: true, error: true, durationS: true, costUsdMicros: true } }));
  await prisma.$disconnect();
};
void main();
