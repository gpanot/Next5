/**
 * Preset 1 — Editorial Cover. Nat codes: X16 H10 C7 M4 G1 (+ S3 later).
 * Full-bleed photos with slow pans, magazine masthead on the hook, tracked caps + big serif per room.
 */
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { FPS, PanPhoto, SANS, SERIF, Scrim, WarmFinish, beatFrames, ease } from './shared';
import type { ListingBeat, ListingFacts, ListingVideoProps } from './types';

const CREAM = '#FBF5EA';

const Masthead = ({ facts }: { facts: ListingFacts }) => {
  const frame = useCurrentFrame();
  const inT = ease(frame, 0, 12);
  const out = 1 - ease(frame, 2.6 * FPS, 10);
  return (
    <AbsoluteFill style={{ opacity: out, color: CREAM, textAlign: 'center' }}>
      <div style={{ position: 'absolute', top: 250, width: '100%', fontFamily: SANS, fontWeight: 900, fontSize: 64, letterSpacing: 4, opacity: inT }}>
        {facts.hookTop}
      </div>
      <div style={{ position: 'absolute', top: 310, width: '100%', fontFamily: SERIF, fontSize: 210, lineHeight: 1, letterSpacing: -4, opacity: inT, transform: `translateY(${(1 - inT) * 30}px)` }}>
        {facts.city}
      </div>
      <div style={{ position: 'absolute', top: 540, width: '100%', fontFamily: SANS, fontSize: 30, letterSpacing: 10, opacity: inT * 0.9 }}>
        {facts.beds} BD · {facts.baths} BA · {facts.sqft.toLocaleString('en-US')} SQFT
      </div>
      <div style={{ position: 'absolute', bottom: 500, width: '100%', fontFamily: SERIF, fontStyle: 'italic', fontSize: 64, opacity: ease(frame, 14, 14) }}>
        {facts.hookBottom}
      </div>
    </AbsoluteFill>
  );
};

/** C7: tiny wide-spaced caps line, then the punch word in big serif rising from a mask. */
const RoomCaption = ({ beat }: { beat: ListingBeat }) => {
  const frame = useCurrentFrame();
  const k = ease(frame, 4, 10);
  const t = ease(frame, 9, 14);
  return (
    <AbsoluteFill style={{ color: CREAM, textAlign: 'center' }}>
      <div style={{ position: 'absolute', bottom: 640, width: '100%', fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: 14, opacity: k }}>
        {beat.kicker}
      </div>
      <div style={{ position: 'absolute', bottom: 480, width: '100%', height: 150, overflow: 'hidden' }}>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 140, lineHeight: 1.05, transform: `translateY(${(1 - t) * 150}px)` }}>
          {beat.title}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const EndCard = ({ facts }: { facts: ListingFacts }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ color: CREAM, textAlign: 'center' }}>
      <div style={{ position: 'absolute', top: 260, width: '100%', fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: 14, opacity: ease(frame, 0, 10) }}>
        {facts.locationLine}
      </div>
      <div style={{ position: 'absolute', top: 320, width: '100%', fontFamily: SERIF, fontSize: 190, lineHeight: 1, opacity: ease(frame, 6, 12) }}>
        {facts.priceLabel}
      </div>
      <div style={{ position: 'absolute', top: 540, width: '100%', fontFamily: SERIF, fontStyle: 'italic', fontSize: 62, opacity: ease(frame, 18, 12) }}>
        Comment <span style={{ fontFamily: SANS, fontStyle: 'normal', fontWeight: 900, letterSpacing: 4 }}>{facts.ctaKeyword}</span> for a tour
      </div>
    </AbsoluteFill>
  );
};

/** v2: no panning (felt seasick on phone). Slow steady push only, photo centred. */
const panFor = () => ({ fromX: 0, toX: 0 });

export const EditorialCover = ({ facts, beats, endPhoto }: ListingVideoProps) => {
  const per = beatFrames(beats.length);
  const endStart = per * beats.length;
  const fade = 8;
  return (
    <AbsoluteFill style={{ backgroundColor: '#111' }}>
      {beats.map((beat, i) => (
        <Sequence key={beat.photo} from={Math.max(0, i * per - fade)} durationInFrames={per + fade}>
          <FadeIn frames={i === 0 ? 0 : fade}>
            <PanPhoto src={beat.photo} frames={per + fade} {...panFor()} fromScale={1.0} toScale={1.04} style={{ filter: 'saturate(1.05) sepia(0.08)' }} />
            <Scrim from="bottom" strength={0.6} size={45} />
            {i === 0 ? <Scrim from="top" strength={0.55} size={40} /> : null}
            <WarmFinish />
            {i === 0 ? <Masthead facts={facts} /> : <RoomCaption beat={beat} />}
          </FadeIn>
        </Sequence>
      ))}
      <Sequence from={endStart - fade} durationInFrames={15 * FPS - endStart + fade}>
        <FadeIn frames={fade}>
          <PanPhoto src={endPhoto} frames={15 * FPS - endStart + fade} fromScale={1.12} toScale={1.0} style={{ filter: 'brightness(0.72) saturate(1.05) sepia(0.08)' }} />
          <WarmFinish />
          <EndCard facts={facts} />
        </FadeIn>
      </Sequence>
    </AbsoluteFill>
  );
};

const FadeIn = ({ frames, children }: { frames: number; children: React.ReactNode }) => {
  const frame = useCurrentFrame();
  const o = frames === 0 ? 1 : ease(frame, 0, frames);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
