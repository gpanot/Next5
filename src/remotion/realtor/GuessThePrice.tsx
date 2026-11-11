/**
 * Viral format 2 — "Guess the price". Facts stack up as the tour plays, price is hidden until the end,
 * then counts up big. The comment bait ("how close were you?") drives replies.
 * Nat codes: H5 C5 P3 V6 M4.
 */
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { FPS, usePop } from './shared';
import { BlurFill, CutFlash, HeroPhoto, NativeBox, TT, outlineText } from './viral';
import type { ListingFacts, ListingVideoProps } from './types';

const PHOTO_TOP = 430;
const REVEAL_FRAMES = 105;

const factChips = (facts: ListingFacts, titles: string[]): string[] => [
  `${facts.beds} beds · ${facts.baths} baths`,
  `${facts.sqft.toLocaleString('en-US')} sqft`,
  ...titles.slice(1).map((t) => t.toLowerCase()),
];

const Chip = ({ text, delay }: { text: string; delay: number }) => {
  const p = usePop(delay, 12);
  return (
    <div style={{ alignSelf: 'flex-start', background: 'rgba(0,0,0,0.72)', color: '#fff', fontFamily: TT, fontWeight: 800, fontSize: 52, padding: '8px 24px', borderRadius: 14, transform: `translateX(${(1 - p) * -60}px)`, opacity: p }}>
      ✓ {text}
    </div>
  );
};

/** Chips accumulate at the bottom-left of the photo; the last 4 stay visible. */
const Chips = ({ chips, upTo }: { chips: string[]; upTo: number }) => {
  const shown = chips.slice(0, upTo + 1).slice(-4);
  const start = Math.max(0, upTo + 1 - 4);
  return (
    <div style={{ position: 'absolute', left: 60, bottom: 460, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {shown.map((c, i) => (
        <Chip key={c} text={c} delay={start + i === upTo ? 6 : -100} />
      ))}
    </div>
  );
};

const Reveal = ({ facts, photo }: { facts: ListingFacts; photo: string }) => {
  const frame = useCurrentFrame();
  const target = Number(facts.priceLabel.replace(/[^0-9]/g, ''));
  const value = Math.round(interpolate(frame, [8, 40], [0, target], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3) }) / 1000) * 1000;
  const land = usePop(40, 9);
  const ask = usePop(52, 11);
  return (
    <AbsoluteFill>
      <BlurFill src={photo} dim={0.4} />
      <CutFlash />
      <div style={{ position: 'absolute', top: 560, width: '100%', textAlign: 'center' }}>
        <span style={outlineText(70)}>it’s listed at…</span>
      </div>
      <div style={{ position: 'absolute', top: 680, width: '100%', textAlign: 'center', transform: `scale(${1 + (1 - land) * 0.25})` }}>
        <span style={{ ...outlineText(190), color: land > 0.5 ? '#FFD43B' : '#fff' }}>${value.toLocaleString('en-US')}</span>
      </div>
      <NativeBox lines={['how close were you? 👇']} size={68} style={{ position: 'absolute', top: 960, width: '100%', transform: `scale(${ask})` }} />
      <div style={{ position: 'absolute', top: 1110, width: '100%', textAlign: 'center', opacity: ask }}>
        <span style={outlineText(54)}>comment “{facts.ctaKeyword}” for a tour</span>
      </div>
    </AbsoluteFill>
  );
};

export const GuessThePrice = ({ facts, beats }: ListingVideoProps) => {
  const per = Math.floor((15 * FPS - REVEAL_FRAMES) / beats.length);
  const revealStart = per * beats.length;
  const chips = factChips(facts, beats.map((b) => `${b.kicker} ${b.title}`));
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {beats.map((beat, i) => (
        <Sequence key={beat.photo} from={i * per} durationInFrames={per}>
          <BlurFill src={beat.photo} />
          <HeroPhoto src={beat.photo} frames={per} top={PHOTO_TOP} push={1.05} />
          {i > 0 ? <CutFlash /> : null}
          <Chips chips={chips} upTo={Math.min(i, chips.length - 1)} />
        </Sequence>
      ))}
      <Sequence from={0} durationInFrames={revealStart}>
        <NativeBox lines={['Guess the price 👀', `${facts.city}, ${facts.state}`]} size={74} style={{ position: 'absolute', top: 240, width: '100%' }} />
      </Sequence>
      <Sequence from={revealStart} durationInFrames={REVEAL_FRAMES}>
        <Reveal facts={facts} photo={beats[0].photo} />
      </Sequence>
    </AbsoluteFill>
  );
};
