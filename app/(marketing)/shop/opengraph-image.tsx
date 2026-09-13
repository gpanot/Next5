import { OG_SIZE, renderOgImage } from '../../../src/components/marketing/shared/ogImage';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'New stock this morning. On-model photos by lunch.';

export default function Image() {
  return renderOgImage('Shop Studio', 'New stock this morning. On-model photos by lunch.');
}
