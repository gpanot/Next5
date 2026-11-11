/**
 * Viral format 1 — "What $X gets you in {city}". Persistent native-text header, big 4:5 photos,
 * fast hard cuts (~1.25 s) with a flash, one room label per shot, CTA on the location beat.
 * Nat codes: H5 (kept on) C2 M3 M1 V6.
 */
import { AbsoluteFill, Sequence } from 'remotion';
import { FPS, usePop } from './shared';
import { BlurFill, CutFlash, HeroPhoto, NativeBox, outlineText } from './viral';
import type { ListingFacts, ListingVideoProps } from './types';

const HEADER_TOP = 240;
const PHOTO_TOP = 430;
const END_FRAMES = 75;

const shortPrice = (label: string) => label.replace(/,000$/, 'K');

const Label = ({ text }: { text: string }) => {
  const p = usePop(1, 11);
  return (
    <div style={{ position: 'absolute', top: 1270, width: '100%', textAlign: 'center', transform: `scale(${0.6 + p * 0.4})`, opacity: p }}>
      <span style={outlineText(84)}>{text}</span>
    </div>
  );
};

const Header = ({ facts }: { facts: ListingFacts }) => (
  <NativeBox
    lines={[`What ${shortPrice(facts.priceLabel)} gets you`, `in ${facts.city}, ${facts.state} 🍑`]}
    size={70}
    style={{ position: 'absolute', top: HEADER_TOP, width: '100%' }}
  />
);

const EndBeat = ({ facts, photo }: { facts: ListingFacts; photo: string }) => {
  const a = usePop(4, 11);
  const b = usePop(16, 10);
  return (
    <AbsoluteFill>
      <BlurFill src={photo} />
      <HeroPhoto src={photo} frames={END_FRAMES} top={PHOTO_TOP} push={1.08} />
      <CutFlash />
      <div style={{ position: 'absolute', top: 1000, width: '100%', textAlign: 'center', transform: `scale(${a})` }}>
        <span style={outlineText(80)}>{facts.locationLine.toLowerCase()} ⚾</span>
      </div>
      <NativeBox
        lines={[`Comment "${facts.ctaKeyword}" 👇`, 'for a private tour']}
        size={68}
        bg="#FFD43B"
        style={{ position: 'absolute', top: 1160, width: '100%', transform: `scale(${b})` }}
      />
    </AbsoluteFill>
  );
};

export const WhatYouGet = ({ facts, reel, endPhoto }: ListingVideoProps) => {
  const per = Math.floor((15 * FPS - END_FRAMES) / reel.length);
  const endStart = per * reel.length;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {reel.map((shot, i) => (
        <Sequence key={shot.photo} from={i * per} durationInFrames={per}>
          <BlurFill src={shot.photo} />
          <HeroPhoto src={shot.photo} frames={per} top={PHOTO_TOP} push={1.06} />
          {i > 0 ? <CutFlash /> : null}
          <Label text={shot.label} />
        </Sequence>
      ))}
      <Sequence from={endStart} durationInFrames={15 * FPS - endStart}>
        <EndBeat facts={facts} photo={endPhoto} />
      </Sequence>
      <Header facts={facts} />
    </AbsoluteFill>
  );
};
