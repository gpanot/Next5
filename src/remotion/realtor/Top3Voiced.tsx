/**
 * "3 things I love about this home", voiced. Nat codes: V20 V11 V3 M1 C5 S1.
 * A fixed series header with progress dots, a big yellow outlined number per reason, the reason in a yellow box,
 * and two photos per reason (hard cut halfway). The end lists the reasons back and asks for a favourite.
 */
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { usePop } from './shared';
import { BlurFill, CutFlash, HeroPhoto, NativeBox, TT, outlineText } from './viral';
import { PhraseCaptions, beatTiming, endCue, shortPrice } from './kit';
import { Soundtrack, type VoicedBeat, type VoicedProps } from './voiced';
import type { ListingFacts } from './types';

const YELLOW = '#FFD43B';
const PHOTO_TOP = 400;
const PHOTO_H = 1000;

const Header = ({ title, count, current }: { title: string; count: number; current: number }) => (
  <div style={{ position: 'absolute', top: 236, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
    <NativeBox lines={[`${title} 🏡`]} size={60} />
    <div style={{ display: 'flex', gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ width: i === current ? 44 : 16, height: 16, borderRadius: 8, background: i <= current ? YELLOW : 'rgba(255,255,255,0.5)' }} />
      ))}
    </div>
  </div>
);

const Reason = ({ beat, n, frames }: { beat: VoicedBeat; n: number; frames: number }) => {
  const frame = useCurrentFrame();
  const half = Math.round(frames / 2);
  const second = beat.photo2 && frame >= half;
  const photo = second ? beat.photo2! : beat.photo;
  const num = usePop(0, 10);
  const label = usePop(5, 12);
  return (
    <AbsoluteFill>
      <BlurFill src={photo} />
      <HeroPhoto src={photo} frames={second ? frames - half : half} top={PHOTO_TOP} height={PHOTO_H} push={1.06} />
      <div style={{ position: 'absolute', top: PHOTO_TOP + 10, left: 60, ...outlineText(240), color: YELLOW, transform: `scale(${num}) rotate(-6deg)`, transformOrigin: '20% 50%' }}>#{n}</div>
      <NativeBox lines={[beat.title]} size={74} bg={YELLOW} style={{ position: 'absolute', top: 1150, width: '100%', transform: `scale(${label})` }} />
      {second ? <Sequence from={half}><CutFlash /></Sequence> : null}
      <CutFlash />
    </AbsoluteFill>
  );
};

const Intro = ({ beat, facts, frames }: { beat: VoicedBeat; facts: ListingFacts; frames: number }) => {
  const pop = usePop(4, 12);
  return (
    <AbsoluteFill>
      <BlurFill src={beat.photo} />
      <HeroPhoto src={beat.photo} frames={frames} top={PHOTO_TOP} height={PHOTO_H} push={1.06} />
      <div style={{ position: 'absolute', top: 1060, width: '100%', textAlign: 'center', ...outlineText(110), transform: `scale(${pop})` }}>{facts.city}, {facts.state}</div>
    </AbsoluteFill>
  );
};

const EndCard = ({ facts, photo, reasons, ctaAtF, askAtF }: { facts: ListingFacts; photo: string; reasons: string[]; ctaAtF: number; askAtF: number }) => {
  const ask = usePop(askAtF, 11);
  const cta = usePop(ctaAtF, 11);
  const price = usePop(0, 12);
  return (
    <AbsoluteFill>
      <BlurFill src={photo} dim={0.4} />
      <CutFlash />
      <div style={{ position: 'absolute', top: 300, width: '100%', textAlign: 'center', ...outlineText(170), transform: `scale(${price})` }}>{shortPrice(facts.priceLabel)}</div>
      <div style={{ position: 'absolute', top: 520, left: 110, right: 150, display: 'flex', flexDirection: 'column', gap: 26 }}>
        {reasons.map((r, i) => (
          <ReasonChip key={r} n={i + 1} text={r} delay={i * 4} />
        ))}
      </div>
      <NativeBox lines={['which one is your fave? 👇']} size={76} bg={YELLOW} style={{ position: 'absolute', top: 1040, width: '100%', transform: `scale(${ask})` }} />
      <NativeBox lines={[`comment "${facts.ctaKeyword}"`, 'for a private showing']} size={64} style={{ position: 'absolute', top: 1200, width: '100%', transform: `scale(${cta})` }} />
    </AbsoluteFill>
  );
};

const ReasonChip = ({ n, text, delay }: { n: number; text: string; delay: number }) => {
  const p = usePop(delay, 12);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, transform: `translateX(${(1 - p) * -60}px)`, opacity: p }}>
      <div style={{ width: 100, height: 100, flexShrink: 0, borderRadius: 50, background: YELLOW, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TT, fontWeight: 900, fontSize: 58 }}>{n}</div>
      <div style={{ ...outlineText(68) }}>{text}</div>
    </div>
  );
};

export const Top3Voiced = (props: VoicedProps) => {
  const { facts, beats, endPhoto, words, endStartS, durationS } = props;
  const { starts, endF, total, lenOf } = beatTiming(props);
  const reasons = beats.slice(1);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {beats.map((beat, i) => (
        <Sequence key={`${beat.photo}${i}`} from={starts[i]} durationInFrames={lenOf(i)}>
          {i === 0 ? <Intro beat={beat} facts={facts} frames={lenOf(i)} /> : <Reason beat={beat} n={i} frames={lenOf(i)} />}
          <Header title={facts.hookBottom} count={reasons.length} current={i - 1} />
        </Sequence>
      ))}
      <Sequence from={endF} durationInFrames={total - endF}>
        <EndCard facts={facts} photo={endPhoto} reasons={reasons.map((r) => r.title)} askAtF={endCue(props, /^which$/i, endF)} ctaAtF={endCue(props, /^comment$/i, endF)} />
      </Sequence>
      <PhraseCaptions
        words={words}
        maxWords={3}
        keywords={reasons.map((b) => b.title)}
        hideDuring={[[endStartS, durationS]]}
        style={{ position: 'absolute', top: 1290, left: 70, right: 150, textAlign: 'center', ...outlineText(62) }}
      />
      <Soundtrack {...props} musicLevel={0.14} />
    </AbsoluteFill>
  );
};
