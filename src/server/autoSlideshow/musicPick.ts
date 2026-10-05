// Pure track choice shared by Blitz cards and slideshows (no I/O, unit tested).
//
// Per piece of content: every pickable track gets a value = Jev fit (0..1, 0.5 when unknown) minus a penalty for each
// recent use in the workspace. Tracks already given to this batch are skipped while others remain. The pick is random
// among the tracks within CLOSE_FIT of the best value, so equally good songs take turns instead of one always winning.

/** Fit lost per recent use of a track in the workspace, up to MAX_RECENT_PENALTY. */
export const RECENT_PENALTY = 0.15;
export const MAX_RECENT_PENALTY = 0.45;
/** Tracks this close to the best value are all good picks; one of them is drawn at random. */
export const CLOSE_FIT = 0.1;
/** Jev fit assumed for a track it did not score (Jev off or the call failed). */
const UNKNOWN_FIT = 0.5;

export type TrackChoiceInput = {
  /** Pickable track ids. */
  pool: string[];
  /** Jev fit per track id for this piece of content. */
  fit: Map<string, number>;
  /** Uses per track id in the workspace lately. */
  recent: Map<string, number>;
  /** Track ids already picked for this batch; updated with the pick. Cleared when every track is used. */
  used: Set<string>;
  random?: () => number;
};

export const trackValue = (id: string, fit: Map<string, number>, recent: Map<string, number>): number =>
  (fit.get(id) ?? UNKNOWN_FIT) - Math.min(MAX_RECENT_PENALTY, RECENT_PENALTY * (recent.get(id) ?? 0));

/** One track id, or null when the pool is empty. */
export const chooseTrack = ({ pool, fit, recent, used, random = Math.random }: TrackChoiceInput): string | null => {
  if (pool.length === 0) return null;
  if (pool.every((id) => used.has(id))) used.clear();
  const open = pool.filter((id) => !used.has(id));
  const values = open.map((id) => ({ id, value: trackValue(id, fit, recent) }));
  const best = Math.max(...values.map((v) => v.value));
  const shortlist = values.filter((v) => v.value >= best - CLOSE_FIT);
  const picked = shortlist[Math.min(shortlist.length - 1, Math.floor(random() * shortlist.length))]!.id;
  used.add(picked);
  return picked;
};
