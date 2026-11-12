/**
 * "New listing alert", voiced. Nat codes: G7 V15 L3 V21 V17 S1.
 * Flat butter-yellow canvas (a series look the agent owns), an iPhone-style alert drops in on the hook,
 * each photo lands as a tilted white-border card on the last one, with a handwritten note and a drawn arrow.
 * The end is the gradient "Comment TOUR" card.
 */
import { AbsoluteFill, Img, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { FPS, HAND, SANS, photoSrc, usePop } from './shared';
import { TT } from './viral';
import { PhraseCaptions, beatTiming, endCue } from './kit';
import { Soundtrack, type VoicedBeat, type VoicedProps } from './voiced';
import type { ListingFacts } from './types';

const CANVAS = '#FFE14D';
const INK = '#141414';
const IG = 'linear-gradient(45deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5)';
const CARD = { top: 430, w: 820, h: 950 };

const Canvas = () => (
  <AbsoluteFill style={{ background: CANVAS, backgroundImage: 'radial-gradient(rgba(0,0,0,0.07) 2px, transparent 2px)', backgroundSize: '36px 36px' }} />
);

/** L3: white-border photo card, dropped in with a spring and a tilt. */
const PhotoCard = ({ src, tilt, delay = 0, still = false }: { src: string; tilt: number; delay?: number; still?: boolean }) => {
  const pop = usePop(delay, 13);
  const p = still ? 1 : pop;
  return (
    <div style={{ position: 'absolute', top: CARD.top, left: (1080 - CARD.w) / 2, width: CARD.w, height: CARD.h, background: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 18px 40px rgba(0,0,0,0.22)', transform: `translateY(${(1 - p) * 260}px) rotate(${tilt * p}deg) scale(${0.9 + 0.1 * p})`, opacity: Math.min(1, p * 2) }}>
      <Img src={photoSrc(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
    </div>
  );
};

/** V21: handwritten note under the card with an arrow drawing up to it. */
const Note = ({ text, flip }: { text: string; flip: boolean }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [8, 20], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const show = interpolate(frame, [12, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = flip ? 560 : 120;
  return (
    <>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
        <path d={flip ? 'M 600 1420 C 640 1380, 700 1360, 720 1300' : 'M 300 1420 C 260 1380, 220 1360, 230 1300'} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={draw} />
        <path d={flip ? 'M 700 1318 L 720 1300 L 734 1324' : 'M 212 1322 L 230 1300 L 248 1322'} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" opacity={draw < 0.05 ? 1 : 0} />
      </svg>
      <div style={{ position: 'absolute', top: 1400, left: x, width: 420, fontFamily: HAND, fontWeight: 700, fontSize: 76, color: INK, opacity: show, transform: `rotate(${flip ? 3 : -4}deg)` }}>{text}</div>
    </>
  );
};

/** V15: iPhone-style alert that slides down on the hook. */
const Alert = ({ facts }: { facts: ListingFacts }) => {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 10], [-260, 0], { extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3) });
  return (
    <div style={{ position: 'absolute', top: 236 + y, left: 70, width: 940, padding: '24px 28px', borderRadius: 40, background: 'rgba(255,255,255,0.92)', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', display: 'flex', gap: 24, alignItems: 'center' }}>
      <div style={{ width: 96, height: 96, borderRadius: 22, background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, flexShrink: 0 }}>🏡</div>
      <div style={{ fontFamily: SANS, color: INK, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, fontWeight: 600, opacity: 0.55 }}><span>NEW LISTING</span><span>now</span></div>
        <div style={{ fontSize: 40, fontWeight: 800, marginTop: 4 }}>{facts.hookBottom}</div>
        <div style={{ fontSize: 34, fontWeight: 600, marginTop: 2 }}>{facts.street ? `${facts.street} · ` : ''}{facts.priceLabel}</div>
      </div>
    </div>
  );
};

const RoomTag = ({ text }: { text: string }) => {
  const p = usePop(6, 12);
  return (
    <div style={{ position: 'absolute', top: CARD.top - 34, right: 110, padding: '10px 26px', borderRadius: 40, background: INK, color: '#fff', fontFamily: TT, fontWeight: 800, fontSize: 44, transform: `scale(${p}) rotate(4deg)` }}>{text}</div>
  );
};

const Beat = ({ beat, prev, i, facts }: { beat: VoicedBeat; prev: VoicedBeat | undefined; i: number; facts: ListingFacts }) => (
  <AbsoluteFill>
    {prev ? <PhotoCard src={prev.photo} tilt={i % 2 ? 3 : -3} still /> : null}
    <PhotoCard src={beat.photo} tilt={i % 2 ? -2.5 : 2.5} />
    {i === 0 ? <Alert facts={facts} /> : <RoomTag text={beat.title} />}
    {beat.note ? <Note text={beat.note} flip={i % 2 === 1} /> : null}
  </AbsoluteFill>
);

/** V17: white card, gradient ring, "Comment" types in, then the big gradient keyword. */
const CommentCta = ({ facts, ctaAtF }: { facts: ListingFacts; ctaAtF: number }) => {
  const frame = useCurrentFrame();
  const card = usePop(0, 12);
  const typed = 'Comment'.slice(0, Math.max(0, Math.floor((frame - ctaAtF + 6) / 2)));
  const word = usePop(ctaAtF + 10, 10);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 300, width: '100%', textAlign: 'center', fontFamily: TT, fontWeight: 900, fontSize: 120, color: INK }}>{facts.priceLabel}</div>
      <div style={{ position: 'absolute', top: 450, width: '100%', textAlign: 'center', fontFamily: SANS, fontWeight: 600, fontSize: 40, color: INK }}>{facts.beds} bd · {facts.baths} ba · {facts.sqft.toLocaleString('en-US')} sqft · {facts.city}</div>
      <div style={{ position: 'absolute', top: 620, left: 140, width: 800, padding: '56px 40px', borderRadius: 48, background: '#fff', boxShadow: '0 20px 50px rgba(0,0,0,0.18)', textAlign: 'center', transform: `scale(${card})` }}>
        <div style={{ width: 150, height: 150, margin: '0 auto', borderRadius: 75, padding: 8, background: IG }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 70 }}>🏡</div>
        </div>
        <div style={{ height: 90, marginTop: 30, fontFamily: SANS, fontWeight: 600, fontSize: 70, color: INK }}>{typed}</div>
        <div style={{ fontFamily: TT, fontWeight: 900, fontSize: 190, lineHeight: 1, background: IG, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', transform: `scale(${word})` }}>{facts.ctaKeyword}</div>
      </div>
    </AbsoluteFill>
  );
};

export const AlertVoiced = (props: VoicedProps) => {
  const { facts, beats, words, endStartS, durationS } = props;
  const { starts, endF, total, lenOf } = beatTiming(props);
  return (
    <AbsoluteFill>
      <Canvas />
      {beats.map((beat, i) => (
        <Sequence key={`${beat.photo}${i}`} from={starts[i]} durationInFrames={lenOf(i)}>
          <Beat beat={beat} prev={beats[i - 1]} i={i} facts={facts} />
        </Sequence>
      ))}
      <Sequence from={endF} durationInFrames={total - endF}>
        <CommentCta facts={facts} ctaAtF={endCue(props, /^comment$/i, endF)} />
      </Sequence>
      <PhraseCaptions
        words={words}
        maxWords={3}
        hideDuring={[[0, (starts[1] ?? endF) / FPS], [endStartS, durationS]]}
        style={{ position: 'absolute', top: 236, left: 80, right: 160, textAlign: 'center', fontFamily: TT, fontWeight: 900, fontSize: 60, color: INK }}
      />
      <Soundtrack {...props} musicLevel={0.14} />
    </AbsoluteFill>
  );
};
