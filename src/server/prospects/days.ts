// A Prospect Pack's 14 days, one post a day from tomorrow (the prospect's days), in the PROSPECT_ORDER mix. When one
// kind has fewer posts than the mix asks for (a render failed), the next kind that has some takes its day. Pure.

import { PROSPECT_ORDER, type ProspectDay, type ProspectKind } from '../../types/admin/prospects';
import { atViewerTime, viewerDay } from '../labs/ideaDays';

/** The time each post goes out, in the prospect's day. */
const POST_TIME = '09:00';

export const composeDays = (posts: Record<ProspectKind, string[]>, now: Date, tzOffsetMin: unknown): ProspectDay[] => {
  const left: Record<ProspectKind, string[]> = { blitz: [...posts.blitz], cast: [...posts.cast], hooks: [...posts.hooks] };
  const total = left.blitz.length + left.cast.length + left.hooks.length;
  const tomorrow = viewerDay(now, tzOffsetMin) + 1;
  const days: ProspectDay[] = [];
  for (let i = 0; days.length < total; i += 1) {
    const wanted = PROSPECT_ORDER[i % PROSPECT_ORDER.length]!;
    const kind = left[wanted].length > 0 ? wanted : (['blitz', 'cast', 'hooks'] as const).find((k) => left[k].length > 0)!;
    const day = days.length + 1;
    days.push({ day, at: atViewerTime(tomorrow + day - 1, POST_TIME, tzOffsetMin).toISOString(), kind, refId: left[kind].shift()! });
  }
  return days;
};
