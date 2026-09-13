import { OG_SIZE, renderOgImage } from '../../../src/components/marketing/shared/ogImage';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Simple plans. Prepaid. No surprises.';

export default function Image() {
  return renderOgImage('Pricing', 'Simple plans. Prepaid. No surprises.');
}
