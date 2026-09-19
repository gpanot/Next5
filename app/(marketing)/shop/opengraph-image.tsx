import { OG_SIZE, renderOgImage } from '../../../src/components/marketing/shared/ogImage';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'New stock this morning. On-model photos by lunch. UGC videos every month.';

export default function Image() {
  return renderOgImage('Next5 for TikTok Shop', 'On-model photos for every drop. UGC videos every month.');
}
