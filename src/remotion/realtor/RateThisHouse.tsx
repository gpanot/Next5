/**
 * Viral format 3 — "Rate this house 1–10". Native header stays on, big 4:5 photos,
 * a checklist ticks green room by room (X7), the end asks for a rating with 1–10 bubbles.
 * Nat codes: H5 X7 C3 V17 M4.
 */
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { FPS, ease, usePop } from './shared';
import { BlurFill, CutFlash, HeroPhoto, NativeBox, TT, outlineText } from './viral';
import type { ListingBeat, ListingFacts, ListingVideoProps } from './types';

const PHOTO_TOP = 430;
const END_FRAMES = 90;
const GREEN = '#2BD46B';

const Row = ({ text, fresh }: { text: string; fresh: boolean }) => {
  const frame = useCurrentFrame();
  const t = fresh ? ease(frame, 8, 8) : 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: TT, fontWeight: 800, fontSize: 44, color: '#fff' }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, border: '4px solid #fff', background: t > 0.5 ? GREEN : 'transparent', borderColor: t > 0.5 ? GREEN : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + Math.sin(t * Math.PI) * 0.25})` }}>
        {t > 0.5 ? <span style={{ fontSize: 32, color: '#fff' }}>✓</span> : null}
      </div>
      {text}
    </div>
  );
};

/** Dark card bottom-left, inside the safe zone. Shows the last 4 rows. */
const Checklist = ({ beats, upTo }: { beats: ListingBeat[]; upTo: number }) => {
  const rows = beats.slice(1, upTo + 1).slice(-4);
  if (rows.length === 0) return null;
  return (
    <div style={{ position: 'absolute', left: 60, bottom: 450, background: 'rgba(10,10,12,0.72)', borderRadius: 24, padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {rows.map((b, i) => (
        <Row key={b.photo} text={`${b.kicker.toLowerCase()} ${b.title.toLowerCase()}`} fresh={i === rows.length - 1} />
      ))}
    </div>
  );
};

const RatingEnd = ({ facts, photo }: { facts: ListingFacts; photo: string }) => {
  const ask = usePop(2, 11);
  return (
    <AbsoluteFill>
      <BlurFill src={photo} dim={0.45} />
      <CutFlash />
      <NativeBox lines={['your rating? 👇', 'drop a number']} size={84} bg="#FFD43B" style={{ position: 'absolute', top: 520, width: '100%', transform: `scale(${ask})` }} />
      <Bubbles />
      <div style={{ position: 'absolute', top: 1180, width: '100%', textAlign: 'center', opacity: ask }}>
        <span style={outlineText(56)}>{facts.priceLabel} · {facts.city}, {facts.state}</span>
      </div>
      <div style={{ position: 'absolute', top: 1270, width: '100%', textAlign: 'center', opacity: ask }}>
        <span style={outlineText(46)}>comment “{facts.ctaKeyword}” to see it in person</span>
      </div>
    </AbsoluteFill>
  );
};

const Bubble = ({ n }: { n: number }) => {
  const p = usePop(10 + n * 2, 10);
  return (
    <div style={{ width: 132, height: 132, borderRadius: 66, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TT, fontWeight: 900, fontSize: 64, color: '#000', transform: `scale(${p})` }}>
      {n}
    </div>
  );
};

const Bubbles = () => (
  <div style={{ position: 'absolute', top: 800, left: 140, width: 800, display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
    {Array.from({ length: 10 }, (_, i) => <Bubble key={i} n={i + 1} />)}
  </div>
);

export const RateThisHouse = ({ facts, beats, endPhoto }: ListingVideoProps) => {
  const per = Math.floor((15 * FPS - END_FRAMES) / beats.length);
  const endStart = per * beats.length;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {beats.map((beat, i) => (
        <Sequence key={beat.photo} from={i * per} durationInFrames={per}>
          <BlurFill src={beat.photo} />
          <HeroPhoto src={beat.photo} frames={per} top={PHOTO_TOP} push={1.05} />
          {i > 0 ? <CutFlash /> : null}
          <Checklist beats={beats} upTo={i} />
        </Sequence>
      ))}
      <Sequence from={0} durationInFrames={endStart}>
        <NativeBox lines={['Rate this house 1–10 🏡', `${facts.priceLabel.replace(/,000$/, 'K')} in ${facts.city}, ${facts.state}`]} size={68} style={{ position: 'absolute', top: 240, width: '100%' }} />
      </Sequence>
      <Sequence from={endStart} durationInFrames={END_FRAMES}>
        <RatingEnd facts={facts} photo={endPhoto} />
      </Sequence>
    </AbsoluteFill>
  );
};
