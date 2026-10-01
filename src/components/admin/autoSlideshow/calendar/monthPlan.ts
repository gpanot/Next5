import type { AutoPostDto, AutoSlideshowDto } from '../../../../types/admin/autoSlideshow';

/**
 * The posting calendar, worked out on the client from the run: `times.length` posts a day at the chosen times.
 * Days keep their live posts; ready slideshows not scheduled yet fill the next free slots from tomorrow; slideshows
 * still being made hold the slots after that. Nothing here is saved until the user approves.
 * The page shows one calendar month (Monday to Sunday weeks). The queue fills from `start` (the day the user's plan
 * starts, else tomorrow), whatever month is shown; days before it only show their live posts.
 * Pinned slideshows (`pins`: dragged, or kept in place when the plan changed) sit at their own time and never move.
 */

export type DayItem =
  | { kind: 'post'; show: AutoSlideshowDto; post: AutoPostDto }
  | { kind: 'ready'; show: AutoSlideshowDto }
  | { kind: 'making'; show: AutoSlideshowDto | null };

type PostItem = Extract<DayItem, { kind: 'post' }>;

export type PlanSlot = { at: Date; item: DayItem | null };
export type PlanDay = { key: string; date: Date; past: boolean; today: boolean; inMonth: boolean; slots: PlanSlot[] };

/** `days`: the month grid (whole weeks). `all`: every day built, from the earliest shown or tomorrow to the last queued slot. */
export type MonthPlan = { days: PlanDay[]; all: PlanDay[] };

/** Days built at most, so a long queue cannot loop for ever. */
const MAX_DAYS = 400;
const LIVE: AutoPostDto['status'][] = ['scheduled', 'sending', 'processing', 'posted'];

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** First day of the month holding `d`. */
export const monthOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

/** Monday on or before the 1st, through Sunday on or after the last day. */
const gridOf = (month: Date) => {
  const first = monthOf(month);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  return { start: addDays(first, -((first.getDay() + 6) % 7)), end: addDays(last, (7 - last.getDay()) % 7) };
};

/** "19:00" on that day, local time. */
const atTime = (day: Date, time: string) => {
  const [h, m] = time.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h ?? 19, m ?? 0);
};

const isLive = (show: AutoSlideshowDto): show is AutoSlideshowDto & { post: AutoPostDto } => show.post !== null && LIVE.includes(show.post.status);

/** Slideshow id → ISO time it is pinned to. */
export type Pins = Record<string, string>;

type Waiting = { queue: DayItem[]; pinned: Map<string, PlanSlot[]> };

/** Slideshows waiting for a slot, in the order they were made; `pending` = slideshows not written yet. Pinned ones
 *  (from tomorrow on) go to their own day instead. When the run is not working, half-made slideshows are left out. */
const waitingQueue = (slideshows: AutoSlideshowDto[], pending: number, working: boolean, pins: Pins, tomorrow: Date): Waiting => {
  const queue: DayItem[] = [];
  const pinned = new Map<string, PlanSlot[]>();
  for (const show of [...slideshows].sort((a, b) => a.position - b.position)) {
    if (isLive(show) || show.status === 'failed' || (!working && show.status !== 'ready')) continue;
    const item: DayItem = show.status === 'ready' ? { kind: 'ready', show } : { kind: 'making', show };
    const pin = pins[show.id] ? new Date(pins[show.id]!) : null;
    if (pin && !Number.isNaN(pin.getTime()) && pin >= tomorrow) pinned.set(dayKey(pin), [...(pinned.get(dayKey(pin)) ?? []), { at: pin, item }]);
    else queue.push(item);
  }
  for (let i = 0; i < pending; i += 1) queue.push({ kind: 'making', show: null });
  return { queue, pinned };
};

/** A day's slots: its live posts and pinned slideshows at their own times, then (on an open day) its free times up to
 *  `times.length` in all. */
