// A Prospect Pack's 14 days, one post a day from tomorrow (the prospect's days), in the PROSPECT_ORDER mix. When one
// kind has fewer posts than the mix asks for (a render failed), the next kind that has some takes its day. Each kind's
// list has its full posts first, then its previews (marked by `previews`); a free day takes a full post of another kind
// before a preview, so the free days stay watchable. Pure.

import { PROSPECT_FREE_DAYS, PROSPECT_ORDER, type ProspectDay, type ProspectKind } from '../../types/admin/prospects';
import { atViewerTime, viewerDay } from '../labs/ideaDays';

/** The time each post goes out, in the prospect's day. */
const POST_TIME = '09:00';

const KINDS = ['blitz', 'cast', 'hooks'] as const;

/** The kind that takes `day`: the wanted one, unless a free day would get a preview while another kind has a full post. */
const pickKind = (left: Record<ProspectKind, string[]>, wanted: ProspectKind, day: number, previews: Set<string>): ProspectKind => {
  const full = (k: ProspectKind) => left[k].length > 0 && !previews.has(left[k][0]!);
  if (day <= PROSPECT_FREE_DAYS && !full(wanted)) {
    const other = KINDS.find(full);
    if (other) return other;
  }
  return left[wanted].length > 0 ? wanted : KINDS.find((k) => left[k].length > 0)!;
};

export const composeDays = (posts: Record<ProspectKind, string[]>, now: Date, tzOffsetMin: unknown, previews: Set<string> = new Set()): ProspectDay[] => {
  const left: Record<ProspectKind, string[]> = { blitz: [...posts.blitz], cast: [...posts.cast], hooks: [...posts.hooks] };
  const total = left.blitz.length + left.cast.length + left.hooks.length;
  const tomorrow = viewerDay(now, tzOffsetMin) + 1;
  const days: ProspectDay[] = [];
  for (let i = 0; days.length < total; i += 1) {
    const day = days.length + 1;
    const kind = pickKind(left, PROSPECT_ORDER[i % PROSPECT_ORDER.length]!, day, previews);
    const refId = left[kind].shift()!;
    days.push({ day, at: atViewerTime(tomorrow + day - 1, POST_TIME, tzOffsetMin).toISOString(), kind, refId, ...(previews.has(refId) ? { preview: true } : {}) });
  }
  return days;
};
