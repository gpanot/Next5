// In Next.js, images live in /public and are served via static paths.
// No Vite asset imports needed — just reference the /public paths directly.

export const heroPhoto = '/hero.jpg';

export const routeIds = [
  'golden-saigon',
  'soft-girl-saigon',
  'night-out',
  'luxury-saigon',
  'outfit-shoot',
] as const;

export type RouteId = (typeof routeIds)[number];

export const routePhotos: Record<RouteId, string> = {
  'golden-saigon': '/card-1.jpg',
  'soft-girl-saigon': '/card-2.jpg',
  'night-out': '/card-4.jpg',
  'luxury-saigon': '/card-3.jpg',
  'outfit-shoot': '/card-5.jpg',
};
