'use client';

import type { SlideshowWorkspaceDto } from '../../../../types/admin/autoSlideshow';

/**
 * The signed-in user's workspace list from the last visit on this device, so a reload opens the workspace at once
 * while the list is checked again in the background. Tied to the session (its last characters), never shown to
 * another account signed in on the same browser.
 */
const KEY = 'slideshow-workspaces-cache';

type Cached = { owner: string; workspaces: SlideshowWorkspaceDto[] };

const ownerOf = (token: string) => token.slice(-16);

export const readCachedWorkspaces = (token: string): SlideshowWorkspaceDto[] | null => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Cached;
    return cached.owner === ownerOf(token) && Array.isArray(cached.workspaces) ? cached.workspaces : null;
  } catch {
    return null;
  }
};

export const writeCachedWorkspaces = (token: string, workspaces: SlideshowWorkspaceDto[]) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ owner: ownerOf(token), workspaces } satisfies Cached));
  } catch {
    // storage blocked or full: the list just loads from the server next time
  }
};
