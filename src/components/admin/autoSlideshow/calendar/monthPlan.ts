import type { AutoPostDto, AutoSlideshowDto } from '../../../../types/admin/autoSlideshow';
import type { BlitzScheduleDto } from '../../../../types/admin/blitzSchedule';

/**
 * The posting calendar, worked out on the client from the run. Nothing here is saved until the user approves.
 * - Live posts and pinned slideshows (`pins`: dragged, or kept in place when the plan changed) sit at their own time.
 * - `targets`: posts the user wants on a given day (1 to 5, set day by day). Waiting slideshows fill those slots first,
 *   in day order; empty ones are what "Generate" makes.
 * - Waiting slideshows left over (no target slot) go one a day at 7 PM on the next free days from tomorrow.
 * - Blitz videos put on the calendar from the Content page (`blitz`) sit at their own time, like live posts.
 * The page shows one calendar month (Monday to Sunday weeks); targets and pins in any month count.
 */

export type DayItem =
  | { kind: 'post'; show: AutoSlideshowDto; post: AutoPostDto }
  | { kind: 'ready'; show: AutoSlideshowDto }
  | { kind: 'making'; show: AutoSlideshowDto | null }
  /** A kept Blitz video scheduled from the Content page: rendered near its time, then posted. */
  | { kind: 'blitz'; show: null; blitz: BlitzScheduleDto };

type PostItem = Extract<DayItem, { kind: 'post' }>;

export type PlanSlot = { at: Date; item: DayItem | null };
export type PlanDay = { key: string; date: Date; past: boolean; today: boolean; inMonth: boolean; slots: PlanSlot[] };

/** `days`: the month grid (whole weeks). `all`: every day built, from the earliest shown or tomorrow to the last queued slot. */
export type MonthPlan = { days: PlanDay[]; all: PlanDay[] };

/** Most posts on one day. */
export const MAX_PER_DAY = 5;

/** Post times for 1 to 5 posts on a day, spread over the hours people scroll most. */
export const POST_TIMES: Record<number, string[]> = {
  1: ['19:00'],
  2: ['12:00', '19:00'],
  3: ['09:00', '13:00', '19:00'],
  4: ['09:00', '12:00', '16:00', '19:00'],
  5: ['08:00', '11:00', '14:00', '17:00', '20:00'],
};

/** Day key → posts wanted that day. */
export type Targets = Record<string, number>;

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

/** Groups live posts by day key. */
const postsByDay = (slideshows: AutoSlideshowDto[]) => {
  const byDay = new Map<string, PostItem[]>();
  for (const show of slideshows.filter(isLive)) {
    const key = dayKey(new Date(show.post.scheduledAt));
    byDay.set(key, [...(byDay.get(key) ?? []), { kind: 'post', show, post: show.post }]);
  }
  return byDay;
};

/** Free post times on a day wanting `target` posts, after its fixed ones; at most `need` of them. */
const freeTimes = (target: number, fixed: PlanSlot[], need: number): string[] => {
  const busy = new Set(fixed.map((s) => hhmm(s.at)));
  const all = [...new Set([...(POST_TIMES[Math.min(target, MAX_PER_DAY)] ?? []), ...POST_TIMES[MAX_PER_DAY]!])];
  return all.filter((t) => !busy.has(t)).slice(0, need);
};

type Draft = { date: Date; key: string; fixed: PlanSlot[]; open: PlanSlot[] };

/** Every day from `from` to `end`, with its fixed slots and its empty target slots. */
const draftDays = (from: Date, end: Date, tomorrow: Date, fixedOf: (key: string) => PlanSlot[], targets: Targets): Draft[] => {
  const drafts: Draft[] = [];
  for (let date = from; date <= end && drafts.length < MAX_DAYS; date = addDays(date, 1)) {
    const key = dayKey(date);
    const fixed = fixedOf(key);
    const target = date >= tomorrow ? (targets[key] ?? 0) : 0;
    const open = freeTimes(target, fixed, Math.max(0, target - fixed.length)).map((t) => ({ at: atTime(date, t), item: null as DayItem | null }));
    drafts.push({ date, key, fixed, open });
  }
  return drafts;
};

/** Waiting slideshows fill target slots in day order; the rest go one a day on free days from tomorrow (adding days as needed). */
const placeQueue = (drafts: Draft[], queue: DayItem[], tomorrow: Date) => {
  for (const d of drafts) for (const slot of d.open) slot.item = queue.shift() ?? null;
  for (let i = 0; queue.length > 0 && i < MAX_DAYS; i += 1) {
    const last = drafts[drafts.length - 1]!;
    const d = i < drafts.length ? drafts[i]! : { date: addDays(last.date, 1), key: dayKey(addDays(last.date, 1)), fixed: [], open: [] };
    if (i >= drafts.length) drafts.push(d);
    if (d.date >= tomorrow && d.fixed.length === 0 && d.open.length === 0) d.open.push({ at: atTime(d.date, '19:00'), item: queue.shift()! });
  }
};

