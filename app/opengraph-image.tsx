import { OG_SIZE, renderOgImage } from '../src/components/marketing/shared/ogImage';
import { isBusinessEnabled } from '../src/config/business';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Next5 — photos and videos for realtors and TikTok Shop sellers.';

export default function Image() {
  return isBusinessEnabled()
    ? renderOgImage('Next5 for business', 'Photos and videos for realtors and TikTok Shop sellers.')
    : renderOgImage('Next5 Photos', 'A professional photoshoot, made for you.');
}
