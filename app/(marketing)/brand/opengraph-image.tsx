import { OG_SIZE, renderOgImage } from '../../../src/components/marketing/shared/ogImage';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'A month of on-brand photos of you. Without the photoshoot.';

export default function Image() {
  return renderOgImage('Brand Studio', 'A month of on-brand photos of you. Without the photoshoot.');
}
