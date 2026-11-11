import { ImageResponse } from 'next/og';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { OG_SIZE } from '../src/components/marketing/shared/ogImage';
import { THEME } from '../src/config/theme';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Next5 for TikTok, Instagram and YouTube. Videos that bring you customers. No filming. No editing. No content team.';

/** Hero blue (Tailwind blue-600), same as the second headline line on the home page. */
const BLUE = '#2563eb';

type Stat = 'views' | 'likes' | 'saves' | 'comments';

const STAT_PATHS: Record<Stat, string> = {
  views: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zm11 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  likes: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z',
  saves: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
  comments: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z',
};

// Same posts and numbers as the home page strip (SlideshowShowcase). Video posts use a still from public/images/og/home.
// Each path below is a literal on purpose: a path built from a variable makes the file tracer pull in the whole project.
const CARDS: { stats: [Stat, string][]; tilt: number }[] = [
  { stats: [['views', '412K'], ['saves', '9.4K']], tilt: -3 },
  { stats: [['views', '97K'], ['likes', '6.8K']], tilt: 2 },
  { stats: [['likes', '14.2K'], ['comments', '284']], tilt: -1 },
  { stats: [['saves', '31K'], ['comments', '1.8K']], tilt: 2 },
  { stats: [['views', '254K'], ['comments', '395']], tilt: -3 },
];

const toJpegSrc = (data: string) => `data:image/jpeg;base64,${data}`;
const [interBold, ...cardSrcs] = await Promise.all([
  readFile(join(process.cwd(), 'assets', 'fonts', 'Inter-Bold.ttf')),
  readFile(join(process.cwd(), 'public', 'images', 'auto-slideshow', 'pantry-gaps', '1.jpg'), 'base64').then(toJpegSrc),
  readFile(join(process.cwd(), 'public', 'images', 'og', 'home', 'booking-ugc.jpg'), 'base64').then(toJpegSrc),
  readFile(join(process.cwd(), 'public', 'images', 'auto-slideshow', 'porsche-calmer', '1.jpg'), 'base64').then(toJpegSrc),
  readFile(join(process.cwd(), 'public', 'images', 'og', 'home', 'r1.jpg'), 'base64').then(toJpegSrc),
  readFile(join(process.cwd(), 'public', 'images', 'og', 'home', 'reminders-ugc.jpg'), 'base64').then(toJpegSrc),
]);

const PLATFORMS = [
  { name: 'TikTok', tile: '#000000', path: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.15 8.15 0 0 0 4.77 1.52V6.75a4.85 4.85 0 0 1-1-.06z' },
  { name: 'Instagram', tile: 'linear-gradient(45deg,#feda75 0%,#fa7e1e 25%,#d62976 50%,#962fbf 75%,#4f5bd5 100%)', path: '' },
  { name: 'YouTube', tile: '#ff0000', path: 'M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2C2 8.78 2 12 2 12s0 3.22.4 4.8a2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77C22 15.22 22 12 22 12s0-3.22-.4-4.8zM10 15V9l5.2 3L10 15z' },
];

/** Platform marks from PlatformBadges; Instagram is the outlined camera (no single path). */
const Glyph = ({ path }: { path: string }) =>
  path ? (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="#ffffff"><path d={path} /></svg>
  ) : (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.2}>
      <rect x={3} y={3} width={18} height={18} rx={5} />
      <circle cx={12} cy={12} r={4} />
      <circle cx={17.3} cy={6.7} r={1.1} fill="#ffffff" stroke="none" />
    </svg>
  );

const PlatformPill = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 18px 7px 7px', borderRadius: 999, border: `1px solid ${THEME.line}`, background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', fontSize: 20, color: THEME.ink }}>
    {PLATFORMS.map(({ name, tile, path }, index) => (
      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {index > 0 && <span style={{ color: THEME.muted, marginRight: 2 }}>+</span>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, background: tile }}><Glyph path={path} /></div>
        <span>{name}</span>
      </div>
    ))}
  </div>
);

const StatRow = ({ stats }: { stats: [Stat, string][] }) => (
  <div style={{ display: 'flex', justifyContent: 'center', gap: 14, paddingTop: 9, fontSize: 15, color: THEME.ink }}>
    {stats.map(([stat, value]) => (
      <div key={stat} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={THEME.muted} strokeWidth={2}><path d={STAT_PATHS[stat]} /></svg>
        <span>{value}</span>
      </div>
    ))}
  </div>
);

const CardStrip = () => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: 322, display: 'flex', justifyContent: 'center', gap: 22 }}>
    {CARDS.map(({ stats, tilt }, i) => (
      <div key={i} style={{ display: 'flex', flexDirection: 'column', width: 206, padding: 7, borderRadius: 18, background: '#ffffff', border: `1px solid ${THEME.line}`, boxShadow: '0 14px 30px rgba(0,0,0,0.14)', transform: `rotate(${tilt}deg)` }}>
        <img src={cardSrcs[i]} alt="" width={190} height={236} style={{ borderRadius: 12, objectFit: 'cover' }} />
        <StatRow stats={stats} />
      </div>
    ))}
  </div>
);

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', background: THEME.ground, backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.09) 1.5px, transparent 1.5px)', backgroundSize: '26px 26px', fontFamily: 'Inter' }}>
        <div style={{ display: 'flex', marginTop: 44 }}><PlatformPill /></div>
        <div style={{ display: 'flex', marginTop: 30, fontSize: 64, lineHeight: 1.05, letterSpacing: -2, color: THEME.ink }}>Videos that bring you customers.</div>
        <div style={{ display: 'flex', marginTop: 8, fontSize: 52, lineHeight: 1.05, letterSpacing: -1.5, color: BLUE }}>No filming. No editing. No content team.</div>
        <CardStrip />
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: 'Inter', data: interBold, weight: 700, style: 'normal' }] },
  );
}
