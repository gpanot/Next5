/**
 * Editorial v2, voiced (25 s). Nat codes: X16 H10 C7 C8 M4 M2 G1 P3 S3 S2.
 * No panning: slow push only. Cuts land on sentence starts, warm light-leak crossfades,
 * a small tracked subtitle line under the room title, the price counts up on the end beat.
 */
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { PanPhoto, SANS, SERIF, Scrim, WarmFinish, ease } from './shared';
import { Soundtrack, SpokenCaptions, VOICE_OFFSET_S, toFrame, wordAt, type VoicedBeat, type VoicedProps } from './voiced';
import type { ListingFacts } from './types';

const CREAM = '#FBF5EA';
const FADE = 10;

const Masthead = ({ facts, frames }: { facts: ListingFacts; frames: number }) => {
  const frame = useCurrentFrame();
  const inT = ease(frame, 0, 12);
  const out = 1 - ease(frame, frames - 12, 10);
  return (
    <AbsoluteFill style={{ opacity: out, color: CREAM, textAlign: 'center' }}>
      <div style={{ position: 'absolute', top: 250, width: '100%', fontFamily: SANS, fontWeight: 900, fontSize: 64, letterSpacing: 4, opacity: inT }}>{facts.hookTop}</div>
      <div style={{ position: 'absolute', top: 310, width: '100%', fontFamily: SERIF, fontSize: 210, lineHeight: 1, letterSpacing: -4, opacity: inT, transform: `translateY(${(1 - inT) * 30}px)` }}>{facts.city}</div>
      <div style={{ position: 'absolute', top: 540, width: '100%', fontFamily: SANS, fontSize: 30, letterSpacing: 10, opacity: inT * 0.9 }}>
        {facts.beds} BD · {facts.baths} BA · {facts.sqft.toLocaleString('en-US')} SQFT
      </div>
    </AbsoluteFill>
  );
};

/** C7: tiny tracked caps, then the room in big serif italic rising from a mask. */
const RoomTitle = ({ beat }: { beat: VoicedBeat }) => {
  const frame = useCurrentFrame();
  const k = ease(frame, 4, 10);
  const t = ease(frame, 9, 14);
  return (
    <AbsoluteFill style={{ color: CREAM, textAlign: 'center' }}>
      <div style={{ position: 'absolute', bottom: 700, width: '100%', fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: 14, opacity: k }}>{beat.kicker}</div>
      <div style={{ position: 'absolute', bottom: 540, width: '100%', height: 150, overflow: 'hidden' }}>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 140, lineHeight: 1.05, transform: `translateY(${(1 - t) * 150}px)` }}>{beat.title}</div>
      </div>
    </AbsoluteFill>
  );
};

/** Warm light leak that peaks on each cut (M2 without the blur). */
const LightLeak = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, FADE / 2, FADE + 6], [0, 0.55, 0], { extrapolateRight: 'clamp' });
  const x = interpolate(frame, [0, FADE + 6], [-20, 120]);
  return <AbsoluteFill style={{ background: `radial-gradient(circle at ${x}% 30%, rgba(255,170,80,0.9), rgba(255,120,40,0) 55%)`, opacity: o, mixBlendMode: 'screen' }} />;
};

const PriceEnd = ({ facts, ctaAtF }: { facts: ListingFacts; ctaAtF: number }) => {
  const frame = useCurrentFrame();
  const target = Number(facts.priceLabel.replace(/[^0-9]/g, ''));
  const v = interpolate(frame, [6, 36], [target * 0.6, target], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3) });
  const price = `$${(Math.round(v / 1000) * 1000).toLocaleString('en-US')}`;
  const line = ease(frame, 0, 18);
  return (
    <AbsoluteFill style={{ color: CREAM, textAlign: 'center' }}>
      <div style={{ position: 'absolute', top: 262, width: '100%', fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: 14, opacity: ease(frame, 0, 10) }}>{facts.locationLine}</div>
      <div style={{ position: 'absolute', top: 312, left: 540 - 160 * line, width: 320 * line, height: 2, background: CREAM }} />
      <div style={{ position: 'absolute', top: 340, width: '100%', fontFamily: SERIF, fontSize: 190, lineHeight: 1, opacity: ease(frame, 2, 8) }}>{price}</div>
      <div style={{ position: 'absolute', top: 560, width: '100%', fontFamily: SERIF, fontStyle: 'italic', fontSize: 64, opacity: ease(frame, ctaAtF, 10), transform: `translateY(${(1 - ease(frame, ctaAtF, 12)) * 20}px)` }}>
        Comment <span style={{ fontFamily: SANS, fontStyle: 'normal', fontWeight: 900, letterSpacing: 4 }}>{facts.ctaKeyword}</span> for a tour
      </div>
    </AbsoluteFill>
  );
};

const Fade = ({ children, frames }: { children: React.ReactNode; frames: number }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: frames === 0 ? 1 : ease(frame, 0, frames) }}>{children}</AbsoluteFill>;
};

const subtitleWord = (active: boolean, spoken: boolean) => ({ opacity: active ? 1 : spoken ? 0.85 : 0.45 });

export const EditorialVoiced = (props: VoicedProps) => {
  const { facts, beats, endStartS, endPhoto, words, durationS } = props;
  const total = toFrame(durationS);
  const starts = beats.map((b) => toFrame(b.startS + VOICE_OFFSET_S));
  const endF = toFrame(endStartS + VOICE_OFFSET_S);
  const ctaAtF = toFrame(wordAt(words, /^Comment/i, endStartS) + VOICE_OFFSET_S) - endF;
  return (
    <AbsoluteFill style={{ backgroundColor: '#111' }}>
      {beats.map((beat, i) => {
        const from = i === 0 ? 0 : starts[i] - FADE;
        const len = (starts[i + 1] ?? endF) - from;
        return (
          <Sequence key={beat.photo} from={from} durationInFrames={len + FADE}>
            <Fade frames={i === 0 ? 0 : FADE}>
              <PanPhoto src={beat.photo} frames={len + FADE} fromScale={1.0} toScale={1.05} style={{ filter: 'saturate(1.05) sepia(0.08)' }} />
              <Scrim from="bottom" strength={0.65} size={48} />
              {i === 0 ? <Scrim from="top" strength={0.55} size={40} /> : null}
              <WarmFinish />
              {i === 0 ? <Masthead facts={facts} frames={len} /> : <RoomTitle beat={beat} />}
            </Fade>
            {i === 0 ? null : <LightLeak />}
          </Sequence>
        );
      })}
      <Sequence from={endF - FADE} durationInFrames={total - endF + FADE}>
        <Fade frames={FADE}>
          <PanPhoto src={endPhoto} frames={total - endF + FADE} fromScale={1.1} toScale={1.0} style={{ filter: 'brightness(0.7) saturate(1.05) sepia(0.08)' }} />
          <WarmFinish />
          <PriceEnd facts={facts} ctaAtF={ctaAtF + FADE} />
        </Fade>
        <LightLeak />
      </Sequence>
      <SpokenCaptions
        words={words}
        maxWords={4}
        hideDuring={[[endStartS, durationS]]}
        style={{ position: 'absolute', top: 1400, left: 80, right: 160, textAlign: 'center', fontFamily: SANS, fontWeight: 600, fontSize: 38, letterSpacing: 3, textTransform: 'uppercase', color: CREAM, textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}
        wordStyle={subtitleWord}
      />
      <Soundtrack {...props} musicLevel={0.2} />
    </AbsoluteFill>
  );
};
