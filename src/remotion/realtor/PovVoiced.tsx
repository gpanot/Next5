/**
 * "POV: you live here now", voiced. Nat codes: H5 C1 M1 M5 S1.
 * Full-bleed photos with two framings (wide, then tight) on alternate beats and a punch-in on every cut.
 * Captions reveal word by word in sentence case, the beat's keyword in yellow. Title box for the first 3 s.
 */
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { FPS, PanPhoto, Scrim, usePop } from './shared';
import { CutFlash, NativeBox, outlineText } from './viral';
import { PhraseCaptions, beatTiming, endCue, shortPrice, wrapLines } from './kit';
import { Soundtrack, type VoicedBeat, type VoicedProps } from './voiced';
import type { ListingFacts } from './types';

const YELLOW = '#FFD43B';

/** M1: the shot lands 6% tight and settles in 6 frames. */
const Punch = ({ children }: { children: React.ReactNode }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, 6], [1.06, 1], { extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3) });
  return <AbsoluteFill style={{ transform: `scale(${s})` }}>{children}</AbsoluteFill>;
};

const Beat = ({ beat, frames, tight }: { beat: VoicedBeat; frames: number; tight: boolean }) => (
  <AbsoluteFill>
    <Punch>
      <PanPhoto src={beat.photo} frames={frames} fromScale={tight ? 1.18 : 1} toScale={tight ? 1.24 : 1.06} />
    </Punch>
    <Scrim from="top" strength={0.45} size={30} />
    <Scrim from="bottom" strength={0.6} size={45} />
    <CutFlash frames={3} />
  </AbsoluteFill>
);

/** H5: one flat box with the hook, gone by 3 s. */
const HookBox = ({ text, frames }: { text: string; frames: number }) => {
  const frame = useCurrentFrame();
  const pop = usePop(0, 12);
  const out = interpolate(frame, [frames - 6, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <NativeBox lines={wrapLines(text, 20)} size={76} style={{ position: 'absolute', top: 290, width: '100%', transform: `scale(${pop})`, opacity: out }} />;
};

const EndCard = ({ facts, photo, frames, ctaAtF }: { facts: ListingFacts; photo: string; frames: number; ctaAtF: number }) => {
  const price = usePop(4, 12);
  const cta = usePop(ctaAtF, 10);
  return (
    <AbsoluteFill>
      <PanPhoto src={photo} frames={frames} fromScale={1.12} toScale={1} style={{ filter: 'brightness(0.55)' }} />
      <CutFlash />
      <div style={{ position: 'absolute', top: 520, width: '100%', textAlign: 'center', ...outlineText(170), transform: `scale(${price})` }}>{shortPrice(facts.priceLabel)}</div>
      <div style={{ position: 'absolute', top: 720, width: '100%', textAlign: 'center', ...outlineText(58), opacity: price }}>{facts.city}, {facts.state} · {facts.beds} bd · {facts.baths} ba</div>
      <NativeBox lines={[`comment "${facts.ctaKeyword}" 🔑`, 'it could be yours']} size={70} bg={YELLOW} style={{ position: 'absolute', top: 960, width: '100%', transform: `scale(${cta})` }} />
    </AbsoluteFill>
  );
};

export const PovVoiced = (props: VoicedProps) => {
  const { facts, beats, endPhoto, words, endStartS, durationS } = props;
  const { starts, endF, total, lenOf } = beatTiming(props);
  const hookFrames = Math.min(3 * FPS, (starts[1] ?? endF) + 20);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {beats.map((beat, i) => (
        <Sequence key={`${beat.photo}${i}`} from={starts[i]} durationInFrames={lenOf(i)}>
          <Beat beat={beat} frames={lenOf(i)} tight={i % 2 === 1} />
        </Sequence>
      ))}
      <Sequence from={endF} durationInFrames={total - endF}>
        <EndCard facts={facts} photo={endPhoto} frames={total - endF} ctaAtF={endCue(props, /^comment$/i, endF)} />
      </Sequence>
      <Sequence from={0} durationInFrames={hookFrames}>
        <HookBox text={facts.hookBottom} frames={hookFrames} />
      </Sequence>
      <PhraseCaptions
        words={words}
        maxWords={4}
        keywords={beats.map((b) => b.title)}
        hideDuring={[[0, hookFrames / FPS - 0.2], [endStartS, durationS]]}
        style={{ position: 'absolute', top: 1180, left: 70, right: 150, textAlign: 'center', ...outlineText(78) }}
      />
      <Soundtrack {...props} musicLevel={0.15} />
    </AbsoluteFill>
  );
};
