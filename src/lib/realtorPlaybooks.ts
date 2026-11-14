// Pure (no server imports): the Autopilot UI and the server planner read the same playbook beats.
// Plan: docs/business-studios/15-realtor-autopilot-plan.md §4.

export type PlaybookId = 'just_listed' | 'open_house' | 'price_drop' | 'just_sold' | 'market_update' | 'evergreen';
export type BeatFormat = 'slideshow' | 'listing_video';
export type VideoPreset = 'editorial' | 'rate';

/** Slideshows made from the listing's real photos. */
export type ListingSlideshowKind =
  | 'coming_soon' | 'room_by_room' | 'neighborhood' | 'buyers_miss' | 'status'
  | 'open_house_tips' | 'open_house_today' | 'price_drop' | 'sold';
/** Designed text cards (no listing photos): tips with her face or faceless, and a local places spotlight. */
export type CardSlideshowKind = 'tips' | 'spotlight';
export type SlideshowKind = ListingSlideshowKind | CardSlideshowKind | 'market_stats';

export const CARD_KINDS: readonly SlideshowKind[] = ['tips', 'spotlight'];
export const isCardKind = (kind: SlideshowKind | undefined): kind is CardSlideshowKind => Boolean(kind && CARD_KINDS.includes(kind));

/** Keyword CTAs (§6): realtors pay for leads, every caption ends with one. */
export type CtaKey = 'tour' | 'rsvp' | 'value' | 'buyer';
export const CTA_LINES: Record<CtaKey, { keyword: string; line: string }> = {
  tour: { keyword: 'TOUR', line: "Comment TOUR and I'll send you the details" },
  rsvp: { keyword: 'RSVP', line: 'Comment RSVP and I’ll save you a spot' },
  value: { keyword: 'VALUE', line: 'DM VALUE for a free home value' },
  buyer: { keyword: 'BUYER', line: 'DM BUYER for my first-time buyer checklist' },
};

export type Beat = {
  /** Stored on CampaignPost.beatKey, e.g. "just_listed.room_by_room". */
  key: string;
  /** Day offset from the playbook's first day (0-based). Busy days push a beat to the next free day. */
  day: number;
  format: BeatFormat;
  label: string;
  /** Plan card line; {street} and {city} are filled from the listing. */
  idea: string;
  /** Seeded template (db/migrations/20261214090000_realtor_playbooks.sql). */
  templateId: string;
  versionId: string;
  preset?: VideoPreset;
  slideshow?: SlideshowKind;
  /** Tip cards: what the slides teach (the writer's brief). */
  brief?: string;
  cta?: CtaKey;
  /** Only when she picked a Brand Cast face (evergreen "Day in the life"). */
  needsFace?: boolean;
  /** Only when her market area is set (evergreen spotlight). */
  needsArea?: boolean;
};

export type Playbook = {
  id: PlaybookId;
  name: string;
  /** One line under the name on the Step 1 card. */
  pitch: string;
  /** Days the plan may spread over when some days are already taken. */
  windowDays: number;
  /** Made from a listing's photos (Just listed) or from her market area (Market update). */
  needsListing: boolean;
  /** Market update: made from her market area. */
  needsArea: boolean;
  /** Open house: the last beat lands on the event day. Evergreen: one pool beat per free day. */
  placement: 'start' | 'event' | 'fill';
  /** Paid plans only (§9). */
  paidOnly: boolean;
  beats: Beat[];
};

/** Template ids seeded in db/migrations (tpl_rp_<playbook prefix>_<beat slug>). */
const PREFIX: Record<PlaybookId, string> = { just_listed: 'jl', open_house: 'oh', price_drop: 'pd', just_sold: 'js', market_update: 'mu', evergreen: 'ev' };

const beat = (key: string, day: number, format: BeatFormat, label: string, idea: string, extra: Partial<Beat> = {}): Beat => {
  const [playbook, slug] = key.split('.') as [PlaybookId, string];
  const id = `rp_${PREFIX[playbook]}_${slug}`;
  return { key, day, format, label, idea, templateId: `tpl_${id}`, versionId: `tplv_${id}`, ...extra };
};

