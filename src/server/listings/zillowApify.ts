// server-only — never import from a 'use client' file.
// Apify Zillow detail scraper: one home link → listing facts and its photo gallery (spike P21.0).

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { APIFY_API, ApifyError, apifyCall, getApifyDataset, getApifyRun, webhooksParam, type ApifyRow, type RunState } from '../apify/client';
import { HttpError } from '../http';

const actor = (): string => process.env.APIFY_ZILLOW_ACTOR ?? 'maxcopell~zillow-detail-scraper';
const MOCK_PREFIX = 'mock-zillow-';

/** Replays the spike fixtures instead of calling Apify (local dev, tests, no credit spent). */
export const isZillowImportMock = (): boolean =>
  process.env.NEXT5_ZILLOW_IMPORT_MOCK === 'true' || (!process.env.APIFY_TOKEN && process.env.NODE_ENV !== 'production');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Starts an async run for one home. The account runs about 4 actors at once; past that Apify answers 402,
 * so we retry briefly before telling her to try again.
 */
export const startZillowRun = async (url: string, zpid: string, webhookUrl: string | null): Promise<{ runId: string }> => {
  if (isZillowImportMock()) return { runId: `${MOCK_PREFIX}${zpid}` };
  const body = { startUrls: [{ url }], propertyStatus: 'FOR_SALE' };
  for (let attempt = 0; ; attempt += 1) {
    try {
      const { data } = await apifyCall<{ data: { id: string } }>(`${APIFY_API}/acts/${actor()}/runs?timeout=180${webhooksParam(webhookUrl)}`, { method: 'POST', body: JSON.stringify(body) });
      return { runId: data.id };
    } catch (err) {
      if (!(err instanceof ApifyError) || err.status !== 402) throw err;
      if (attempt >= 2) throw new HttpError(503, 'import_busy', 'Zillow imports are busy right now. Try again in a minute.');
      await wait(1500);
    }
  }
};

export const getZillowRun = async (runId: string): Promise<RunState> =>
  runId.startsWith(MOCK_PREFIX) ? { status: 'succeeded', datasetId: runId, message: null } : getApifyRun(runId);

/** Mock datasets answer with the fixture for that zpid, or the first fixture wearing that zpid. */
export const getZillowRows = async (datasetId: string): Promise<ApifyRow[]> => {
  if (!datasetId.startsWith(MOCK_PREFIX)) return getApifyDataset(datasetId);
  const zpid = datasetId.slice(MOCK_PREFIX.length);
  const file = path.join(/*turbopackIgnore: true*/ process.cwd(), 'tests', 'fixtures', 'zillow', 'detail-rows.json');
  const rows = JSON.parse(await readFile(file, 'utf8')) as ApifyRow[];
  const row = rows.find((r) => String(r.zpid) === zpid) ?? { ...rows[0], zpid: Number(zpid) };
  return [row];
};
