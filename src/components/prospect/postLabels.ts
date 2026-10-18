import type { ProspectKind } from '../../types/admin/prospects';

/** What a post is, in plain words. */
export const KIND_LABEL: Record<ProspectKind, string> = { blitz: 'Video', cast: 'Slideshow', hooks: 'Slideshow' };

/** "Mon, Oct 20" in the viewer's time zone. */
export const dayLabel = (iso: string): string => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
