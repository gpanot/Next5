'use client';

import { useEffect, useState } from 'react';
import type { ProspectViewDay } from '../../types/admin/prospects';
import { PostFrame } from './PostCard';
import { chipDay, postTime } from './postLabels';
import { SpotlightSchedule } from './Spotlight';
import { SHOWREEL_CSS, T, TALL, TALL_ROW, tallDelay, tallScroll, wideDelay } from './showreelStyles';

export type ShowreelFormat = 'wide' | 'tall';

const HEADLINE = 'days of content that brings you customers.'.split(' ');
const anim = (name: string, delay: number, dur = 0.55): React.CSSProperties => ({ animation: `${name} ${dur}s ease-out ${delay}s both` });

/** The headline: "30 days of content that brings you customers.", word by word. */
function Headline({ size }: { size: string }) {
  return (
    <h1 className="m-0 max-w-[22ch] text-center font-display font-[800] leading-[1.02] tracking-[-0.035em] text-app-ink" style={{ fontSize: size }}>
      {['30', ...HEADLINE].map((w, i) => (
        <span key={i} className="inline-block" style={{ ...anim('sr-word', T.words + i * 0.1), marginRight: '0.26em' }}>{w}</span>
      ))}
    </h1>
  );
}

/** One post: still, a "ready" check, and its day. */
function ShowCard({ day, delay, labelH }: { day: ProspectViewDay; delay: number; labelH?: number }) {
  return (
    <div className="flex min-w-0 flex-col" style={anim('sr-pop', delay, 0.6)}>
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[1.6vh] bg-zinc-900 shadow-sm">
        <PostFrame day={day} showState={false} />
        <span aria-hidden className="absolute right-[0.8vh] top-[0.8vh] grid h-[3vh] w-[3vh] place-items-center rounded-full bg-app-ink text-app-bg" style={anim('sr-check', delay + 0.45, 0.3)}>
          <svg viewBox="0 0 24 24" className="h-[60%] w-[60%]" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
        </span>
      </div>
      <p className="m-0 truncate font-semibold text-app-ink" style={{ ...anim('sr-fade', delay + 0.2), fontSize: '1.7vh', marginTop: '0.8vh', height: labelH ? `${labelH}vh` : undefined }}>
        {chipDay(day.at)} · {postTime(day.at)}
      </p>
    </div>
  );
}

/** The closing frame: the comment prompt pulses over the dimmed grid. */
function EndCard() {
  return (
    <div className="absolute inset-x-0 bottom-[8vh] z-10 flex flex-col items-center gap-[1.6vh]" style={anim('sr-fade', T.cta, 0.6)}>
      <span className="rounded-full bg-app-ink px-[4vh] py-[2vh] font-semibold text-app-bg" style={{ fontSize: '3.4vh', animation: `sr-pulse 1.2s ease-in-out ${T.cta + 0.6}s infinite` }}>Comment &ldquo;Next5&rdquo;</span>
      <span className="font-display font-[800] text-app-ink" style={{ fontSize: '3vh' }}>Get your posts.</span>
    </div>
  );
}

const Wordmark = () => (
  <span className="absolute left-[3vh] top-[2.4vh] z-10 font-display font-[800] tracking-[0.14em] text-app-ink" style={{ fontSize: '2.4vh' }}>NEXT5</span>
);

const Sub = ({ size }: { size: string }) => (
  <p className="m-0 text-center text-app-muted" style={{ ...anim('sr-fade', T.sub, 0.7), fontSize: size }}>Captions written. A day to post each one.</p>
);

function WideStage({ days }: { days: ProspectViewDay[] }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-app-bg" style={{ gap: '2.6vh' }}>
      <Wordmark />
      <Headline size="7vh" />
      <Sub size="2.8vh" />
      <ul className="m-0 grid list-none p-0" style={{ gridTemplateColumns: 'repeat(7, 13.4vh)', gap: '1.6vh 1.4vw', animation: `sr-dim .7s ease-in ${T.dim}s both` }}>
        {days.map((d, i) => <li key={`${d.day}-${d.kind}`}><ShowCard day={d} delay={wideDelay(i)} /></li>)}
      </ul>
      <EndCard />
      <SpotlightSchedule days={days} height={74} />
    </div>
  );
}

function TallStage({ days }: { days: ProspectViewDay[] }) {
  const rows = Math.ceil(days.length / 2);
  const dist = tallScroll(rows);
  return (
    <div className="relative h-full overflow-hidden bg-app-bg" style={{ width: '56.25vh', maxWidth: '100vw' }}>
      <Wordmark />
      <div className="absolute inset-x-0 top-0 z-[5] flex flex-col items-center justify-end bg-app-bg" style={{ height: `${TALL.headH}vh`, paddingTop: '6vh', paddingBottom: '1.5vh', gap: '1vh' }}>
        <Headline size="4.7vh" />
        <Sub size="1.9vh" />
      </div>
      <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ top: `${TALL.headH}vh`, animation: `sr-dim .7s ease-in ${T.dim}s both` }}>
        <ul
          className="m-0 grid list-none p-0"
          style={{
            gridTemplateColumns: `repeat(2, ${TALL.cardW}vh)`, justifyContent: 'center', columnGap: `${TALL.gap}vh`, rowGap: `${TALL.rowGap}vh`, paddingTop: `${TALL.pad}vh`,
            ['--sr-scroll' as string]: `-${dist}vh`, animation: `sr-scroll ${T.scrollEnd - T.cards}s linear ${T.cards}s both`,
          }}
        >
          {days.map((d, i) => <li key={`${d.day}-${d.kind}`}><ShowCard day={d} delay={tallDelay(i, rows)} labelH={TALL.labelH} /></li>)}
        </ul>
      </div>
      <EndCard />
      <SpotlightSchedule days={days} height={66} />
    </div>
  );
}

/** Pick the format, then play the 32s reel full screen. Esc or a click on the picker backdrop closes it. */
export function ShowreelOverlay({ days, onClose }: { days: ProspectViewDay[]; onClose: () => void }) {
  const [format, setFormat] = useState<ShowreelFormat | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const shown = days.slice(0, 14);
  return (
    <div className="fixed inset-0 z-[200] flex cursor-none items-center justify-center bg-zinc-200 dark:bg-zinc-900" onClick={format ? undefined : onClose}>
      <style>{SHOWREEL_CSS}</style>
      {!format && (
        <div className="flex cursor-default flex-col gap-3 rounded-2xl bg-app-bg p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
          <p className="m-0 text-[15px] font-semibold text-app-ink">Showreel format</p>
          {(['wide', 'tall'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFormat(f)} className="min-h-[50px] cursor-pointer rounded-full border-[1.5px] border-app-ink bg-transparent px-6 text-[16px] font-semibold text-app-ink transition active:scale-[0.98]">
              {f === 'wide' ? 'Desktop wide' : 'Phone 9:16'}
            </button>
          ))}
        </div>
      )}
      {format && <div key={format} className="flex h-full w-full justify-center" onClick={onClose}>{format === 'wide' ? <WideStage days={shown} /> : <TallStage days={shown} />}</div>}
    </div>
  );
}