export const JUST_LISTED: Playbook = {
  id: 'just_listed',
  name: 'Just listed',
  pitch: '7 days of posts from one Zillow link',
  windowDays: 14,
  needsListing: true,
  needsArea: false,
  placement: 'start',
  paidOnly: false,
  beats: [
    beat('just_listed.coming_soon', 0, 'slideshow', 'Coming soon', 'Teaser: 3 best photos, “Guess the price?”', { slideshow: 'coming_soon' }),
    beat('just_listed.editorial', 1, 'listing_video', 'Just listed video', 'Voiced tour of {street}', { preset: 'editorial' }),
    beat('just_listed.room_by_room', 2, 'slideshow', 'Room by room', 'One room per slide, real photos', { slideshow: 'room_by_room' }),
    beat('just_listed.rate', 3, 'listing_video', 'Rate this house', '“Rate it 1 to 10” — comments magnet', { preset: 'rate' }),
    beat('just_listed.neighborhood', 4, 'slideshow', 'Neighborhood', 'What is 5 minutes from {street}', { slideshow: 'neighborhood' }),
    beat('just_listed.buyers_miss', 5, 'slideshow', 'Buyer tips', '3 things buyers miss on a tour', { slideshow: 'buyers_miss' }),
    beat('just_listed.status', 6, 'slideshow', 'Still available', 'Last call: “Comment TOUR”', { slideshow: 'status' }),
  ],
};

const MU_EXTRA: Partial<Beat> = { slideshow: 'market_stats', templateId: 'tpl_rp_mu_stats', versionId: 'tplv_rp_mu_stats' };

export const MARKET_UPDATE: Playbook = {
  id: 'market_update',
  name: 'Market update',
  pitch: '3 cities + your state, one post every 2 days',
  windowDays: 10,
  needsListing: false,
  needsArea: true,
  placement: 'start',
  paidOnly: true,
  // One post per place she keeps (src/lib/marketPlaces.ts), every 2 days. All share the one seeded template.
  beats: [
    beat('market_update.stats', 0, 'slideshow', 'Market update', '{city}: this week’s housing numbers, sourced', MU_EXTRA),
    beat('market_update.stats_2', 2, 'slideshow', 'Market update', '{city}: this week’s housing numbers, sourced', MU_EXTRA),
    beat('market_update.stats_3', 4, 'slideshow', 'Market update', '{city}: this week’s housing numbers, sourced', MU_EXTRA),
    beat('market_update.state', 6, 'slideshow', 'State update', '{city}: this week’s housing numbers, sourced', MU_EXTRA),
  ],
};

export const OPEN_HOUSE: Playbook = {
  id: 'open_house',
  name: 'Open house',
  pitch: '3 days, ends on the open house day',
  windowDays: 3,
  needsListing: true,
  needsArea: false,
  placement: 'event',
  paidOnly: false,
  beats: [
    beat('open_house.editorial', 0, 'listing_video', 'Open house video', 'Open house {when}: voiced tour of {street}', { preset: 'editorial', cta: 'rsvp' }),
    beat('open_house.tips', 1, 'slideshow', 'What to check', '5 things to check at an open house', { slideshow: 'open_house_tips', cta: 'rsvp' }),
    beat('open_house.today', 2, 'slideshow', 'Open house today', 'Today {hours} at {street}', { slideshow: 'open_house_today', cta: 'tour' }),
  ],
};

export const PRICE_DROP: Playbook = {
  id: 'price_drop',
  name: 'Price drop',
  pitch: '3 days around the new price',
  windowDays: 7,
  needsListing: true,
  needsArea: false,
  placement: 'start',
  paidOnly: false,
  beats: [
    beat('price_drop.editorial', 0, 'listing_video', 'New price video', 'Voiced tour of {street} at its new price', { preset: 'editorial', cta: 'tour' }),
    beat('price_drop.new_price', 1, 'slideshow', 'New price', 'Now {price}, was {oldPrice}', { slideshow: 'price_drop', cta: 'tour' }),
    beat('price_drop.rate', 2, 'listing_video', 'Worth it now?', '“Rate it 1 to 10” at the new price', { preset: 'rate', cta: 'tour' }),
  ],
};

