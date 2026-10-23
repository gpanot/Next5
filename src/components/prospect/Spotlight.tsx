'use client';

import { useEffect, useRef, useState } from 'react';
import type { ProspectViewDay } from '../../types/admin/prospects';
import { SPOT, T } from './showreelStyles';

const SLIDE_COUNT = 5;
const spotMs = (SPOT.inS + SPOT.holdS + SPOT.outS) * 1000;

type Spot = { day: ProspectViewDay; label: string };

/** The three posts to open: the first video, the first slideshow, and day 7's video (the UGC short). */
export const pickSpots = (days: ProspectViewDay[]): Spot[] => {
  const open = days.filter((d) => !d.locked);
  const video = open.find((d) => d.kind === 'blitz' && d.videoUrl);
  const show = open.find((d) => d.kind !== 'blitz' && d.slides.length > 0);
  const short = open.find((d) => d.day === 7 && d.videoUrl) ?? open.filter((d) => d.videoUrl && d !== video).at(-1);
  const spots: [ProspectViewDay | undefined, string][] = [[video, 'Video'], [show, 'Slideshow'], [short, 'Short']];
  return spots.flatMap(([day, label]) => (day ? [{ day, label }] : []));
};

/** A video that plays with sound; muted if the browser refuses. */
function SpotVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.play().catch(() => { el.muted = true; void el.play().catch(() => undefined); });
  }, []);
  return <video ref={ref} src={src} playsInline className="h-full w-full object-cover" />;
}

/** The first slides, one a second, with the music. */
function SpotSlides({ day }: { day: ProspectViewDay }) {
  const slides = day.slides.slice(0, SLIDE_COUNT);
  const [i, setI] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setI((n) => Math.min(n + 1, slides.length - 1)), (SPOT.holdS * 1000) / slides.length);
    const el = audio.current;
    if (el) { el.currentTime = day.audioStart ?? 0; void el.play().catch(() => undefined); }
    return () => window.clearInterval(timer);
  }, [slides.length, day.audioStart]);
  return (
    <>
      {day.audioUrl && <audio ref={audio} src={day.audioUrl} preload="auto" />}
      {slides.map((src, n) => (
        // eslint-disable-next-line @next/next/no-img-element -- signed R2 links that expire
        <img key={src} src={src} alt="" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200" style={{ opacity: n <= i ? 1 : 0 }} />
      ))}
    </>
  );
}

/** One post, big and centered over a scrim, for 5s. */
function SpotFrame({ spot, height }: { spot: Spot; height: number }) {
  const { day, label } = spot;
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-app-bg/80 backdrop-blur-sm" style={{ animation: `sr-spot-in ${SPOT.inS}s ease-out both, sr-spot-out ${SPOT.outS}s ease-in ${SPOT.inS + SPOT.holdS}s forwards` }}>
      <div className="flex flex-col items-center" style={{ gap: '2vh' }}>
        <span className="rounded-full bg-app-ink px-[3vh] py-[1vh] font-display font-[800] text-app-bg" style={{ fontSize: '3vh' }}>{label}</span>
        <div className="relative aspect-[9/16] overflow-hidden rounded-[2vh] bg-black shadow-2xl" style={{ height: `${height}vh` }}>
          {day.videoUrl ? <SpotVideo src={day.videoUrl} /> : <SpotSlides day={day} />}
        </div>
      </div>
    </div>
  );
}

/** Warms the video and the first photos so nothing stalls when the spotlight opens. */
function Preload({ spots }: { spots: Spot[] }) {
  return (
    <div hidden aria-hidden>
      {spots.map(({ day: d }) => d.videoUrl
        ? <video key={d.day} src={d.videoUrl} preload="auto" muted />
        // eslint-disable-next-line @next/next/no-img-element -- signed R2 links that expire
        : d.slides.slice(0, SLIDE_COUNT).map((s) => <img key={s} src={s} alt="" />))}
    </div>
  );
}

/** Opens the video, the slideshow and the short at T.spots, each closing itself after 5s of play. */
export function SpotlightSchedule({ days, height }: { days: ProspectViewDay[]; height: number }) {
  const spots = pickSpots(days);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const starts = T.spots;
    const timers = spots.flatMap((_, n) => [
      window.setTimeout(() => setActive(n), starts[n]! * 1000),
      window.setTimeout(() => setActive((a) => (a === n ? null : a)), starts[n]! * 1000 + spotMs),
    ]);
    return () => timers.forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- schedule once per stage mount
  }, []);
  return (
    <>
      <Preload spots={spots} />
      {active !== null && spots[active] && <SpotFrame key={active} spot={spots[active]!} height={height} />}
    </>
  );
}
