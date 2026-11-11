/**
 * "Rate this house 1–10", voiced (25 s). Nat codes: H5 X7 C5 M1 V6 S1 S3.
 * Each spoken "Check." ticks the room in the checklist with a ping, a green stamp and a punch-in on the photo.
 * Big word-synced captions mid-frame (yellow active word); the end pops the 1–10 bubbles on "number".
 */
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { FPS, usePop } from './shared';
import { BlurFill, CutFlash, HeroPhoto, NativeBox, TT, outlineText } from './viral';
import { Soundtrack, SpokenCaptions, VOICE_OFFSET_S, toFrame, wordAt, type SpokenWord, type VoicedBeat, type VoicedProps } from './voiced';
import type { ListingFacts } from './types';

const PHOTO_TOP = 430;
const GREEN = '#2BD46B';
const YELLOW = '#FFD43B';

/** Seconds (video time) of every spoken "Check." */
const checkTimes = (words: SpokenWord[]) => words.filter((w) => /^check/i.test(w.word)).map((w) => w.startS + VOICE_OFFSET_S);

/** Small punch-in on the photo at each check (M1). */
const punchAt = (t: number, checks: number[]) => {
  const last = checks.filter((c) => c <= t).pop();
  if (last === undefined) return 1;
  return interpolate(t - last, [0, 0.08, 0.5], [1, 1.07, 1.03], { extrapolateRight: 'clamp' });
};

const Row = ({ text, checkedAt, t }: { text: string; checkedAt: number | undefined; t: number }) => {
  const on = checkedAt !== undefined && t >= checkedAt;
  const k = on ? Math.min(1, (t - (checkedAt ?? 0)) / 0.15) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: TT, fontWeight: 800, fontSize: 46, color: '#fff', opacity: on ? 1 : 0.8 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, border: `4px solid ${on ? GREEN : '#fff'}`, background: on ? GREEN : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + Math.sin(k * Math.PI) * 0.3})` }}>
        {on ? <span style={{ fontSize: 34 }}>✓</span> : null}
      </div>
      {text}
    </div>
  );
};

type CheckItem = { text: string; showAt: number; checkedAt: number | undefined };

const Checklist = ({ items }: { items: CheckItem[] }) => {
  const t = useCurrentFrame() / FPS;
  const shown = items.filter((i) => t >= i.showAt).slice(-4);
  if (shown.length === 0) return null;
  return (
    <div style={{ position: 'absolute', left: 60, bottom: 450, background: 'rgba(10,10,12,0.74)', borderRadius: 24, padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {shown.map((i) => <Row key={i.text} text={i.text} checkedAt={i.checkedAt} t={t} />)}
    </div>
  );
};

/** Big green stamp for half a second on each check. */
const Stamp = () => {
  const p = usePop(0, 9);
  const frame = useCurrentFrame();
  const o = interpolate(frame, [10, 16], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', top: 560, right: 150, width: 170, height: 170, borderRadius: 85, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${p}) rotate(${(1 - p) * -30}deg)`, opacity: o, boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
      <span style={{ fontSize: 110, color: '#fff', fontWeight: 900 }}>✓</span>
    </div>
  );
};

const Beat = ({ beat, frames, checks, startF }: { beat: VoicedBeat; frames: number; checks: number[]; startF: number }) => {
  const frame = useCurrentFrame();
  const scale = punchAt((startF + frame) / FPS, checks);
  return (
    <AbsoluteFill>
      <BlurFill src={beat.photo} />
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: '50% 40%' }}>
        <HeroPhoto src={beat.photo} frames={frames} top={PHOTO_TOP} push={1.05} />
      </div>
      <CutFlash />
    </AbsoluteFill>
  );
};

const Bubble = ({ n, delay }: { n: number; delay: number }) => {
  const p = usePop(delay + n * 2, 10);
  return (
    <div style={{ width: 132, height: 132, borderRadius: 66, background: n === 10 ? YELLOW : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TT, fontWeight: 900, fontSize: 64, color: '#000', transform: `scale(${p})` }}>{n}</div>
  );
};

const RatingEnd = ({ facts, photo, bubblesAtF, ctaAtF }: { facts: ListingFacts; photo: string; bubblesAtF: number; ctaAtF: number }) => {
  const ask = usePop(0, 11);
  const cta = usePop(ctaAtF, 11);
  return (
    <AbsoluteFill>
      <BlurFill src={photo} dim={0.45} />
      <CutFlash />
      <NativeBox lines={['your rating? 👇', 'drop a number']} size={84} bg={YELLOW} style={{ position: 'absolute', top: 470, width: '100%', transform: `scale(${ask})` }} />
      <div style={{ position: 'absolute', top: 760, left: 140, width: 800, display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
        {Array.from({ length: 10 }, (_, i) => <Bubble key={i} n={i + 1} delay={bubblesAtF} />)}
      </div>
      <NativeBox lines={[`comment "${facts.ctaKeyword}"`, 'to see it in person 🏡']} size={64} style={{ position: 'absolute', top: 1110, width: '100%', transform: `scale(${cta})` }} />
    </AbsoluteFill>
  );
};

const captionWord = (active: boolean) => ({ color: active ? YELLOW : '#fff' });

export const RateVoiced = (props: VoicedProps) => {
  const { facts, beats, endStartS, endPhoto, words, durationS } = props;
  const total = toFrame(durationS);
  const starts = beats.map((b) => toFrame(b.startS + VOICE_OFFSET_S));
  const endF = toFrame(endStartS + VOICE_OFFSET_S);
  const checks = checkTimes(words);
  const items: CheckItem[] = beats.filter((b) => b.checkAtS !== undefined).map((b) => ({
    text: `${b.kicker} ${b.title}`.trim().toLowerCase(),
    showAt: b.startS + VOICE_OFFSET_S,
    checkedAt: (b.checkAtS ?? 0) + VOICE_OFFSET_S,
  }));
  const bubblesAtF = toFrame(wordAt(words, /^number/i, endStartS) + VOICE_OFFSET_S) - endF;
  const ctaAtF = toFrame(wordAt(words, /^comment$/i, endStartS) + VOICE_OFFSET_S) - endF;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {beats.map((beat, i) => (
        <Sequence key={beat.photo} from={starts[i]} durationInFrames={(starts[i + 1] ?? endF) - starts[i]}>
          <Beat beat={beat} frames={(starts[i + 1] ?? endF) - starts[i]} checks={checks} startF={starts[i]} />
        </Sequence>
      ))}
      <Sequence from={0} durationInFrames={endF}>
        <Checklist items={items} />
        <NativeBox lines={['Rate this house 1–10 🏡', `${facts.priceLabel.replace(/,000$/, 'K')} in ${facts.city}, ${facts.state}`]} size={68} style={{ position: 'absolute', top: 240, width: '100%' }} />
        <SpokenCaptions
          words={words}
          maxWords={3}
          style={{ position: 'absolute', top: 820, left: 70, right: 150, textAlign: 'center', ...outlineText(88) }}
          wordStyle={captionWord}
        />
      </Sequence>
      {checks.map((c) => (
        <Sequence key={c} from={toFrame(c)} durationInFrames={18}><Stamp /></Sequence>
      ))}
      <Sequence from={endF} durationInFrames={total - endF}>
        <RatingEnd facts={facts} photo={endPhoto} bubblesAtF={bubblesAtF} ctaAtF={ctaAtF} />
      </Sequence>
      <Soundtrack {...props} musicLevel={0.14} />
    </AbsoluteFill>
  );
};
