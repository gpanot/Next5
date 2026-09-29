/**
 * Spreads posts over days: `perDay` posts a day at the given local times ("09:00"), starting on `startDate`
 * ("2026-10-01", local). Times already past today are skipped, so nothing is scheduled in the past.
 */
export const spreadTimes = (count: number, startDate: string, times: string[], perDay: number, now = new Date()): Date[] => {
  const slots = [...times].filter((t) => /^\d{2}:\d{2}$/.test(t)).sort().slice(0, Math.max(1, perDay));
  if (slots.length === 0 || count <= 0) return [];
  const [y, m, d] = startDate.split('-').map(Number);
  const out: Date[] = [];
  for (let day = 0; out.length < count && day < 366; day += 1) {
    for (const t of slots) {
      const [h, min] = t.split(':').map(Number);
      const at = new Date(y!, m! - 1, d! + day, h, min);
      if (at > now) out.push(at);
      if (out.length === count) break;
    }
  }
  return out;
};

/** Tomorrow as "YYYY-MM-DD" in local time, the default start day. */
export const tomorrow = (now = new Date()): string => {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

export const formatWhen = (iso: string | Date): string =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