export const JUST_SOLD: Playbook = {
  id: 'just_sold',
  name: 'Just sold',
  pitch: '2 days of proof',
  windowDays: 7,
  needsListing: true,
  needsArea: false,
  placement: 'start',
  paidOnly: false,
  beats: [
    beat('just_sold.sold', 0, 'slideshow', 'Sold', 'Sold: {street}', { slideshow: 'sold', cta: 'value' }),
    beat('just_sold.value', 1, 'slideshow', 'Thinking of selling?', 'What your {city} home could sell for: DM VALUE', {
      slideshow: 'tips', cta: 'value',
      brief: 'Thinking of selling? 4 things that decide what a home sells for right now (price, condition, timing, how it is marketed). Each item: the thing + one plain tip.',
    }),
  ],
};

/** Evergreen pool (§4.5): one beat per free day, least recently used first. Tip cards, her face when she has one. */
export const EVERGREEN: Playbook = {
  id: 'evergreen',
  name: 'No listing this week',
  pitch: 'Tips that fill your empty days',
  windowDays: 7,
  needsListing: false,
  needsArea: false,
  placement: 'fill',
  paidOnly: false,
  beats: [
    beat('evergreen.buyer_myth', 0, 'slideshow', 'Buyer myths', '3 buyer myths, busted', { slideshow: 'tips', cta: 'buyer', brief: '3 common home buyer myths. Each item: the myth as the title, the truth in one plain line as the body.' }),
    beat('evergreen.seller_myth', 0, 'slideshow', 'Seller myths', '3 seller myths, busted', { slideshow: 'tips', cta: 'value', brief: '3 common home seller myths. Each item: the myth as the title, the truth in one plain line as the body.' }),
    beat('evergreen.first_time', 0, 'slideshow', 'First-time buyer mistakes', 'Mistakes first-time buyers make', { slideshow: 'tips', cta: 'buyer', brief: '4 mistakes first-time home buyers make. Each item: the mistake + what to do instead.' }),
    beat('evergreen.seller_prep', 0, 'slideshow', 'Before you list', '5 things to do before you list', { slideshow: 'tips', cta: 'value', brief: '5 cheap things to do before listing a home. Each item: the task + why buyers care.' }),
    beat('evergreen.closing_costs', 0, 'slideshow', 'Closing costs', 'What closing costs really are', { slideshow: 'tips', cta: 'buyer', brief: 'What closing costs are, explained simply: 4 items buyers pay for at closing. No exact dollar amounts or percentages that change by state; say "ask your lender" when it varies.' }),
    beat('evergreen.offer_tips', 0, 'slideshow', 'Winning offers', 'How to win an offer without overpaying', { slideshow: 'tips', cta: 'buyer', brief: '4 ways to make a stronger offer on a home without paying more. Each item: the move + one plain line why it works.' }),
    beat('evergreen.hire_agent', 0, 'slideshow', 'Questions for an agent', 'Ask your agent these questions', { slideshow: 'tips', cta: 'value', brief: '4 questions to ask before you hire a real estate agent. Each item: the question + what a good answer sounds like.' }),
    beat('evergreen.day_in_life', 0, 'slideshow', 'Day in the life', 'A day in the life of a {city} agent', { slideshow: 'tips', cta: 'value', needsFace: true, brief: 'A day in the life of a real estate agent, morning to evening, 4 moments. Each item: the time of day as the title + what happens in one line. No invented clients or addresses.' }),
    beat('evergreen.spotlight', 0, 'slideshow', 'Neighborhood spotlight', '5 spots in {city} worth knowing', { slideshow: 'spotlight', cta: 'buyer', needsArea: true }),
  ],
};

export const PLAYBOOKS: Record<PlaybookId, Playbook> = {
  just_listed: JUST_LISTED, open_house: OPEN_HOUSE, price_drop: PRICE_DROP, just_sold: JUST_SOLD, market_update: MARKET_UPDATE, evergreen: EVERGREEN,
};

