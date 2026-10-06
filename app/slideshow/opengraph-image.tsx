import { ImageResponse } from 'next/og';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { OG_SIZE } from '../../src/components/marketing/shared/ogImage';
import { THEME } from '../../src/config/theme';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Auto Slideshow: three TikTok slideshow covers made by Next5. Slideshows that bring you customers.';

// Real slide covers already in public/images/manifest.json (realtor, TikTok Shop, local service).
const SLIDE_PATHS = ['pantry-gaps', 'porsche-calmer', 'golf-setup'];

const slideSrcs = await Promise.all(
  SLIDE_PATHS.map(async (name) => {
    const data = await readFile(join(process.cwd(), 'public', 'images', 'auto-slideshow', name, '1.jpg'), 'base64');
    return `data:image/jpeg;base64,${data}`;
  }),
);

const SLIDE_W = 256;
const SLIDE_H = 320;
const FAN = [
  { left: 0, top: 110, rotate: -6 },
  { left: 232, top: 70, rotate: 0 },
  { left: 464, top: 110, rotate: 6 },
];

// Middle slide drawn last so it sits on top.
const STACK_ORDER = [0, 2, 1];

const SlideFan = () => (
  <div style={{ position: 'absolute', right: 24, top: 40, width: 720, height: 540, display: 'flex' }}>
    {STACK_ORDER.map((i) => (
      <img
        key={SLIDE_PATHS[i]}
        src={slideSrcs[i]}
        width={SLIDE_W}
        height={SLIDE_H}
        style={{ position: 'absolute', left: FAN[i].left, top: FAN[i].top, transform: `rotate(${FAN[i].rotate}deg)`, borderRadius: 18, border: '6px solid #ffffff', boxShadow: '0 18px 40px rgba(0,0,0,0.22)', objectFit: 'cover' }}
      />
    ))}
  </div>
);

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: THEME.ground, fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <SlideFan />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 440, padding: '64px 0 64px 64px', height: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 30, letterSpacing: 9, color: THEME.ink, fontWeight: 800 }}>NEXT5</span>
            <span style={{ fontSize: 14, letterSpacing: 5, color: THEME.muted }}>FOR BUSINESS</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ fontSize: 20, letterSpacing: 4, color: THEME.accent }}>AUTO SLIDESHOW</span>
            <span style={{ fontSize: 46, lineHeight: 1.05, color: THEME.ink, fontWeight: 700, letterSpacing: -1 }}>Slideshows that bring you customers.</span>
            <span style={{ fontSize: 26, color: THEME.muted }}>$1.99 a post. No filming.</span>
          </div>
          <div style={{ display: 'flex', height: 8, width: 140, background: THEME.accent, borderRadius: 8 }} />
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
