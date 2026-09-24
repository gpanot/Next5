// server-only — never import from a 'use client' file.
/**
 * Workspace scoping for lab storage keys.
 *
 * A lab row is owned either by Next5 (`workspaceId === null`, which is every row the admin tabs
 * have ever written) or by one workspace. The two must not share a folder in R2, or one
 * business's uploads would be one guessed key away from another's.
 *
 * Next5-owned keys keep the historical flat layout so nothing already in the bucket moves.
 * A workspace's files go under `w/<workspaceId>/` instead.
 */

/** The prefix every workspace-owned key starts with. Next5-owned keys never start with it. */
export const WORKSPACE_KEY_PREFIX = 'w/';

export type LabScope = string | null;

/** Where a key lives for this owner. */
export const scopedKey = (scope: LabScope, key: string): string =>
  scope ? `${WORKSPACE_KEY_PREFIX}${scope}/${key}` : key;

/** The key without its owner prefix, so path checks work on both layouts. */
export const unscopedKey = (key: string): string =>
  key.startsWith(WORKSPACE_KEY_PREFIX) ? key.replace(/^w\/[^/]+\//, '') : key;

/** True when this owner is allowed to read and write this key. */
export const keyInScope = (scope: LabScope, key: string): boolean =>
  scope ? key.startsWith(`${WORKSPACE_KEY_PREFIX}${scope}/`) : !key.startsWith(WORKSPACE_KEY_PREFIX);
