/**
 * The official app store badges a CTA slide can show under its text: Apple's "Download on the App Store" and Google's
 * "Get it on Google Play". Plain data, so the campaign editor's preview and the slide render share the sizes.
 */

export type StoreBadge = 'ios' | 'android';

/** In the order they sit in their row (one line when both are on). `ratio`: width / height of the artwork. */
export const STORE_BADGES: { id: StoreBadge; label: string; src: string; alt: string; ratio: number }[] = [
  { id: 'ios', label: 'App Store badge (iOS)', src: '/images/store-badges/app-store.svg', alt: 'Download on the App Store', ratio: 135 / 40 },
  { id: 'android', label: 'Google Play badge (Android)', src: '/images/store-badges/google-play.svg', alt: 'Get it on Google Play', ratio: 180 / 53.333 },
];

/** Badge row sizes in slide px (1080 wide): each badge's height and the space between badges. */
export const BADGE_ROW = { height: 104, gap: 20 };

/** The badge row's height as a share of the 1920 px slide. */
const ROW_SHARE = BADGE_ROW.height / 1920;

/**
 * Where the badge row's top sits before it is moved, as a share of the slide's height: just under the CTA's usual
 * headline. The row moves on its own (up and down, always centered), apart from the text.
 */
export const HOME_BADGES_Y = 0.4;

/** A badge row top kept inside the slide. */
export const clampBadgesY = (y: number): number => Math.min(Math.max(y, 0), 1 - ROW_SHARE);

/** A row position a client sent, rounded to 0.1%; undefined when it is not one. */
export const parseBadgesAt = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? Math.round(clampBadgesY(v) * 1000) / 1000 : undefined;

export const isStoreBadge = (v: unknown): v is StoreBadge => STORE_BADGES.some((b) => b.id === v);

/** The badges a client sent, in row order, each once; undefined when none (so older drafts keep their render key). */
export const parseStoreBadges = (v: unknown): StoreBadge[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const picked = STORE_BADGES.filter((b) => v.includes(b.id)).map((b) => b.id);
  return picked.length > 0 ? picked : undefined;
};

/** The badges in row order with their size in slide px. */
export const badgeRow = (badges: StoreBadge[] | undefined) =>
  STORE_BADGES.filter((b) => badges?.includes(b.id)).map((b) => ({ ...b, width: Math.round(BADGE_ROW.height * b.ratio), height: BADGE_ROW.height }));

/** The row's width in slide px (0 without badges). */
export const badgeRowWidth = (badges: StoreBadge[] | undefined): number => {
  const row = badgeRow(badges);
  return row.reduce((sum, b) => sum + b.width, 0) + Math.max(0, row.length - 1) * BADGE_ROW.gap;
};
