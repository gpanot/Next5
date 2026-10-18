// Pure helpers for the Claude connector's tools: dates in the workspace's time zone and the approval link.
// No database here (tests/server/mcp/plannerFormat.test.ts).

import { atViewerTime, offsetMs, viewerDay } from '../labs/ideaDays';

/** One idea as Claude sees it. */
export type IdeaView = {
  id: string;
  format: 'video' | 'slideshow';
  status: 'proposed' | 'kept' | 'skipped';
  /** The workspace's local time: "Mon 2026-10-19 19:00". */
  planned_for: string;
  planned_at: string;
  hook: string;
  /** Video: the 7 on-screen lines (hook first). Slideshow: its slide titles. */
  script: string[];
  angle: string | null;
  hook_style: string | null;
  cover_url: string | null;
  /** Slideshows are made in the background: false until they can go on the calendar. */
  ready: boolean;
  other_hooks: string[];
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n: number) => String(n).padStart(2, '0');

/** "Mon 2026-10-19 19:00" in the zone of `tzOffsetMin` (a browser's getTimezoneOffset: UTC+7 is -420). */
export const localTime = (at: Date, tzOffsetMin: number): string => {
  const local = new Date(at.getTime() - offsetMs(tzOffsetMin));
  return `${WEEKDAYS[local.getUTCDay()]} ${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
};

/** `days` whole local days from `startDate` (YYYY-MM-DD; default tomorrow). */
export const windowOf = (startDate: string | undefined, days: number, tzOffsetMin: number, now = new Date()): { from: Date; to: Date } => {
  const start = startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && !Number.isNaN(Date.parse(`${startDate}T00:00:00Z`))
    ? Math.floor(Date.parse(`${startDate}T00:00:00Z`) / 86_400_000)
    : viewerDay(now, tzOffsetMin) + 1;
  return { from: atViewerTime(start, '00:00', tzOffsetMin), to: atViewerTime(start + days, '00:00', tzOffsetMin) };
};

export { approvalPath } from '../../lib/approvalLink';
