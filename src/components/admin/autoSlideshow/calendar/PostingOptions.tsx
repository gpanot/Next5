'use client';

import { useState } from 'react';
import { PRICE_CENTS, money } from '../pricing/pricing';
import { DEFAULT_TIMES, MAX_PER_DAY } from './usePostTime';

type Props = { times: string[]; onTimes: (times: string[]) => void };

const PER_DAY = Array.from({ length: MAX_PER_DAY }, (_, i) => i + 1);
const timeLabel = (t: string) => new Date(`2000-01-01T${t}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** "1 post a day at 7:00 PM", with Advanced options: 1 to 5 posts a day and the time of each. */
export function PostingOptions({ times, onTimes }: Props) {
  const [open, setOpen] = useState(false);
  const perDay = times.length;
  const setPerDay = (n: number) => onTimes(DEFAULT_TIMES[n] ?? DEFAULT_TIMES[1]!);
  const setTime = (i: number, t: string) => t && onTimes(times.map((x, j) => (j === i ? t : x)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted dark:text-zinc-400">
        <span>
          {perDay} {perDay === 1 ? 'post' : 'posts'} a day at {times.map(timeLabel).join(', ')}
        </span>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-h-9 text-sm font-semibold text-blue-600 transition hover:underline dark:text-blue-400">
          {open ? 'Hide options' : 'Advanced options'}
        </button>
      </div>
      {open && (
        <div className="space-y-4 rounded-xl border border-line bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">Posts a day</p>
            <div role="radiogroup" aria-label="Posts a day" className="grid grid-cols-5 gap-2">
              {PER_DAY.map((n) => (
                <button
                  key={n}
                  role="radio"
                  aria-checked={perDay === n}
                  onClick={() => setPerDay(n)}
                  className="min-h-11 rounded-xl border border-line bg-white text-sm font-semibold text-ink transition active:scale-95 aria-checked:border-blue-600 aria-checked:bg-blue-50 aria-checked:text-blue-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:aria-checked:border-blue-400 dark:aria-checked:bg-blue-950 dark:aria-checked:text-blue-300"
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">{money(PRICE_CENTS * perDay)} a day · {money(PRICE_CENTS)} per slideshow</p>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">Post times</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {times.map((t, i) => (
                <input
                  key={i}
                  type="time"
                  aria-label={`Post ${i + 1} time`}
                  value={t}
                  onChange={(e) => setTime(i, e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-line bg-white px-2 text-base text-ink focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
