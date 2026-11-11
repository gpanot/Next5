/**
 * Preset 3 — Scrapbook Tour. Nat codes: L3 H4 V21 G7 M3 (+ S1 later).
 * Flat butter canvas, landscape photos as tilted white-border cards that drop in and stack,
 * handwritten notes with drawn arrows. Photos stay landscape, so nothing is cropped away.
 */
import { AbsoluteFill, Img, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { FPS, HAND, ROUNDED, SERIF, beatFrames, ease, photoSrc, usePop } from './shared';
import type { ListingBeat, ListingFacts, ListingVideoProps } from './types';

const CANVAS = '#F6E7B4';
const INK = '#2A2118';
const CARD_W = 940;
const TILTS = [-4, 3.5, -2.5, 4, -3, 2.5, -3.5];
const NUDGE = [-20, 24, -14, 18, -24, 12, -10];

type CardProps = { src: string; i: number; settledAt: number };

/** A card drops in with a spring, then slides up and shrinks as newer cards land on top. */
const Card = ({ src, i, settledAt }: CardProps) => {
  const frame = useCurrentFrame();
  const drop = usePop(0, 13);
  const age = interpolate(frame, [settledAt, settledAt + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y = (1 - drop) * -1100 + age * -30;
  const scale = 1 - age * 0.06;
  return (
    <div
      style={{
        position: 'absolute', left: (1080 - CARD_W) / 2 + NUDGE[i % NUDGE.length], top: 640, width: CARD_W,
        background: '#fff', padding: 18, paddingBottom: 26, borderRadius: 6,
        boxShadow: '0 18px 40px rgba(60,40,0,0.25)',
        transform: `translateY(${y}px) rotate(${TILTS[i % TILTS.length]}deg) scale(${scale})`,
        filter: `brightness(${1 - age * 0.12})`,
      }}
    >
      <Img src={photoSrc(src)} style={{ width: '100%', aspectRatio: '1024 / 681', objectFit: 'cover', display: 'block' }} />
      <Tape />
    </div>
  );
};

const Tape = () => (
  <div style={{ position: 'absolute', top: -22, left: '42%', width: 150, height: 44, background: 'rgba(255,255,255,0.65)', transform: 'rotate(-6deg)', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }} />
);

/** V21: handwritten caps note with a drawn arrow pointing at the new card. */
const Note = ({ text, side }: { text: string; side: 'left' | 'right' }) => {
  const frame = useCurrentFrame();
  const draw = ease(frame, 10, 14);
  const o = ease(frame, 8, 6);
  const left = side === 'left';
  return (
    <div style={{ position: 'absolute', top: 330, [left ? 'left' : 'right']: 110, opacity: o }}>
      <svg width={190} height={170} viewBox="0 0 190 170" style={{ position: 'absolute', top: 90, [left ? 'left' : 'right']: 200, transform: left ? 'none' : 'scaleX(-1)' }}>
        <path d="M10 20 C 70 30, 140 70, 170 150" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={260} strokeDashoffset={260 * (1 - draw)} />
        <path d="M148 138 L170 152 L178 126" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" opacity={draw > 0.9 ? 1 : 0} />
      </svg>
      <div style={{ fontFamily: HAND, fontWeight: 700, fontSize: 84, color: INK, transform: `rotate(${left ? -4 : 4}deg)`, whiteSpace: 'nowrap' }}>
        {text}
      </div>
    </div>
  );
};

/** H4: thin italic serif line over a bold rounded word. */
const Hook = ({ facts }: { facts: ListingFacts }) => {
  const frame = useCurrentFrame();
  const a = ease(frame, 0, 10);
  const b = usePop(6, 12);
  return (
    <div style={{ position: 'absolute', top: 210, width: '100%', textAlign: 'center', color: INK }}>
      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 78, opacity: a }}>{facts.hookTop.toLowerCase()}</div>
      <div style={{ fontFamily: ROUNDED, fontWeight: 900, fontSize: 118, lineHeight: 1, transform: `scale(${b})` }}>{facts.hookBottom.toLowerCase()}</div>
    </div>
  );
};

const RoomLabel = ({ beat }: { beat: ListingBeat }) => {
  const p = usePop(2, 12);
  return (
    <div style={{ position: 'absolute', top: 1350, width: '100%', textAlign: 'center', color: INK, transform: `scale(${p})` }}>
      <span style={{ fontFamily: ROUNDED, fontWeight: 900, fontSize: 92 }}>{beat.title.toLowerCase()}</span>
    </div>
  );
};

const EndSticker = ({ facts }: { facts: ListingFacts }) => {
  const a = usePop(4, 10);
  const b = usePop(14, 12);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 1340, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: INK, color: CANVAS, fontFamily: ROUNDED, fontWeight: 900, fontSize: 110, padding: '10px 46px', borderRadius: 28, transform: `rotate(-3deg) scale(${a})` }}>
          {facts.priceLabel}
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1530, width: '100%', textAlign: 'center', fontFamily: HAND, fontWeight: 700, fontSize: 76, color: INK, transform: `scale(${b})` }}>
        comment “{facts.ctaKeyword.toLowerCase()}” for a tour
      </div>
    </AbsoluteFill>
  );
};

export const ScrapbookTour = ({ facts, beats, endPhoto }: ListingVideoProps) => {
  const per = beatFrames(beats.length);
  const endStart = per * beats.length;
  const cards = [...beats.map((b) => b.photo), endPhoto];
  return (
    <AbsoluteFill style={{ background: CANVAS }}>
      {cards.map((src, i) => (
        <Sequence key={src} from={i * per} durationInFrames={Math.min((i + 2) * per, 15 * FPS) - i * per}>
          <Card src={src} i={i} settledAt={per} />
        </Sequence>
      ))}
      <Sequence from={0} durationInFrames={per}><Hook facts={facts} /></Sequence>
      {beats.map((beat, i) => (i === 0 ? null : (
        <Sequence key={`t${beat.photo}`} from={i * per} durationInFrames={per}>
          <RoomLabel beat={beat} />
          {beat.note ? <Note text={beat.note} side={i % 2 === 0 ? 'left' : 'right'} /> : null}
        </Sequence>
      )))}
      <Sequence from={endStart} durationInFrames={15 * FPS - endStart}><EndSticker facts={facts} /></Sequence>
    </AbsoluteFill>
  );
};
