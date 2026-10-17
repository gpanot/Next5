'use client';

/** In the URL while Add credits is open from the Brand Cast step: Stripe sends the browser back here, and the
 *  "How many slideshows?" step opens again with the same count and face. */
export const BRAND_CAST_PARAM = 'brandCast';
const CAST_PARAM = 'cast';

export type BrandCastResume = { count: number; castId: string | null };

export const readBrandCastResume = (): BrandCastResume | null => {
  if (typeof window === 'undefined') return null;
  const params = new URL(window.location.href).searchParams;
  const count = Number(params.get(BRAND_CAST_PARAM));
  if (!Number.isInteger(count) || count < 1) return null;
  return { count, castId: params.get(CAST_PARAM) };
};

const writeUrl = (edit: (params: URLSearchParams) => void) => {
  const url = new URL(window.location.href);
  edit(url.searchParams);
  window.history.replaceState(null, '', url.toString());
};

export const markBrandCastResume = ({ count, castId }: BrandCastResume) =>
  writeUrl((params) => {
    params.set(BRAND_CAST_PARAM, String(count));
    if (castId) params.set(CAST_PARAM, castId);
    else params.delete(CAST_PARAM);
  });

export const clearBrandCastResume = () =>
  writeUrl((params) => {
    params.delete(BRAND_CAST_PARAM);
    params.delete(CAST_PARAM);
  });

/** The campaigns page, opened on the "How many slideshows?" step with this face picked (from the Brand page). */
export const brandCastHref = (workspaceId: string, castId: string) =>
  `/slideshow/${workspaceId}/campaigns?${BRAND_CAST_PARAM}=1&${CAST_PARAM}=${encodeURIComponent(castId)}`;