/** The playbook a listing's Zillow status suggests (§3.1: suggest only, never auto-start). */
export const playbookForStatus = (status: string | null | undefined): PlaybookId | null =>
  status === 'coming_soon' || status === 'just_listed' ? 'just_listed' : status === 'open_house' ? 'open_house' : status === 'sold' ? 'just_sold' : null;

/** Next Monday (or today when it is Monday), YYYY-MM-DD: market updates go out on Mondays (§4.6). */
export const nextMonday = (from: Date): string => {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7));
  return d.toISOString().slice(0, 10);
};

export const isPlaybookId = (value: unknown): value is PlaybookId => typeof value === 'string' && value in PLAYBOOKS;

export const beatOf = (key: string | null | undefined): Beat | null => {
  if (!key) return null;
  const id = key.split('.')[0];
  return isPlaybookId(id) ? (PLAYBOOKS[id].beats.find((b) => b.key === key) ?? null) : null;
};

export type PlaceFill = { street: string; city: string; when?: string; hours?: string; price?: string; oldPrice?: string };

export const fillIdea = (idea: string, place: PlaceFill): string =>
  idea
    .replaceAll('{street}', place.street || 'this home')
    .replaceAll('{city}', place.city || 'town')
    .replaceAll('{when}', place.when || 'this weekend')
    .replaceAll('{hours}', place.hours || '')
    .replaceAll('{price}', place.price || 'a new price')
    .replaceAll('{oldPrice}', place.oldPrice || 'before')
    .replace(/\s+/g, ' ')
    .trim();

const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Open house: the last beat lands on the event day, the others the days before. Beats that would fall before
 * `today` are dropped. Busy days never move these beats: an open house day is not negotiable.
 */
export const placeEventBeats = (beats: readonly Beat[], eventDate: string, today: string): { beat: Beat; date: string }[] => {
  const last = Math.max(...beats.map((b) => b.day));
  return beats.map((b) => ({ beat: b, date: addDays(eventDate, b.day - last) })).filter((p) => p.date >= today);
};

export type FillContext = { hasFace: boolean; hasArea: boolean; recent: ReadonlyMap<string, string> };

/**
 * Evergreen: one pool beat per free day in the window. Beats she cannot use (no face / no area) are left out; the
 * rest go least recently used first (`recent` = beatKey → last date used), so nothing repeats while others wait.
 */
export const fillBeats = (pool: readonly Beat[], startDate: string, busy: ReadonlySet<string>, windowDays: number, ctx: FillContext): { beat: Beat; date: string }[] => {
  const usable = pool
    .filter((b) => (!b.needsFace || ctx.hasFace) && (!b.needsArea || ctx.hasArea))
    .map((b, i) => ({ b, i, last: ctx.recent.get(b.key) ?? '' }))
    .sort((x, y) => x.last.localeCompare(y.last) || x.i - y.i)
    .map((x) => x.b);
  const free = Array.from({ length: windowDays }, (_, i) => addDays(startDate, i)).filter((d) => !busy.has(d));
  return free.slice(0, usable.length).map((date, i) => ({ beat: usable[i]!, date }));
};

/**
 * Puts each beat on a date: its own day when free, else the next free day, in beat order (a beat never jumps ahead of
 * the one before it). Beats that do not fit inside the window are dropped. Pure, so it is unit tested.
 */
export const placeBeats = (beats: readonly Beat[], startDate: string, busy: ReadonlySet<string>, windowDays: number): { beat: Beat; date: string }[] => {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const dateAt = (offset: number) => new Date(start + offset * 86_400_000).toISOString().slice(0, 10);
  const placed: { beat: Beat; date: string }[] = [];
  let cursor = 0;
  for (const b of beats) {
    let offset = Math.max(b.day, cursor);
    while (offset < windowDays && busy.has(dateAt(offset))) offset++;
    if (offset >= windowDays) continue;
    placed.push({ beat: b, date: dateAt(offset) });
    cursor = offset + 1;
  }
  return placed;
};
