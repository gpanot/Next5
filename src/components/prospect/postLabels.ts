import type { ProspectKind, ProspectViewDay } from '../../types/admin/prospects';

/** What a post is, in plain words. */
export const KIND_LABEL: Record<ProspectKind, string> = { blitz: 'Video', cast: 'Slideshow', hooks: 'Slideshow' };

/** "Mon" in the viewer's time zone. */
export const weekday = (iso: string): string => new Date(iso).toLocaleDateString('en-US', { weekday: 'short' });

/** "Mon 19" for a card chip. */
export const chipDay = (iso: string): string => `${weekday(iso)} ${new Date(iso).getDate()}`;

/** "Mon, Oct 19". */
export const dayLabel = (iso: string): string => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/** "Oct 19". */
export const monthDay = (iso: string): string => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** "9:00 AM". */
export const postTime = (iso: string): string => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** The right chip: "0:28" for a video, "6 photos" for a slideshow. */
export const lengthLabel = (day: ProspectViewDay): string => {
  if (day.kind !== 'blitz') return `${day.slides.length} photos`;
  if (!day.durationSec) return 'Video';
  return `${Math.floor(day.durationSec / 60)}:${String(day.durationSec % 60).padStart(2, '0')}`;
};

/** Up to two initials of a business name: "Only Avenue" → "OA". */
export const initials = (name: string): string =>
  name
    .replace(/\.[a-z]{2,}$/i, '')
    .split(/[\s.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || 'N5';

/** The site's host for display: "https://www.onlyavenue.com" → "onlyavenue.com". */
export const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/** Where the claim form sends the sign-in link back to. */
export const claimPath = (shareToken: string): string => `/p/${shareToken}?claim=1`;
