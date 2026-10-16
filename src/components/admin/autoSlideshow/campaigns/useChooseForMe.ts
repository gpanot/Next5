'use client';

import { useState } from 'react';
import type { PhotoOptionDto, PhotoTab } from '../../../../types/admin/slideshowCampaign';

/**
 * "Choose for me" on the Hook photos picker: runs `query` on Search (written with the hooks; `writeQuery` writes one for
 * hooks typed by hand) and picks its first photos, as many as are still missing (else `count`).
 */
export type ChooseForMe = { query: string; count: number; writeQuery: () => Promise<string> };

type Picker = {
  query: string;
  setQuery: (q: string) => void;
  setTab: (tab: PhotoTab) => void;
  /** The Search tab's results for `query` (null until loaded). */
  list: { options: PhotoOptionDto[] | null; loading: boolean; error: string | null };
  picked: PhotoOptionDto[];
  setPicked: (fn: (p: PhotoOptionDto[]) => PhotoOptionDto[]) => void;
  /** Photos still missing for one per hook. */
  missing: number;
};

/** The first `n` photos of `options` not picked yet. */
const freshOf = (options: PhotoOptionDto[], picked: PhotoOptionDto[], n: number) => options.filter((o) => !picked.some((p) => p.key === o.key)).slice(0, n);

/**
 * Runs the hook photos' search (writing one first when there is none) and picks from its results once they load. Called
 * while the picker renders: every setter belongs to the picker.
 */
export const useChooseForMe = (choose: ChooseForMe | undefined, picker: Picker) => {
  const { query, setQuery, setTab, list, picked, setPicked, missing } = picker;
  /** The search whose results are awaited, to pick from. */
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results in for the awaited search: pick from them here, while rendering (state of the picker's own component).
  if (waitingFor !== null && waitingFor === query && !list.loading && (list.options || list.error)) {
    const need = missing > 0 ? missing : Math.max(1, choose?.count ?? 1);
    const fresh = list.options ? freshOf(list.options, picked, need) : [];
    if (fresh.length > 0) setPicked((p) => [...p, ...fresh]);
    setError(list.error ? null : fresh.length === 0 ? 'No new photos for this search. Try another one.' : null);
    setWaitingFor(null);
  }

  const run = async () => {
    if (!choose) return;
    setTab('search');
    setError(null);
    let q = query.trim() || choose.query;
    if (!q) {
      setWriting(true);
      q = await choose.writeQuery().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not choose photos. Search for some instead.');
        return '';
      });
      setWriting(false);
      if (!q) return;
    }
    setQuery(q);
    setWaitingFor(q);
  };

  return { run, busy: writing || waitingFor !== null, error };
};
