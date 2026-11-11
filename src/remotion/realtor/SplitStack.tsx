/**
 * Preset 2 — Split Stack. Nat codes: L2 H5 C5 V11 M1 M3 (+ S1 later).
 * Two landscape photos stacked (almost native size, so sharp), info band in the middle,
 * hard cuts with a small punch-in, white-pill keyword captions, progress dots.
 */
import { AbsoluteFill, Img, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { FPS, SANS, beatFrames, photoSrc, usePop } from './shared';
import type { ListingBeat, ListingFacts, ListingVideoProps } from './types';

const PHOTO_H = 700;
const BAND_TOP = PHOTO_H;
const BAND_H = 1920 - PHOTO_H * 2;
const INK = '#14161A';
const ACCENT = '#F5C542';

const Punch = ({ src, frames }: { src: string; frames: number }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 4, frames], [1.1, 1.04, 1.0], { extrapolateRight: 'clamp' });
  return (
    <div style={{ width: '100%', height: PHOTO_H, overflow: 'hidden', position: 'relative' }}>
      <Img src={photoSrc(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})` }} />
    </div>
  );
};

/** C5: phrase with one keyword in a white pill. */
const PillLine = ({ beat }: { beat: ListingBeat }) => {
  const a = usePop(1);
  const b = usePop(6, 11);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: '#fff', opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>
        {beat.kicker.toLowerCase()}
      </div>
      <div style={{ background: '#fff', color: INK, borderRadius: 999, padding: '14px 44px', fontFamily: SANS, fontWeight: 900, fontSize: 84, transform: `scale(${b})` }}>
        {beat.title}
      </div>
    </div>
  );
};

const ProgressDots = ({ index, total }: { index: number; total: number }) => (
  <div style={{ position: 'absolute', top: 34, width: '100%', display: 'flex', justifyContent: 'center', gap: 12 }}>
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{ width: i === index ? 46 : 14, height: 14, borderRadius: 7, background: i <= index ? ACCENT : 'rgba(255,255,255,0.3)' }} />
    ))}
  </div>
);

/** H5: one flat coloured box with the hook. */
const HookBox = ({ facts }: { facts: ListingFacts }) => {
  const p = usePop(0, 12);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, transform: `scale(${p})` }}>
      <div style={{ background: ACCENT, color: INK, padding: '16px 36px', borderRadius: 18, fontFamily: SANS, fontWeight: 900, fontSize: 86, letterSpacing: -1 }}>
        {facts.hookTop}
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 48, color: '#fff' }}>
        {facts.priceLabel} · {facts.beds} bd · {facts.baths} ba
      </div>
    </div>
  );
};

const EndBand = ({ facts }: { facts: ListingFacts }) => {
  const a = usePop(0);
  const b = usePop(10, 11);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 50, color: '#fff', transform: `scale(${a})` }}>{facts.locationLine}</div>
      <div style={{ background: ACCENT, color: INK, padding: '14px 40px', borderRadius: 999, fontFamily: SANS, fontWeight: 900, fontSize: 70, transform: `scale(${b})` }}>
        Comment “{facts.ctaKeyword}”
      </div>
    </div>
  );
};

const Frame = ({ top, bottom, frames, children, dots }: { top: string; bottom: string; frames: number; children: React.ReactNode; dots: React.ReactNode }) => (
  <AbsoluteFill style={{ background: INK }}>
    <div style={{ position: 'absolute', top: 0, width: '100%' }}><Punch src={top} frames={frames} /></div>
    <div style={{ position: 'absolute', top: BAND_TOP, height: BAND_H, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {dots}
      {children}
    </div>
    <div style={{ position: 'absolute', top: BAND_TOP + BAND_H, width: '100%' }}><Punch src={bottom} frames={frames} /></div>
  </AbsoluteFill>
);

export const SplitStack = ({ facts, beats, endPhoto }: ListingVideoProps) => {
  const per = beatFrames(beats.length);
  const endStart = per * beats.length;
  const endFrames = 15 * FPS - endStart;
  return (
    <AbsoluteFill style={{ background: INK }}>
      {beats.map((beat, i) => (
        <Sequence key={beat.photo} from={i * per} durationInFrames={per}>
          <Frame top={beat.photo} bottom={beat.photo2 ?? beat.photo} frames={per} dots={<ProgressDots index={i} total={beats.length + 1} />}>
            {i === 0 ? <HookBox facts={facts} /> : <PillLine beat={beat} />}
          </Frame>
        </Sequence>
      ))}
      <Sequence from={endStart} durationInFrames={endFrames}>
        <Frame top={endPhoto} bottom={beats[0].photo2 ?? beats[0].photo} frames={endFrames} dots={<ProgressDots index={beats.length} total={beats.length + 1} />}>
          <EndBand facts={facts} />
        </Frame>
      </Sequence>
    </AbsoluteFill>
  );
};
