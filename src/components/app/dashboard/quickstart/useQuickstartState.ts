'use client';

import { quickstartStore } from '../../../../lib/localStore';

type SavedState = {
  workspaceId: string | null;
  step2Done: boolean;
  step3Done: boolean;
  dismissed: boolean;
};

const EMPTY: SavedState = { workspaceId: null, step2Done: false, step3Done: false, dismissed: false };

const parseState = (raw: string | null | undefined): SavedState => {
  if (!raw) return EMPTY;
  try {
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<SavedState>) };
  } catch {
    return EMPTY;
  }
};

/** Quickstart progress kept in this browser, reset when the workspace changes. */
export const useQuickstartState = (workspaceId: string | null) => {
  const parsed = parseState(quickstartStore.useValue());
  const saved: SavedState =
    parsed.workspaceId !== null && parsed.workspaceId !== workspaceId ? { ...EMPTY, workspaceId } : { ...parsed, workspaceId };
  const save = (patch: Partial<Omit<SavedState, 'workspaceId'>>) =>
    quickstartStore.set(JSON.stringify({ ...saved, ...patch, workspaceId }));
  return { saved, save };
};
