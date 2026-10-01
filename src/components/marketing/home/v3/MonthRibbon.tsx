'use client';

/**
 * "Your month, already planned" ribbon between the hero and the problem section.
 * 30 day chips drift sideways; scrolling the page pushes them faster, in the
 * scroll direction, so the month visibly moves with you. It pauses offscreen and
 * stays still under reduced motion. Mix mirrors the offer: 20 videos + 10 photos.
 */
import { useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion, ScrollTrigger } from '../../../motion/gsap';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Every third day is a photo post: 20 videos and 10 photos across 30 days. */
const DAYS = Array.from({ length: 30 }, (_, i) => ({
  n: String(i + 1).padStart(2, '0'),
  weekday: WEEKDAYS[i % 7],
  kind: (i + 1) % 3 === 0 ? 'Photo' : 'Video',
}));
const LOOP_SECONDS = 70;
/** Scroll velocity (px/s) that doubles the drift speed. */
const VELOCITY_PER_BOOST = 500;
const MAX_BOOST = 5;

function DayChips({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul className="v3ribbon-row" aria-hidden={hidden || undefined}>
      {DAYS.map((day) => (
        <li key={day.n} className="v3day" data-kind={day.kind}>
          <b>{day.n}</b>
          <span>{day.weekday}<i />{day.kind}</span>
        </li>
      ))}
    </ul>
  );
}

function useRibbonDrift(trackRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const track = trackRef.current;
    if (!track || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const drift = gsap.to(track, { xPercent: -50, duration: LOOP_SECONDS, ease: 'none', repeat: -1, paused: true });
      // Keep the playhead away from 0 so a reverse (scrolling up) never stops at the start.
      drift.totalTime(LOOP_SECONDS * 100);
      let direction = 1;
      ScrollTrigger.create({
        trigger: track,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => (self.isActive ? drift.play() : drift.pause()),
        onUpdate: (self) => {
          const velocity = self.getVelocity();
          if (velocity !== 0) direction = velocity > 0 ? 1 : -1;
          const boost = Math.min(MAX_BOOST, 1 + Math.abs(velocity) / VELOCITY_PER_BOOST);
          gsap.to(drift, { timeScale: direction * boost, duration: 0.25, overwrite: true });
          gsap.to(drift, { timeScale: direction, duration: 1.2, delay: 0.25, ease: 'power2.out' });
        },
      });
    }, track);
    return () => ctx.revert();
  }, [trackRef]);
}

export function MonthRibbon() {
  const trackRef = useRef<HTMLDivElement>(null);
  useRibbonDrift(trackRef);
  return (
    <section className="v3ribbon" aria-labelledby="v3ribbon-title">
      <div className="v3wrap v3ribbon-head" data-reveal="">
        <h2 id="v3ribbon-title">Your month, already planned.</h2>
        <p>20 videos and 10 photos. One post for every day.</p>
      </div>
      <div className="v3ribbon-mask">
        <div className="v3ribbon-track" ref={trackRef}>
          <DayChips />
          <DayChips hidden />
        </div>
      </div>
    </section>
  );
}
