// server-only — never import from a 'use client' file.
// Where a run's slideshows wait on the Calendar for approval, kept on the server so every device shows the same plan.

import { prisma } from '../../lib/db';
import { HttpError } from '../http';

const MAX_PINS = 200;
const LIVE = ['scheduled', 'sending', 'processing', 'posted'];

/** `{ slideshowId: ISO time | null }` from a request body; null takes a slideshow off its spot. */
const parsePins = (value: unknown): Map<string, Date | null> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'bad_plan', 'Pick when each post goes out.');
  const entries = Object.entries(value);
  if (entries.length > MAX_PINS) throw new HttpError(400, 'bad_plan', 'Too many posts at once.');
  return new Map(
    entries.map(([id, raw]) => {
      if (raw === null) return [id, null];
      const at = typeof raw === 'string' ? new Date(raw) : null;
      if (!at || Number.isNaN(at.getTime())) throw new HttpError(400, 'bad_time', 'Every post needs a time.');
      return [id, at];
    }),
  );
};

/**
 * Stores where the run's slideshows wait on the Calendar. Slideshows of other runs, and ones already scheduled or
 * posted, are left as they are.
 */
export const setPlannedTimes = async (runId: string, body: unknown): Promise<void> => {
  const pins = parsePins(body);
  if (pins.size === 0) return;
  const shows = await prisma.autoSlideshow.findMany({
    where: { runId, id: { in: [...pins.keys()] }, posts: { none: { status: { in: LIVE } } } },
    select: { id: true },
  });
  await prisma.$transaction(shows.map((s) => prisma.autoSlideshow.update({ where: { id: s.id }, data: { plannedAt: pins.get(s.id) ?? null } })));
};
