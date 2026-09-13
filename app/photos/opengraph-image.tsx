import { OG_SIZE, renderOgImage } from '../../src/components/marketing/shared/ogImage';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Next5 Photos — a professional photoshoot, made for you.';

export default function Image() {
  return renderOgImage('Next5 Photos', 'A professional photoshoot, made for you.');
}
