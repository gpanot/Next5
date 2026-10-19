import type { ProspectPackDto } from '../../../types/admin/prospects';

/** A pack's whole make time in seconds (site and faces, then posts), once both parts are done. */
export const makeSec = (pack: ProspectPackDto): number | null =>
  pack.timing.siteSec !== null && pack.timing.postsSec !== null ? pack.timing.siteSec + pack.timing.postsSec : null;

/** "45 s", "12 min", "1 h 05 min". */
export const formatDuration = (sec: number): string => {
  if (sec < 60) return `${sec} s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
};

/** Average make time and cost over the packs that finished, for the list header. Null before the first one. */
export const averages = (packs: ProspectPackDto[]): { count: number; sec: number; usd: number } | null => {
  const done = packs.flatMap((p) => {
    const sec = makeSec(p);
    return sec === null ? [] : [{ sec, usd: p.costUsd }];
  });
  if (done.length === 0) return null;
  const sum = done.reduce((acc, d) => ({ sec: acc.sec + d.sec, usd: acc.usd + d.usd }), { sec: 0, usd: 0 });
  return { count: done.length, sec: Math.round(sum.sec / done.length), usd: sum.usd / done.length };
};
