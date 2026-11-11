// Pure track choice shared by Blitz cards and slideshows (no I/O, unit tested).
//
// Per piece of content: a random track among the ones the workspace used least lately. Tracks already given to this
// batch are skipped while others remain.

export type TrackChoiceInput = {
  /** Pickable track ids. */
  pool: string[];
  /** Uses per track id in the workspace lately. */
  recent: Map<string, number>;
  /** Track ids already picked for this batch; updated with the pick. Cleared when every track is used. */
  used: Set<string>;
  random?: () => number;
};

/** One track id, or null when the pool is empty. */
export const chooseTrack = ({ pool, recent, used, random = Math.random }: TrackChoiceInput): string | null => {
  if (pool.length === 0) return null;
  if (pool.every((id) => used.has(id))) used.clear();
  const open = pool.filter((id) => !used.has(id));
  const fewest = Math.min(...open.map((id) => recent.get(id) ?? 0));
  const shortlist = open.filter((id) => (recent.get(id) ?? 0) === fewest);
  const picked = shortlist[Math.min(shortlist.length - 1, Math.floor(random() * shortlist.length))]!;
  used.add(picked);
  return picked;
};
