'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { createLocalStore } from '../../../../lib/localStore';
import type { SlideshowWorkspaceDto } from '../../../../types/admin/autoSlideshow';

/** The workspace a signed-in user is in; null on the admin page (admins see every run). */
const CurrentWorkspace = createContext<SlideshowWorkspaceDto | null>(null);

export const WorkspaceProvider = ({ workspace, children }: { workspace: SlideshowWorkspaceDto; children: ReactNode }) => (
  <CurrentWorkspace.Provider value={workspace}>{children}</CurrentWorkspace.Provider>
);

export const useSlideshowWorkspace = (): SlideshowWorkspaceDto | null => useContext(CurrentWorkspace);

/** The public Auto Slideshow home page; every Auto Slideshow logo leads there. */
export const SLIDESHOW_HOME = '/slideshow';
/** Sign in, then into a workspace. The email link lands here too. */
export const SLIDESHOW_LOGIN = '/slideshow/login';

export const SLIDESHOW_PRICING = '/slideshow/pricing';

/** A website typed on the home page before signing in; after sign-in it becomes a workspace and its first run. */
export const pendingSiteStore = createLocalStore('slideshow-pending-site');

/** The workspace opened last, so signing in lands back there. */
export const lastWorkspaceStore = createLocalStore('slideshow-last-workspace');
