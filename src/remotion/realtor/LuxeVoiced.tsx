/**
 * Luxury showcase, voiced. Nat codes: G6 X17 C8 M4 P3 S3.
 * Bright full-bleed photos, a faint teal tone, shade only behind text, slow pushes, long crossfades, a hairline frame
 * and a "N°02 / 06 — KITCHEN" index. One huge frosted-glass word per photo, in the bottom third, refracts the room. Small tracked-caps captions. The price counts up on the end card.
 */
import { AbsoluteFill, Img, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { PanPhoto, SANS, SERIF, ease, photoSrc } from './shared';
import { PhraseCaptions, beatTiming, endCue } from './kit';
import { Soundtrack, type VoicedProps } from './voiced';
import type { ListingFacts } from './types';

const IVORY = '#F4EFE6';
const FADE = 16;
/** Baseline in the bottom third, so the room stays visible above it. */
const GLASS_Y = 1250;

/**
 * Light grade (G6, toned down 2026-11-12: the full dark layer hid the rooms). The middle of the photo stays clear;
 * shade only at the top (hook / index) and the bottom third (glass word + captions).
 */
const Grade = ({ end = false }: { end?: boolean }) => (
  <>
    <AbsoluteFill style={{ background: 'rgb(0,45,52)', opacity: 0.1, mixBlendMode: 'multiply' }} />
    <AbsoluteFill
      style={{
        background: end
          ? 'rgba(4,10,12,0.55)'
          : 'linear-gradient(180deg, rgba(4,10,12,0.55) 0%, rgba(4,10,12,0) 24%, rgba(4,10,12,0) 50%, rgba(4,10,12,0.72) 78%, rgba(4,10,12,0.8) 100%)',
      }}
    />
  </>
);

const ROOM_LABEL: Record<string, string> = {
  exterior: 'Outside', living: 'Living room', kitchen: 'Kitchen', bedroom: 'Bedroom', bath: 'Bath', dining: 'Dining', feature: 'Details', yard: 'Outdoors', pool: 'Pool', office: 'Office',
};

/** Thin ivory hairline frame: the "printed brochure" edge. */
const Hairline = () => <AbsoluteFill style={{ inset: 44, border: '1.5px solid rgba(244,239,230,0.45)', borderRadius: 4 }} />;

/** "N°02 / 06 — KITCHEN": tells the viewer where they are in the tour. */
const Index = ({ n, of, room }: { n: number; of: number; room: string }) => {
  const frame = useCurrentFrame();
  const pad = (x: number) => String(x).padStart(2, '0');
  return (
    <div style={{ position: 'absolute', top: 252, width: '100%', textAlign: 'center', color: IVORY, fontFamily: SANS, fontWeight: 600, fontSize: 26, letterSpacing: 10, opacity: ease(frame, 4, 14), textShadow: '0 1px 10px rgba(0,0,0,0.7)' }}>
      N°{pad(n)} <span style={{ opacity: 0.6 }}>/ {pad(of)}</span> <span style={{ display: 'inline-block', width: 56, height: 1.5, background: IVORY, verticalAlign: 'middle', margin: '0 18px', opacity: 0.7 }} /> {room.toUpperCase()}
    </div>
  );
};

/** Inter 900 caps run ~0.8 em wide: keep the word inside 940 px. */
const fit = (word: string) => Math.min(260, Math.floor(940 / (Math.max(3, word.length) * 0.82)));

/** X17: the word is a window of blurred, brighter room; a thin bright edge sells the glass. */
const GlassWord = ({ word, photo, id }: { word: string; photo: string; id: string }) => {
  const frame = useCurrentFrame();
  const a = ease(frame, 6, 18);
  const size = fit(word);
  const text = { x: 540, y: GLASS_Y, textAnchor: 'middle' as const, fontFamily: SANS, fontWeight: 900, fontSize: size, letterSpacing: size * 0.04 };
  return (
    <AbsoluteFill style={{ opacity: a, transform: `translateY(${(1 - a) * 40}px)` }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <clipPath id={id} clipPathUnits="userSpaceOnUse">
            <text {...text}>{word}</text>
          </clipPath>
        </defs>
      </svg>
      <AbsoluteFill style={{ clipPath: `url(#${id})` }}>
        <Img src={photoSrc(photo)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(18px) brightness(1.25) saturate(1.2)', transform: 'scale(1.12)' }} />
        <AbsoluteFill style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.35), rgba(255,255,255,0.04) 55%)' }} />
      </AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
        <text {...text} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2.5}>{word}</text>
      </svg>
    </AbsoluteFill>
  );
};

