'use client';

import type { SlideshowWorkspaceDto } from '../../../../types/admin/autoSlideshow';
import { adminFetch } from '../../business/useAdminApi';

/** "https://www.acme.com/shop" or "acme.com" → "acme.com"; null when it is not a website. */
const hostOf = (site: string): string | null => {
  try {
    return new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
};

/** Starts a workspace's first run and returns the page to open. A run that cannot start (daily limit) still opens the workspace. */
export const startFirstRun = async (token: string, ws: SlideshowWorkspaceDto, site: string): Promise<string> => {
  try {
    const { runId } = await adminFetch<{ runId: string }>(token, '/api/admin/auto-slideshow/runs', { method: 'POST', body: JSON.stringify({ url: site, count: 1, workspaceId: ws.id }) });
    return `/slideshow/${ws.id}?run=${runId}`;
  } catch {
    return `/slideshow/${ws.id}`;
  }
};

/**
 * The website typed on the home page, after sign-in: reuses the workspace for that site (or creates it), then starts
 * its first run. Returns the page to open. A run that cannot start (daily limit) still opens the workspace.
 */
export const startPendingSite = async (token: string, site: string, workspaces: SlideshowWorkspaceDto[]): Promise<string> => {
  const host = hostOf(site);
  const existing = workspaces.find((w) => w.websiteUrl && hostOf(w.websiteUrl) === host);
  const ws = existing ?? (await adminFetch<{ workspace: SlideshowWorkspaceDto }>(token, '/api/slideshow/workspaces', { method: 'POST', body: JSON.stringify({ websiteUrl: site }) })).workspace;
  return startFirstRun(token, ws, site);
};
