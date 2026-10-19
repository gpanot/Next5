'use client';

import { useState } from 'react';
import type { AutoSlideshowDto } from '../../../../types/admin/autoSlideshow';
import { pinOf, pinOnCalendar } from '../calendar/useCalendarStore';
import { tomorrow } from '../schedule';
import { toLocalInput } from '../campaigns/scheduleTimes';

const LIVE = ['scheduled', 'sending', 'processing', 'posted'];

/** "YYYY-MM-DD" and "HH:MM" of a local time. */
const split = (d: Date): [string, string] => {
  const [day, time] = toLocalInput(d).split('T');
  return [day!, time!.slice(0, 5)];
};

/**
 * When one slideshow posts (a day and a time) and "Schedule 1 post": it pins the slideshow on the Calendar at that time,
 * where it waits for approval like a campaign's posts. The Calendar only places pins from tomorrow on.
 */
export const useSlideshowSchedule = (runId: string, show: AutoSlideshowDto) => {
  const [pinned, setPinned] = useState(() => pinOf(runId, show.id));
  const [start] = useState(() => (pinned && pinned > new Date() ? split(pinned) : [tomorrow(), '18:00']));
  const [date, setDate] = useState(start[0]);
  const [time, setTime] = useState(start[1]);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = show.post && LIVE.includes(show.post.status) ? show.post : null;
  const at = date && time ? new Date(`${date}T${time}`) : null;
  const tooSoon = at !== null && date < tomorrow();
  const unchanged = pinned !== null && at !== null && pinned.getTime() === at.getTime();
  const open = post ? [] : [show.id];

  const schedule = async () => {
    if (!at) return;
    setError(null);
    try {
      pinOnCalendar(runId, show.id, at);
      setPinned(at);
      setAdded(true);
    } catch {
      setError('Could not add the post to the Calendar');
    }
  };

  return {
    date,
    pickDate: (d: string) => { setDate(d); setAdded(false); },
    time,
    pickTime: (t: string) => { setTime(t); setAdded(false); },
    post,
    pinned,
    tooSoon,
    added,
    error,
    open,
    making: false,
    planning: false,
    /** Nothing to schedule: already posting, not made yet, no time, too soon, or already there. */
    disabled: open.length === 0 || show.status !== 'ready' || !at || tooSoon || unchanged,
    label: pinned ? 'Update Calendar' : 'Schedule 1 post',
    schedule,
  };
};

export type SlideshowSchedule = ReturnType<typeof useSlideshowSchedule>;