const PriceEnd = ({ facts, ctaAtF }: { facts: ListingFacts; ctaAtF: number }) => {
  const frame = useCurrentFrame();
  const target = Number(facts.priceLabel.replace(/[^0-9]/g, ''));
  const v = interpolate(frame, [6, 40], [target * 0.5, target], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3) });
  const price = `$${(Math.round(v / 1000) * 1000).toLocaleString('en-US')}`;
  return (
    <AbsoluteFill style={{ color: IVORY, textAlign: 'center' }}>
      <div style={{ position: 'absolute', top: 640, width: '100%', fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: 16, opacity: ease(frame, 0, 12) }}>OFFERED AT</div>
      <div style={{ position: 'absolute', top: 700, width: '100%', fontFamily: SERIF, fontSize: 180, lineHeight: 1, fontVariantNumeric: 'tabular-nums', opacity: ease(frame, 2, 10) }}>{price}</div>
      <div style={{ position: 'absolute', top: 920, width: '100%', fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: 10, opacity: ease(frame, 20, 12) }}>
        {facts.beds} BD · {facts.baths} BA · {facts.sqft.toLocaleString('en-US')} SQFT · {facts.city.toUpperCase()}
      </div>
      <div style={{ position: 'absolute', top: 1080, width: '100%', fontFamily: SERIF, fontStyle: 'italic', fontSize: 60, opacity: ease(frame, ctaAtF, 14) }}>
        Comment <span style={{ fontFamily: SANS, fontStyle: 'normal', fontWeight: 800, letterSpacing: 6, fontSize: 48 }}>{facts.ctaKeyword}</span> for a private showing
      </div>
    </AbsoluteFill>
  );
};

const Fade = ({ children, frames }: { children: React.ReactNode; frames: number }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: frames === 0 ? 1 : ease(frame, 0, frames) }}>{children}</AbsoluteFill>;
};

export const LuxeVoiced = (props: VoicedProps) => {
  const { facts, beats, endPhoto, words, endStartS, durationS } = props;
  const { starts, endF, total, lenOf } = beatTiming(props);
  return (
    <AbsoluteFill style={{ background: '#05090a' }}>
      {beats.map((beat, i) => {
        const from = i === 0 ? 0 : starts[i] - FADE;
        const frames = lenOf(i) + (i === 0 ? 0 : FADE);
        const word = (i === 0 ? facts.city : beat.title || beat.room).toUpperCase();
        return (
          <Sequence key={`${beat.photo}${i}`} from={from} durationInFrames={frames}>
            <Fade frames={i === 0 ? 0 : FADE}>
              <PanPhoto src={beat.photo} frames={frames} fromScale={1} toScale={1.06} style={{ filter: 'brightness(1.02) saturate(1) contrast(1.04)' }} />
              <Grade />
              <Hairline />
              <GlassWord word={word} photo={beat.photo} id={`glass-${i}`} />
              {i === 0 ? (
                <div style={{ position: 'absolute', top: 260, left: 90, right: 90, textAlign: 'center', color: IVORY, fontFamily: SERIF, fontStyle: 'italic', fontSize: 68, lineHeight: 1.1, textShadow: '0 2px 18px rgba(0,0,0,0.5)' }}>{facts.hookBottom}</div>
              ) : (
                <Index n={i} of={beats.length - 1} room={i === 1 && beat.room === 'exterior' ? 'Location' : (ROOM_LABEL[beat.room] ?? beat.room)} />
              )}
            </Fade>
          </Sequence>
        );
      })}
      <Sequence from={endF - FADE} durationInFrames={total - endF + FADE}>
        <Fade frames={FADE}>
          <PanPhoto src={endPhoto} frames={total - endF + FADE} fromScale={1.08} toScale={1} style={{ filter: 'brightness(0.75) saturate(0.9)' }} />
          <Grade end />
          <Hairline />
          <PriceEnd facts={facts} ctaAtF={endCue(props, /^comment$/i, endF) + FADE} />
        </Fade>
      </Sequence>
      <PhraseCaptions
        words={words}
        maxWords={5}
        reveal={false}
        upper
        hideDuring={[[endStartS, durationS]]}
        style={{ position: 'absolute', top: 1320, left: 90, right: 160, textAlign: 'center', fontFamily: SANS, fontWeight: 600, fontSize: 34, letterSpacing: 6, color: IVORY, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
      />
      <Soundtrack {...props} musicLevel={0.2} />
    </AbsoluteFill>
  );
};
