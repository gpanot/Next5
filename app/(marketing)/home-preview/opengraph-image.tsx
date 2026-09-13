import { OG_SIZE, renderOgImage } from '../../../src/components/marketing/shared/ogImage';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Photos of you that work as hard as you do.';

export default function Image() {
  return renderOgImage('Next5 for business', 'Photos of you that work as hard as you do.');
}
