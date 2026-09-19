import { OG_SIZE, renderOgImage } from '../../../src/components/marketing/shared/ogImage';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Photos and videos of you, every month. Made for realtors.';

export default function Image() {
  return renderOgImage('Next5 for Realtors', 'Photos and videos of you, every month. No photoshoot.');
}
