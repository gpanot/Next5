import type { ProductLineDto } from '../types/business/me';

/** App URLs live under a studio: /app/brand/* (photos of you) and /app/shop/* (TikTok Shop). Settings stay shared. */
export const isStudio = (value: unknown): value is ProductLineDto => value === 'brand' || value === 'shop';

export const studioHref = (studio: ProductLineDto, path = ''): string => `/app/${studio}${path === '/' ? '' : path}`;

export const STUDIO_LABEL: Record<ProductLineDto, string> = { brand: 'Brand Studio', shop: 'Shop Studio' };

/** `/app/create?x=1` → `/app/shop/create?x=1`. Leaves shared and already-scoped paths alone. */
export const scopeAppPath = (path: string, studio: ProductLineDto): string => {
  const match = path.match(/^\/app(\/[^?#]*)?([?#].*)?$/);
  if (!match) return path;
  const rest = match[1] ?? '';
  const first = rest.split('/')[1] ?? '';
  if (isStudio(first) || first === 'settings') return path;
  return `${studioHref(studio, rest)}${match[2] ?? ''}`;
};
