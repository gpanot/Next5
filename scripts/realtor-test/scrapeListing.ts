/** Cache miss: scrape one Zillow home with the Apify actor and store it like /api/admin/blitz/zillow-scrape does. */
import { prisma } from '../../src/lib/db';
import { parseZillowUrl } from '../../src/lib/listingPhotos';
import { APIFY_API, apifyCall, type ApifyRow } from '../../src/server/apify/client';
import { getZillowRun, getZillowRows, isZillowImportMock, startZillowRun } from '../../src/server/listings/zillowApify';
import { normalizeZillowRow } from '../../src/server/listings/zillowNormalize';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const rowsOf = async (runId: string): Promise<ApifyRow[]> => {
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    await wait(4_000);
    const r = await getZillowRun(runId);
    if (r.status === 'failed') throw new Error('Zillow scrape failed.');
    if (r.status === 'succeeded' && r.datasetId) {
      return isZillowImportMock() ? getZillowRows(r.datasetId) : apifyCall<ApifyRow[]>(`${APIFY_API}/datasets/${r.datasetId}/items?clean=1&format=json`);
    }
  }
  throw new Error('Zillow scrape timed out.');
};

export const scrapeListing = async (rawUrl: string) => {
  const link = parseZillowUrl(rawUrl);
  if (!link) throw new Error('Not a Zillow home link.');
  const { runId } = await startZillowRun(link.url, link.zpid, null);
  const listing = normalizeZillowRow((await rowsOf(runId))[0]);
  if (!listing) throw new Error('No data came back from Zillow.');
  const facts = {
    address: listing.address?.full ?? null,
    city: listing.address?.city ?? null,
    state: listing.address?.state ?? null,
    priceUsd: listing.priceCents !== null ? listing.priceCents / 100 : null,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft,
    status: listing.status,
    description: listing.description,
  };
  await prisma.blitzListingRun.create({
    data: { zillowUrl: link.url, zpid: link.zpid, address: facts.address, facts, candidates: listing.candidates as object, angles: [] },
  });
  return { facts, candidates: listing.candidates };
};
