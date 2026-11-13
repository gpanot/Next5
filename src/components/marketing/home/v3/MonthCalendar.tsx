'use client';

/**
 * "Your month, already planned": one example month before and after Autopilot.
 * Before = the 6 posts a busy agent gets out. After = 30 days filled from one listing plus the area playbooks.
 * On screen it plays a 6 s loop: the hand-made month, then Autopilot fills it day by day. A toggle tap stops on that state.
 */
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  ADDED_DAYS, BEFORE_COUNT, FIRST_WEEKDAY, KIND_LABEL, MARKET_AREA, MONTH_LABEL, PLAN, type PlanDay, type PostKind,
} from './calendarPlan';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** One 6 s loop: hold the hand-made month, fill day by day, hold the full month, start again. */
const LOOP_MS = 6000;
const HOLD_BEFORE_MS = 1200;
const FILL_MS = 2600;
const HOLD_AFTER_MS = LOOP_MS - HOLD_BEFORE_MS - FILL_MS;
const TICK_MS = 50;

function KindIcon({ kind }: { kind: PostKind }) {
  if (kind === 'video') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>;
  if (kind === 'market') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18l5-6 4 3 7-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="12" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M20 7v11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>;
}

/** Market update post: the dark card the market_stats slideshow opens with. */
function MarketCard({ day }: { day: number }) {
  return (
    <div className="v3cal-mk">
      <span className="v3cal-mk-eye">Market update</span>
      <b>{MARKET_AREA} housing market</b>
      <span className="v3cal-mk-week">Week of Nov {day}</span>
      <span className="v3cal-mk-cta">4 numbers to know this week →</span>
    </div>
  );
}

function DayTile({ d, filled, before }: { d: PlanDay; filled: boolean; before: boolean }) {
  const label = before ? d.before : d.label;
  // A post the agent made by hand is a photo, whatever Autopilot later posts that day.
  const kind: PostKind = before ? 'slides' : d.kind;
  return (
    <li className="v3cal-day" data-filled={filled || undefined} data-kind={kind}>
      <span className="v3cal-n">{d.day}</span>
      <div className="v3cal-post" aria-hidden={!filled || undefined}>
        {d.kind === 'market' && !before ? <MarketCard day={d.day} /> : (
          <>
            <Image src={d.img} alt="" fill sizes="(max-width: 640px) 52px, 150px" />
            <span className="v3cal-label">{label}</span>
          </>
        )}
        <span className="v3cal-icon"><KindIcon kind={kind} /></span>
      </div>
      <span className="v3cal-sr">{filled ? `${MONTH_LABEL} ${d.day}: ${label}` : `${MONTH_LABEL} ${d.day}: nothing posted`}</span>
    </li>
  );
}

/** How many of the Autopilot days are filled at a time in the loop (ms from the loop start). */
function filledAt(t: number) {
  if (t < HOLD_BEFORE_MS) return 0;
  if (t >= LOOP_MS - HOLD_AFTER_MS) return ADDED_DAYS.length;
  return Math.ceil(((t - HOLD_BEFORE_MS) / FILL_MS) * ADDED_DAYS.length);
}

/**
 * Plays the before/after loop while the calendar is on screen and pauses off screen.
 * `pinned` (a toggle tap) stops the loop on that state. Reduced motion: shows the full month.
 */
function useFillLoop(ref: React.RefObject<HTMLDivElement | null>, pinned: number | null) {
  const [added, setAdded] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || pinned !== null) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer = 0;
    let start = 0;
    const tick = () => setAdded(still ? ADDED_DAYS.length : filledAt((performance.now() - start) % LOOP_MS));
    const io = new IntersectionObserver(([entry]) => {
      clearInterval(timer);
      if (!entry.isIntersecting) return;
      start = performance.now();
      tick();
      if (!still) timer = window.setInterval(tick, TICK_MS);
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); clearInterval(timer); };
  }, [ref, pinned]);
  return pinned ?? added;
}

function Stats({ posts, videos, empty }: { posts: number; videos: number; empty: number }) {
  return (
    <dl className="v3cal-stats">
      <div><dt>Posts this month</dt><dd>{posts}</dd></div>
      <div><dt>Voiced videos</dt><dd>{videos}</dd></div>
      <div><dt>Days with nothing</dt><dd>{empty}</dd></div>
    </dl>
  );
}

export function MonthCalendar() {
  const calRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const added = useFillLoop(calRef, pinned);
  const filledDays = new Set(ADDED_DAYS.slice(0, added));
  const done = added === ADDED_DAYS.length;
  const isFilled = (d: PlanDay) => Boolean(d.before) || filledDays.has(d.day);
  const videos = PLAN.filter((d) => d.kind === 'video' && filledDays.has(d.day)).length;
  const posts = PLAN.filter(isFilled).length;
  const status = done ? 'Planned by Autopilot' : added === 0 ? 'Posted by hand' : 'Autopilot is filling your month';

  return (
    <section className="v3section v3cal-sec" id="month" aria-labelledby="v3cal-title">
      <div className="v3cal-body">
          <div className="v3wrap">
            <div className="v3cal-head">
              <div>
                <h2 id="v3cal-title">Your month, already planned.</h2>
                <p className="v3lede">One Zillow link in. A post for every day out: videos, slideshows and your weekly market update.</p>
              </div>
              <div className="v3cal-toggle" role="group" aria-label="Compare your month">
                <button type="button" aria-pressed={added < ADDED_DAYS.length / 2} onClick={() => setPinned(0)}>Before · {BEFORE_COUNT} posts</button>
                <button type="button" aria-pressed={added >= ADDED_DAYS.length / 2} onClick={() => setPinned(ADDED_DAYS.length)}>With Autopilot · {PLAN.length}</button>
              </div>
            </div>
            <div className="v3cal" ref={calRef} data-mode={done ? 'after' : 'before'}>
              <div className="v3cal-title"><b>{MONTH_LABEL}</b><span>{status}</span></div>
              <ul className="v3cal-week" aria-hidden="true">{WEEKDAYS.map((w) => <li key={w}>{w}</li>)}</ul>
              <ol className="v3cal-grid">
                {Array.from({ length: FIRST_WEEKDAY }, (_, i) => <li key={`pad${i}`} className="v3cal-pad" aria-hidden="true" />)}
                {PLAN.map((d) => <DayTile key={d.day} d={d} filled={isFilled(d)} before={!filledDays.has(d.day)} />)}
              </ol>
              <ul className="v3cal-legend">
                {(['video', 'slides', 'market'] as const).map((k) => (
                  <li key={k} data-kind={k}><span className="v3cal-icon"><KindIcon kind={k} /></span>{KIND_LABEL[k]}</li>
                ))}
              </ul>
            </div>
            <Stats posts={posts} videos={videos} empty={PLAN.length - posts} />
          </div>
      </div>
    </section>
  );
}
