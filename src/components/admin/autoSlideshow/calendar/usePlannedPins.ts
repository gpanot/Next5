'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AutoRunDto } from '../../../../types/admin/autoSlideshow';
import { adminFetch } from '../../business/useAdminApi';
import type { Pins } from './monthPlan';
import { useLocalPins } from './useCalendarStore';

/** The run's slideshows' Calendar spots as stored on the server. */
export const serverPins = (slideshows: AutoRunDto['slideshows']): Pins =>
  Object.fromEntries(slideshows.flatMap((s) => (s.plannedAt ? [[s.id, s.plannedAt]] : [])));

/** Stores where the run's slideshows wait on the Calendar (null: back to the next free slot). */
export const savePlannedPins = (token: string, runId: string, pins: Record<string, string | null>) =>
  adminFetch(token, `/api/admin/auto-slideshow/runs/${runId}/plan`, { method: 'PUT', body: JSON.stringify({ pins }) });

/**
 * Where each not-yet-approved slideshow is pinned. The run's own slideshows are kept on the server, so every device
 * shows the same plan; other slideshows on the Calendar (a campaign's, dragged here) stay in this browser. A change
 * shows at once and stays until the run is read again after it was saved.
 */
export const usePlannedPins = (token: string, run: AutoRunDto, onSaved: () => void): [Pins, (next: Pins) => void] => {
  const [local, setLocal] = useLocalPins(run.id);
  const [sent, setSent] = useState<Pins | null>(null);
  const saving = useRef(0);
  const server = useMemo(() => serverPins(run.slideshows), [run.slideshows]);
  // The run read again with nothing on its way: the server has the latest plan.
  useEffect(() => {
    if (saving.current === 0) setSent(null);
  }, [server]);
  const own = useMemo(() => new Set(run.slideshows.map((s) => s.id)), [run.slideshows]);
  const pins = useMemo(() => ({ ...local, ...server, ...sent }), [local, server, sent]);

  const setPins = (next: Pins) => {
    setLocal(Object.fromEntries(Object.entries(next).filter(([id]) => !own.has(id))));
    const ownNext = Object.fromEntries(Object.entries(next).filter(([id]) => own.has(id)));
    const changes: Record<string, string | null> = Object.fromEntries(Object.entries(ownNext).filter(([id, at]) => pins[id] !== at));
    for (const id of Object.keys(pins)) if (own.has(id) && !(id in ownNext)) changes[id] = null;
    if (Object.keys(changes).length === 0) return;
    setSent({ ...server, ...sent, ...ownNext });
    saving.current += 1;
    void savePlannedPins(token, run.id, changes)
      .catch((err: unknown) => console.warn('[calendar] plan not saved:', err instanceof Error ? err.message : err))
      .finally(() => {
        saving.current -= 1;
        onSaved();
      });
  };
  return [pins, setPins];
};
