// Pure (no server imports): moment facts for playbook copy and plan cards — open house day and hours, prices,
// the brokerage line. Event times are wall-clock times stored as UTC (Zillow gives no zone; she types local time).

export type MomentFacts = {
  eventAt: Date | null;
  eventEndAt: Date | null;
  newPriceCents: number | null;
  oldPriceCents: number | null;
  daysOnMarket: number | null;
};

const usd = (cents: number) => `$${Math.round(cents / 100).toLocaleString('en-US')}`;

/** "Sat, Nov 15" */
export const eventDay = (at: Date): string => at.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

const clock = (at: Date): string => {
  const h = at.getUTCHours();
  const m = at.getUTCMinutes();
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
};

/** "1–3pm", "11am–1pm", or "from 1pm" without an end. */
export const eventHours = (start: Date, end: Date | null): string => {
  if (!end) return `from ${clock(start)}`;
  const a = clock(start);
  const b = clock(end);
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -2)}–${b}` : `${a}–${b}`;
};

export const priceLabel = (cents: number | null): string => (cents ? usd(cents) : '');

/** The MOMENT line the slideshow writer must use as given. Empty when the moment has no facts. */
export const momentLine = (playbook: string | null, f: MomentFacts): string => {
  if (playbook === 'open_house' && f.eventAt) return `Open house ${eventDay(f.eventAt)}, ${eventHours(f.eventAt, f.eventEndAt)}.`;
  if (playbook === 'price_drop' && f.newPriceCents) {
    return `New price ${usd(f.newPriceCents)}.${f.oldPriceCents && f.oldPriceCents > f.newPriceCents ? ` Old price ${usd(f.oldPriceCents)}.` : ''}`;
  }
  if (playbook === 'just_sold') return f.daysOnMarket ? `Sold after ${f.daysOnMarket} days on market.` : 'Sold.';
  return '';
};

/** "Listed by Ana Ruiz, Compass" — the caption footer on listing posts (§5.5). Null until both are set. */
export const disclosureLine = (agentName: string | null | undefined, brokerage: string | null | undefined): string | null => {
  const a = agentName?.trim();
  const b = brokerage?.trim();
  return a && b ? `Listed by ${a}, ${b}` : null;
};

/** Adds the brokerage line once, above the hashtags when the caption ends with them. */
export const withDisclosure = (caption: string, line: string | null): string => {
  if (!line || caption.includes(line)) return caption;
  const lines = caption.trimEnd().split('\n');
  const last = lines.at(-1) ?? '';
  if (/^(#\S+\s*)+$/.test(last.trim())) return [...lines.slice(0, -1), line, last].join('\n');
  return `${caption.trimEnd()}\n\n${line}`;
};
