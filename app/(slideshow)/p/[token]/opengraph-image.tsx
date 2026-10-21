import { ImageResponse } from 'next/og';
import { hostOf, initials } from '../../../../src/components/prospect/postLabels';
import { OG_SIZE } from '../../../../src/components/marketing/shared/ogImage';
import { THEME } from '../../../../src/config/theme';
import { prospectShareCard } from '../../../../src/server/prospects/shareCard';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Your next 14 days of posts, made by Next5';

const SLIDE_W = 240;
const SLIDE_H = 300;
const FAN = [
  { left: 0, top: 120, rotate: -6 },
  { left: 220, top: 80, rotate: 0 },
  { left: 440, top: 120, rotate: 6 },
];

// Middle slide drawn last so it sits on top.
const STACK_ORDER = [0, 2, 1];

const SlideFan = ({ covers }: { covers: string[] }) => (
  <div style={{ position: 'absolute', right: 40, top: 40, width: 690, height: 540, display: 'flex' }}>
    {STACK_ORDER.filter((i) => covers[i]).map((i) => (
      <img
        key={i}
        alt=""
        src={covers[i]}
        width={SLIDE_W}
        height={SLIDE_H}
        style={{ position: 'absolute', left: FAN[i].left, top: FAN[i].top, transform: `rotate(${FAN[i].rotate}deg)`, borderRadius: 18, border: '6px solid #ffffff', boxShadow: '0 18px 40px rgba(0,0,0,0.22)', objectFit: 'cover' }}
      />
    ))}
  </div>
);

const BusinessChip = ({ name, websiteUrl }: { name: string; websiteUrl: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: 14, background: THEME.accent, color: THEME.accentInk, fontSize: 24, fontWeight: 800 }}>
      {initials(name)}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 28, fontWeight: 700, color: THEME.ink }}>{name}</span>
      {hostOf(websiteUrl) !== name ? <span style={{ fontSize: 20, color: THEME.muted }}>{hostOf(websiteUrl)}</span> : null}
    </div>
  </div>
);

/** The link preview of a Prospect Pack: who it is for, the promise, and its own first slides. */
export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await prospectShareCard(token, true).catch(() => null);
  const days = card?.days || 14;
  const textWidth = card?.covers.length ? 470 : 1000;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: THEME.ground, fontFamily: 'Arial, Helvetica, sans-serif' }}>
        {card?.covers.length ? <SlideFan covers={card.covers} /> : null}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: textWidth, padding: '60px 0 60px 64px', height: '100%' }}>
          <span style={{ fontSize: 30, letterSpacing: 9, color: THEME.ink, fontWeight: 800 }}>NEXT5</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {card ? <BusinessChip name={card.name} websiteUrl={card.websiteUrl} /> : null}
            <span style={{ fontSize: 48, lineHeight: 1.05, color: THEME.ink, fontWeight: 800, letterSpacing: -2 }}>{`Your next ${days} days of posts are ready.`}</span>
            <span style={{ fontSize: 24, color: THEME.muted }}>Captions written. No filming.</span>
          </div>
          <div style={{ display: 'flex', height: 8, width: 140, background: THEME.accent, borderRadius: 8 }} />
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
