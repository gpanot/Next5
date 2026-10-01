import type { AutoPostDto, AutoSlideshowDto } from '../../../../types/admin/autoSlideshow';

/**
 * The posting calendar, worked out on the client from the run: `times.length` posts a day at the chosen times.
 * Days keep their live posts; ready slideshows not scheduled yet fill the next free slots from tomorrow; slideshows
 * still being made hold the slots after that. Nothing here is saved until the user approves.
 */

export type DayItem =
  | { kind: 'post'; show: AutoSlideshowDto; post: AutoPostDto }
  | { kind: 'ready'; show: AutoSlideshowDto }
  | { kind: 'making'; show: AutoSlideshowDto | null };

type PostItem = Extract<DayItem, { kind: 'post' }>;

export type PlanSlot = { at: Date; item: DayItem | null };
export type PlanDay = { key: string; date: Date; past: boolean; slots: PlanSlot[] };

const WEEK = 7;
/** Days shown at most, so a long history cannot grow the page without end. */
const MAX_DAYS = 8 * WEEK;
/** Days before today still shown, so this week's posted slideshows stay in view. */
const LOOKBACK = WEEK - 1;
/** Empty days shown after a calendar with no free slot left. */
const EXTEND = 2 * WEEK;
const LIVE: AutoPostDto['status'][] = ['scheduled', 'sending', 'processing', 'posted'];

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** "19:00" on that day, local time. */
const atTime = (day: Date, time: string) => {
  const [h, m] = time.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h ?? 19, m ?? 0);
};

const isLive = (show: AutoSlideshowDto): show is AutoSlideshowDto & { post: AutoPostDto } => show.post !== null && LIVE.includes(show.post.status);

/** Slideshows waiting for a slot, in the order they were made; `pending` = slideshows not written yet.
 *  When the run is not working, half-made slideshows are left out: nothing is making them. */
const waitingQueue = (slideshows: AutoSlideshowDto[], pending: number, working: boolean): DayItem[] => {
  const queue: DayItem[] = [];
  for (const show of [...slideshows].sort((a, b) => a.position - b.position)) {
    if (isLive(show) || show.status === 'failed' || (!working && show.status !== 'ready')) continue;
    queue.push(show.status === 'ready' ? { kind: 'ready', show } : { kind: 'making', show });
  }
  for (let i = 0; i < pending; i += 1) queue.push({ kind: 'making', show: null });
  return queue;
};

/** A day's slots: its live posts at their own times, then the day's free times up to `times.length` in all. */
const daySlots = (day: Date, posts: PostItem[], times: string[], past: boolean, queue: DayItem[]): PlanSlot[] => {
  const taken = posts.map((p) => ({ at: new Date(p.post.scheduledAt), item: p }));
  if (past) return taken;
  const busy = new Set(taken.map((s) => hhmm(s.at)));
  const free = times.filter((t) => !busy.has(t)).slice(0, Math.max(0, times.length - taken.length));
  const open = free.map((t) => ({ at: atTime(day, t), item: queue.shift() ?? null }));
  return [...taken, ...open].sort((a, b) => a.at.getTime() - b.at.getTime());
};

/** Groups live posts by day key. */
const postsByDay = (slideshows: AutoSlideshowDto[]) => {
  const byDay = new Map<string, PostItem[]>();
  for (const show of slideshows.filter(isLive)) {
    const key = dayKey(new Date(show.post.scheduledAt));
    byDay.set(key, [...(byDay.get(key) ?? []), { kind: 'post', show, post: show.post }]);
  }
  return byDay;
};

const hasOpenSlot = (days: PlanDay[]) => days.some((d) => !d.past && d.slots.some((s) => s.item === null));

export const buildPlan = (input: { slideshows: AutoSlideshowDto[]; pending: number; times: string[]; working?: boolean; now?: Date }): PlanDay[] => {
  const now = input.now ?? new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = addDays(today, 1);
  const times = [...input.times].sort();
  const byDay = postsByDay(input.slideshows);
  const keys = [...byDay.keys()].sort();
  const firstPost = keys[0];
  const lastPost = keys[keys.length - 1] ?? '';
  const earliest = addDays(today, -LOOKBACK);
  const start = firstPost && firstPost < dayKey(tomorrow) ? new Date(Math.max(earliest.getTime(), new Date(`${firstPost}T00:00`).getTime())) : tomorrow;
  const queue = waitingQueue(input.slideshows, input.pending, input.working ?? true);
  const days: PlanDay[] = [];
  // Every shown day full: show the next 2 weeks empty, so they can be filled right away.
  let until = 0;
  for (let i = 0; i < MAX_DAYS; i += 1) {
    const date = addDays(start, i);
    const key = dayKey(date);
    if (days.length >= WEEK && days.length % WEEK === 0 && queue.length === 0 && key > lastPost && days.length >= until) {
      if (until > 0 || hasOpenSlot(days)) break;
      until = days.length + EXTEND;
    }
    const past = date < tomorrow;
    days.push({ key, date, past, slots: daySlots(date, byDay.get(key) ?? [], times, past, queue) });
  }
  return days;
};

/** Empty slots from tomorrow through the last day shown. */
export const openSlots = (days: PlanDay[]) =>
  days.filter((d) => !d.past).reduce((n, d) => n + d.slots.filter((s) => s.item === null).length, 0);

/** Weeks that hold empty slots, counted from the first open day to the last: "Fill my week" or "Fill 2 weeks". */
export const openWeeks = (days: PlanDay[]) => {
  const open = days.filter((d) => !d.past && d.slots.some((s) => s.item === null));
  if (open.length === 0) return 0;
  const span = Math.round((open[open.length - 1]!.date.getTime() - open[0]!.date.getTime()) / 86_400_000) + 1;
  return Math.ceil(span / WEEK);
};

/** Empty future slots from the first open day through day `key`: what "Add" on that day makes, so it lands there. */
export const emptyThrough = (days: PlanDay[], key: string) =>
  days.filter((d) => !d.past && d.key <= key).reduce((n, d) => n + d.slots.filter((s) => s.item === null).length, 0);

/** Ready slideshows placed in a slot, as schedule items. */
export const toApprove = (days: PlanDay[]) =>
  days.flatMap((d) => d.slots.flatMap((s) => (s.item?.kind === 'ready' ? [{ show: s.item.show, at: s.at }] : [])));
