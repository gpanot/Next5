/**
 * Scrapbook v2 — big cards. One near-full-width 4:5 polaroid per beat (1000 px wide),
 * the previous card stays tilted behind it, handwritten label on a tape strip, big rounded title above.
 * Nat codes: L3 H4 V21 G7 M3.
 */
import { AbsoluteFill, Img, Sequence } from 'remotion';
import { FPS, HAND, ROUNDED, SERIF, photoSrc, usePop } from './shared';
import type { ListingBeat, ListingFacts, ListingVideoProps } from './types';

const CANVAS = '#F6E7B4';
const INK = '#2A2118';
const CARD_W = 1000;
const CARD_TOP = 430;
const TILTS = [-2.5, 2, -1.5, 2.5, -2, 1.5, -2.5];
const END_FRAMES = 75;

const Polaroid = ({ src, tilt, drop = true }: { src: string; tilt: number; drop?: boolean }) => {
  const p = usePop(0, 14);
  const t = drop ? p : 1;
  return (
    <div
      style={{
        position: 'absolute', left: (1080 - CARD_W) / 2, top: CARD_TOP, width: CARD_W,
        background: '#fff', padding: 22, paddingBottom: 30, borderRadius: 6,
        boxShadow: '0 24px 50px rgba(60,40,0,0.28)',
        transform: `translateY(${(1 - t) * 260}px) rotate(${tilt + (1 - t) * 8}deg) scale(${1.08 - t * 0.08})`,
        opacity: Math.min(1, t * 2),
      }}
    >
      <Img src={photoSrc(src)} style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', display: 'block' }} />
    </div>
  );
};

const TapeLabel = ({ text, right }: { text: string; right: boolean }) => {
  const p = usePop(8, 12);
  return (
    <div style={{ position: 'absolute', top: 1270, [right ? 'right' : 'left']: 90, background: 'rgba(255,253,240,0.92)', padding: '6px 30px', transform: `rotate(${right ? 4 : -4}deg) scale(${p})`, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
      <span style={{ fontFamily: HAND, fontWeight: 700, fontSize: 76, color: INK }}>{text}</span>
    </div>
  );
};

const Title = ({ beat }: { beat: ListingBeat }) => {
  const p = usePop(2, 12);
  const text = `${beat.kicker} ${beat.title}`.toLowerCase();
  return (
    <div style={{ position: 'absolute', top: 250, width: '100%', textAlign: 'center', color: INK, transform: `scale(${0.7 + p * 0.3})`, opacity: p }}>
      <span style={{ fontFamily: ROUNDED, fontWeight: 900, fontSize: text.length > 18 ? 82 : 104, whiteSpace: 'nowrap' }}>{text}</span>
    </div>
  );
};

const Hook = ({ facts }: { facts: ListingFacts }) => (
  <div style={{ position: 'absolute', top: 236, width: '100%', textAlign: 'center', color: INK }}>
    <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 64, lineHeight: 1 }}>{facts.hookTop.toLowerCase()} in {facts.city.toLowerCase()}</div>
    <div style={{ fontFamily: ROUNDED, fontWeight: 900, fontSize: 92, lineHeight: 1.05 }}>{facts.hookBottom.toLowerCase()}</div>
  </div>
);

const EndCard = ({ facts }: { facts: ListingFacts }) => {
  const a = usePop(4, 10);
  const b = usePop(14, 12);
  return (
    <>
      <div style={{ position: 'absolute', top: 250, width: '100%', textAlign: 'center', transform: `scale(${a})` }}>
        <span style={{ background: INK, color: CANVAS, fontFamily: ROUNDED, fontWeight: 900, fontSize: 110, padding: '4px 44px', borderRadius: 28, display: 'inline-block', transform: 'rotate(-2deg)' }}>{facts.priceLabel}</span>
      </div>
      <div style={{ position: 'absolute', top: 1110, width: '100%', textAlign: 'center', transform: `scale(${b})` }}>
        <span style={{ background: 'rgba(255,253,240,0.95)', padding: '6px 30px', fontFamily: HAND, fontWeight: 700, fontSize: 80, color: INK, display: 'inline-block', transform: 'rotate(-3deg)' }}>comment “{facts.ctaKeyword.toLowerCase()}” for a tour</span>
      </div>
    </>
  );
};

export const ScrapbookBig = ({ facts, beats, endPhoto }: ListingVideoProps) => {
  const per = Math.floor((15 * FPS - END_FRAMES) / beats.length);
  const endStart = per * beats.length;
  const photos = [...beats.map((b) => b.photo), endPhoto];
  return (
    <AbsoluteFill style={{ background: CANVAS }}>
      {photos.map((src, i) => {
        const len = i === photos.length - 1 ? 15 * FPS - endStart : per;
        return (
          <Sequence key={src} from={i * per} durationInFrames={len}>
            {i > 0 ? <Polaroid src={photos[i - 1]} tilt={TILTS[(i - 1) % TILTS.length]} drop={false} /> : null}
            <Polaroid src={src} tilt={TILTS[i % TILTS.length]} />
            {i === 0 ? <Hook facts={facts} /> : null}
            {i > 0 && i < beats.length ? <Title beat={beats[i]} /> : null}
            {i > 0 && i < beats.length && beats[i].note ? <TapeLabel text={beats[i].note ?? ''} right={i % 2 === 1} /> : null}
            {i === beats.length ? <EndCard facts={facts} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
