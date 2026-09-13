import { OG_SIZE, renderOgImage } from '../src/components/marketing/shared/ogImage';
import { isBusinessEnabled } from '../src/config/business';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Next5 — photos of you that work as hard as you do.';

export default function Image() {
  return isBusinessEnabled()
    ? renderOgImage('Next5 for business', 'Photos of you that work as hard as you do.')
    : renderOgImage('Next5 Photos', 'A professional photoshoot, made for you.');
}
