/**
 * Image manifest guard. Global rule: never reference an image path that isn't in
 * public/images/manifest.json. Use these helpers before rendering catalog images
 * whose files may not have been generated yet.
 */

import manifest from '../../public/images/manifest.json';

type ManifestEntry = { prompt: string; alt?: string; size?: string; outputSize?: string };

const entries = manifest as Record<string, ManifestEntry>;

const toKey = (publicPath: string): string => `public${publicPath.startsWith('/') ? '' : '/'}${publicPath}`;

/** True when `/images/...` exists in the manifest. */
export const hasManifestImage = (publicPath: string): boolean => toKey(publicPath) in entries;

/** The manifest alt text for an image, or the fallback. */
export const manifestAlt = (publicPath: string, fallback: string): string =>
  entries[toKey(publicPath)]?.alt ?? fallback;

/** The path when it exists in the manifest, otherwise null — render a non-photo fallback then. */
export const manifestImageOrNull = (publicPath: string): string | null =>
  hasManifestImage(publicPath) ? publicPath : null;
