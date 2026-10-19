'use client';

import { useState } from 'react';
import type { AutoSlideshowDto } from '../../../../types/admin/autoSlideshow';
import { savePlannedPins } from '../calendar/usePlannedPins';
import { tomorrow } from '../schedule';
import { toLocalInput } from '../campaigns/scheduleTimes';

const LIVE = ['scheduled', 'sending', 'processing', 'posted'];

/** "YYYY-MM-DD" and "HH:MM" of a local time. */
const split = (d: Date): [string, string] => {
  const [day, time] = toLocalInput(d).split('T');
  return [day!, time!.slice(0, 5)];
};

type Options = { token: string; runId: string; show: AutoSlideshowDto; nextSlot: Date | null; onSaved: () => void };

/**
 * When one slideshow posts (a day and a time) and "Schedule 1 post": it stores the slideshow's spot on the Calendar,
 * where it waits for approval like a campaign's posts. It starts on its spot, else on the Calendar's next empty slot.
 */
export const useSlideshowSchedule = ({ token, runId, show, nextSlot, onSaved }: Options) => {
  const pinned = show.plannedAt ? new Date(show.plannedAt) : null;
  const [picked, setPicked] = useState<{ date: string; time: string } | null>(null);
  const [planning, setPlanning] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A new spot from the server (saved here or moved on the Calendar) shows as is.
  const [seen, setSeen] = useState(show.plannedAt);
  if (seen !== show.plannedAt) {
    setSeen(show.plannedAt);
    setPicked(null);
  }

  const start = pinned && pinned > new Date() ? pinned : nextSlot;
  const [date, time] = picked ? [picked.date, picked.time] : start ? split(start) : [tomorrow(), '19:00'];
  const post = show.post && LIVE.includes(show.post.status) ? show.post : null;
  const at = date && time ? new Date(`${date}T${time}`) : null;
  const tooSoon = at !== null && date < tomorrow();
  const unchanged = pinned !== null && at !== null && pinned.getTime() === at.getTime();
  const open = post ? [] : [show.id];

  const schedule = async () => {
    if (!at) return;
    setError(null);
    setPlanning(true);
    try {
      await savePlannedPins(token, runId, { [show.id]: at.toISOString() });
      setAdded(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the post to the Calendar');
    } finally {
      setPlanning(false);
    }
  };

  return {
    date,
    pickDate: (d: string) => { setPicked({ date: d, time }); setAdded(false); },
    time,
    pickTime: (t: string) => { setPicked({ date, time: t }); setAdded(false); },
    post,
    pinned,
    tooSoon,
    added,
    error,
    open,
    making: false,
    planning,
    /** Nothing to schedule: already posting, not made yet, no time, too soon, saving, or already there. */
    disabled: open.length === 0 || show.status !== 'ready' || !at || tooSoon || unchanged || planning,
    label: pinned ? 'Update Calendar' : 'Schedule 1 post',
    schedule,
  };
};

export type SlideshowSchedule = ReturnType<typeof useSlideshowSchedule>;