type PlanInput = { slideshows: AutoSlideshowDto[]; pending: number; month: Date; targets?: Targets; pins?: Pins; working?: boolean; now?: Date; blitz?: BlitzScheduleDto[] };

/** Blitz videos as fixed slots, by day key. */
const blitzByDay = (items: BlitzScheduleDto[]) => {
  const byDay = new Map<string, PlanSlot[]>();
  for (const blitz of items) {
    const at = new Date(blitz.scheduledAt);
    byDay.set(dayKey(at), [...(byDay.get(dayKey(at)) ?? []), { at, item: { kind: 'blitz', show: null, blitz } }]);
  }
  return byDay;
};

/** The month grid, plus every day with a target, pin or queued slideshow (so approving takes them all, in any month). */
export const buildMonth = (input: PlanInput): MonthPlan => {
  const now = input.now ?? new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = addDays(today, 1);
  const targets = input.targets ?? {};
  const byDay = postsByDay(input.slideshows);
  const videos = blitzByDay(input.blitz ?? []);
  const { queue, pinned } = waitingQueue(input.slideshows, input.pending, input.working ?? true, input.pins ?? {}, tomorrow);
  const grid = gridOf(input.month);
  const from = grid.start < tomorrow ? grid.start : tomorrow;
  const lastKey = [...pinned.keys(), ...Object.keys(targets)].sort().at(-1);
  const lastDate = lastKey ? new Date(`${lastKey}T00:00`) : grid.end;
  const fixedOf = (key: string) =>
    [...(byDay.get(key) ?? []).map((p) => ({ at: new Date(p.post.scheduledAt), item: p as DayItem | null })), ...(videos.get(key) ?? []), ...(pinned.get(key) ?? [])].sort((a, b) => a.at.getTime() - b.at.getTime());
  const drafts = draftDays(from, lastDate > grid.end ? lastDate : grid.end, tomorrow, fixedOf, targets);
  placeQueue(drafts, queue, tomorrow);
  const month = input.month.getMonth();
  const all = drafts.map(({ date, key, fixed, open }) => ({
    key, date, past: date < tomorrow, today: key === dayKey(today), inMonth: date.getMonth() === month,
    slots: [...fixed, ...open].sort((a, b) => a.at.getTime() - b.at.getTime()),
  }));
  return { days: all.filter((d) => d.date >= grid.start && d.date <= grid.end), all };
};

const emptyIn = (d: PlanDay) => (d.past ? 0 : d.slots.filter((s) => s.item === null).length);

/** Empty target slots on every day: what "Generate" makes. */
export const emptySlots = (all: PlanDay[]) => all.reduce((n, d) => n + emptyIn(d), 0);

/** Where every not-yet-approved slideshow sits now, so a plan change can keep them in place. */
export const currentPins = (all: PlanDay[]): Pins =>
  Object.fromEntries(all.flatMap((d) => d.slots.flatMap((s) => (s.item && s.item.kind !== 'post' && s.item.show ? [[s.item.show.id, s.at.toISOString()]] : []))));

/**
 * Pins after dropping slideshow `id` on `day`: into one of its empty slots, else at a free time when the day holds no
 * more than its target; on a full day it swaps with a ready slideshow there. Null when it cannot go there.
 */
export const dropPins = (all: PlanDay[], id: string, day: PlanDay): Pins | null => {
  const pins = currentPins(all);
  const from = pins[id];
  if (!from || day.past) return null;
  const others = day.slots.filter((s) => !(s.item && s.item.kind !== 'post' && s.item.show?.id === id));
  const empty = others.find((s) => s.item === null);
  if (empty) return { ...pins, [id]: empty.at.toISOString() };
  const filled = others.filter((s) => s.item !== null);
  if (filled.length === 0) return { ...pins, [id]: atTime(day.date, '19:00').toISOString() };
  const swap = filled.find((s) => s.item?.kind === 'ready');
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
      if (item?.kind === 'blitz' && item.blitz.status !== 'failed') counts[item.blitz.status === 'posted' ? 'posted' : 'scheduled'] += 1;
    }
  }
  return counts;
};

/** Months the arrows can reach: from the earliest live post (or this month) to 3 months ahead. */
export const monthRange = (slideshows: AutoSlideshowDto[], now = new Date()) => {
  const first = slideshows.filter(isLive).reduce((min, s) => Math.min(min, new Date(s.post.scheduledAt).getTime()), now.getTime());
  return { min: monthOf(new Date(Math.max(first, addMonths(now, -12).getTime()))), max: addMonths(monthOf(now), 3) };
};
