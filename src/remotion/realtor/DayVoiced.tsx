/**
 * "A day in this home", voiced. Nat codes: G5 V14 C6 M4 S3 S2.
 * Warm sepia full-bleed photos, slow crossfades. A frosted clock widget steps through the day (7:00 AM → night),
 * the light cools as the hours pass, and each moment gets a cream serif italic line.
 */
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { PanPhoto, SANS, SERIF, Scrim, WarmFinish, ease } from './shared';
import { PhraseCaptions, beatTiming, endCue } from './kit';
import { Soundtrack, type VoicedBeat, type VoicedProps } from './voiced';
import type { ListingFacts } from './types';

const CREAM = '#FBF3E4';
const BUTTER = '#FFE7A3';
const FADE = 12;

/** "7:30 AM" → 7.5; anything unreadable → null. */
const hourOf = (label: string): number | null => {
  const m = label.match(/(\d{1,2})(?::(\d{2}))?\s*([AP])\.?M/i);
  if (!m) return null;
  const h = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'P' ? 12 : 0);
  return h + Number(m[2] ?? 0) / 60;
};

/** Evening warms, night goes blue. */
const Light = ({ hour }: { hour: number }) => {
  const dusk = interpolate(hour, [16, 19], [0, 0.32], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const night = interpolate(hour, [19.5, 21], [0, 0.42], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <>
      <AbsoluteFill style={{ background: 'rgb(255,120,40)', opacity: dusk, mixBlendMode: 'soft-light' }} />
      <AbsoluteFill style={{ background: 'rgb(20,30,80)', opacity: night, mixBlendMode: 'multiply' }} />
    </>
  );
};

/** V14-style frosted widget: the time, a sun dot crossing the day, then the moment in serif italic. */
const Clock = ({ beat, hour }: { beat: VoicedBeat; hour: number }) => {
  const frame = useCurrentFrame();
  const inT = ease(frame, 2, 12);
  const line = ease(frame, 8, 14);
  const dayT = interpolate(hour, [6, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 250, left: 240, width: 600, padding: '26px 36px', borderRadius: 44, background: 'rgba(255,250,240,0.22)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.35)', opacity: inT, transform: `translateY(${(1 - inT) * -24}px)`, color: CREAM, textAlign: 'center' }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 104, lineHeight: 1, letterSpacing: -2, fontVariantNumeric: 'tabular-nums' }}>{beat.kicker}</div>
        <div style={{ position: 'relative', height: 6, marginTop: 22, borderRadius: 3, background: 'rgba(255,255,255,0.3)' }}>
          <div style={{ position: 'absolute', left: `calc(${dayT * 100}% - 13px)`, top: -10, width: 26, height: 26, borderRadius: 13, background: hour >= 19.5 ? '#C9D6FF' : BUTTER, boxShadow: `0 0 18px ${hour >= 19.5 ? '#C9D6FF' : BUTTER}` }} />
        </div>
      </div>
      <div style={{ position: 'absolute', top: 520, width: '100%', textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: 92, color: BUTTER, opacity: line, transform: `translateY(${(1 - line) * 30}px)`, textShadow: '0 4px 24px rgba(0,0,0,0.45)' }}>
        {beat.title}
      </div>
    </AbsoluteFill>
  );
};

const HookTitle = ({ facts }: { facts: ListingFacts }) => {
  const frame = useCurrentFrame();
  const a = ease(frame, 0, 14);
  return (
    <AbsoluteFill style={{ color: CREAM, textAlign: 'center' }}>
      <div style={{ position: 'absolute', top: 280, width: '100%', fontFamily: SANS, fontWeight: 600, fontSize: 32, letterSpacing: 12, opacity: a }}>{facts.beds} BD · {facts.baths} BA · {facts.city.toUpperCase()}</div>
      <div style={{ position: 'absolute', top: 340, left: 80, right: 80, fontFamily: SERIF, fontSize: 140, lineHeight: 1, opacity: a, transform: `translateY(${(1 - a) * 30}px)` }}>{facts.hookBottom}</div>
    </AbsoluteFill>
  );
};

const EndCard = ({ facts, ctaAtF }: { facts: ListingFacts; ctaAtF: number }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ color: CREAM, textAlign: 'center' }}>
      <div style={{ position: 'absolute', top: 360, width: '100%', fontFamily: SANS, fontWeight: 600, fontSize: 32, letterSpacing: 14, opacity: ease(frame, 0, 12) }}>OFFERED AT</div>
      <div style={{ position: 'absolute', top: 420, width: '100%', fontFamily: SERIF, fontSize: 200, lineHeight: 1, opacity: ease(frame, 4, 12) }}>{facts.priceLabel}</div>
      <div style={{ position: 'absolute', top: 680, width: '100%', fontFamily: SERIF, fontStyle: 'italic', fontSize: 70, color: BUTTER, opacity: ease(frame, ctaAtF, 12) }}>
        Comment <span style={{ fontFamily: SANS, fontStyle: 'normal', fontWeight: 900, letterSpacing: 4 }}>{facts.ctaKeyword}</span> to spend a day here
      </div>
    </AbsoluteFill>
  );
};

const Fade = ({ children, frames }: { children: React.ReactNode; frames: number }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: frames === 0 ? 1 : ease(frame, 0, frames) }}>{children}</AbsoluteFill>;
};

export const DayVoiced = (props: VoicedProps) => {
  const { facts, beats, endPhoto, words, endStartS, durationS } = props;
  const { starts, endF, total, lenOf } = beatTiming(props);
  const hours = beats.reduce<number[]>((acc, b) => [...acc, hourOf(b.kicker) ?? acc[acc.length - 1] ?? 7], []);
  return (
    <AbsoluteFill style={{ background: '#140d06' }}>
      {beats.map((beat, i) => {
        const from = i === 0 ? 0 : starts[i] - FADE;
        const timed = hourOf(beat.kicker) !== null;
        return (
          <Sequence key={`${beat.photo}${i}`} from={from} durationInFrames={lenOf(i) + (i === 0 ? 0 : FADE)}>
            <Fade frames={i === 0 ? 0 : FADE}>
              <PanPhoto src={beat.photo} frames={lenOf(i) + FADE} fromScale={1} toScale={1.06} style={{ filter: 'saturate(1.05) sepia(0.14)' }} />
              <Light hour={hours[i]} />
              <Scrim from="top" strength={0.55} size={42} />
              <Scrim from="bottom" strength={0.5} size={35} />
              <WarmFinish />
              {i === 0 ? <HookTitle facts={facts} /> : timed ? <Clock beat={beat} hour={hours[i]} /> : null}
            </Fade>
          </Sequence>
        );
      })}
      <Sequence from={endF - FADE} durationInFrames={total - endF + FADE}>
        <Fade frames={FADE}>
          <PanPhoto src={endPhoto} frames={total - endF + FADE} fromScale={1.08} toScale={1} style={{ filter: 'brightness(0.5) sepia(0.2)' }} />
          <Light hour={20.5} />
          <EndCard facts={facts} ctaAtF={endCue(props, /^comment$/i, endF) + FADE} />
        </Fade>
      </Sequence>
      <PhraseCaptions
        words={words}
        maxWords={5}
        reveal={false}
        hideDuring={[[endStartS, durationS]]}
        style={{ position: 'absolute', top: 1330, left: 90, right: 160, textAlign: 'center', fontFamily: SANS, fontWeight: 600, fontSize: 46, color: CREAM, textShadow: '0 2px 14px rgba(0,0,0,0.7)' }}
      />
      <Soundtrack {...props} musicLevel={0.2} />
    </AbsoluteFill>
  );
};