const daySlots = (day: Date, fixed: PlanSlot[], times: string[], open: boolean, queue: DayItem[]): PlanSlot[] => {
  const taken = [...fixed].sort((a, b) => a.at.getTime() - b.at.getTime());
  if (!open) return taken;
  const busy = new Set(taken.map((s) => hhmm(s.at)));
  const free = times.filter((t) => !busy.has(t)).slice(0, Math.max(0, times.length - taken.length));
  const filled = free.map((t) => ({ at: atTime(day, t), item: queue.shift() ?? null }));
  return [...taken, ...filled].sort((a, b) => a.at.getTime() - b.at.getTime());
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

/** `start`: first day the queue and empty slots use (never before tomorrow); default tomorrow. */
type PlanInput = { slideshows: AutoSlideshowDto[]; pending: number; times: string[]; month: Date; start?: Date | null; pins?: Pins; working?: boolean; now?: Date };

/** The month grid, plus every day the queue reaches (so approving takes all ready slideshows, in any month). */
export const buildMonth = (input: PlanInput): MonthPlan => {
  const now = input.now ?? new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = addDays(today, 1);
  const start = input.start && input.start > tomorrow ? input.start : tomorrow;
  const times = [...input.times].sort();
  const byDay = postsByDay(input.slideshows);
  const { queue, pinned } = waitingQueue(input.slideshows, input.pending, input.working ?? true, input.pins ?? {}, tomorrow);
  const lastPinned = [...pinned.keys()].sort().at(-1) ?? '';
  const grid = gridOf(input.month);
  const from = grid.start < tomorrow ? grid.start : tomorrow;
  const month = input.month.getMonth();
  const days: PlanDay[] = [];
  const all: PlanDay[] = [];
  for (let i = 0; i < MAX_DAYS; i += 1) {
    const date = addDays(from, i);
    const key = dayKey(date);
    if (date > grid.end && queue.length === 0 && key > lastPinned) break;
    const fixed: PlanSlot[] = [...(byDay.get(key) ?? []).map((p) => ({ at: new Date(p.post.scheduledAt), item: p })), ...(pinned.get(key) ?? [])];
    const past = date < tomorrow;
    const day = { key, date, past, today: key === dayKey(today), inMonth: date.getMonth() === month, slots: daySlots(date, fixed, times, date >= start, queue) };
    all.push(day);
    if (date >= grid.start && date <= grid.end) days.push(day);
  }
  return { days, all };
};

const emptyIn = (d: PlanDay) => (d.past ? 0 : d.slots.filter((s) => s.item === null).length);

/** Empty future slots through day `key`: what "Generate" makes, so the new ones land up to there. */
export const emptyThrough = (all: PlanDay[], key: string) => all.filter((d) => d.key <= key).reduce((n, d) => n + emptyIn(d), 0);

/** Where every not-yet-approved slideshow sits now, so a plan change can keep them in place. */
export const currentPins = (all: PlanDay[]): Pins =>
  Object.fromEntries(all.flatMap((d) => d.slots.flatMap((s) => (s.item && s.item.kind !== 'post' && s.item.show ? [[s.item.show.id, s.at.toISOString()]] : []))));

/**
 * Pins after dropping slideshow `id` on `day`: at the day's first free post time; on a full day, it swaps with a ready
 * slideshow there. Null when the day has no room (only scheduled posts).
 */
export const dropPins = (all: PlanDay[], id: string, day: PlanDay, times: string[]): Pins | null => {
  const pins = currentPins(all);
  const from = pins[id];
  if (!from || day.past) return null;
  const others = day.slots.filter((s) => s.item && !(s.item.kind !== 'post' && s.item.show?.id === id));
  const busy = new Set(others.map((s) => hhmm(s.at)));
  const free = [...times].sort().find((t) => !busy.has(t)) ?? (others.length === 0 ? '19:00' : null);
  if (free && others.length < Math.max(times.length, 1)) return { ...pins, [id]: atTime(day.date, free).toISOString() };
  const swap = others.find((s) => s.item?.kind === 'ready');
  if (!swap || swap.item?.kind !== 'ready') return null;
  return { ...pins, [id]: swap.at.toISOString(), [swap.item.show.id]: from };
};

/** Ready slideshows placed in a slot, as schedule items. */
export const toApprove = (all: PlanDay[]) =>
  all.flatMap((d) => d.slots.flatMap((s) => (s.item?.kind === 'ready' ? [{ show: s.item.show, at: s.at }] : [])));

export type MonthCounts = { ready: number; scheduled: number; posted: number; empty: number };

/** The month's chips: ready to approve, scheduled (or on their way), posted, and empty future slots. */
export const monthCounts = (days: PlanDay[]): MonthCounts => {
  const counts = { ready: 0, scheduled: 0, posted: 0, empty: 0 };
  for (const day of days.filter((d) => d.inMonth)) {
    counts.empty += emptyIn(day);
    for (const { item } of day.slots) {
      if (item?.kind === 'ready') counts.ready += 1;
      if (item?.kind === 'post') counts[item.post.status === 'posted' ? 'posted' : 'scheduled'] += 1;
    }
  }
  return counts;
};

/** Months the arrows can reach: from the earliest live post (or this month) to 3 months ahead. */
export const monthRange = (slideshows: AutoSlideshowDto[], now = new Date()) => {
  const first = slideshows.filter(isLive).reduce((min, s) => Math.min(min, new Date(s.post.scheduledAt).getTime()), now.getTime());
  return { min: monthOf(new Date(Math.max(first, addMonths(now, -12).getTime()))), max: addMonths(monthOf(now), 3) };
};
