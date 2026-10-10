'use client';

import type { ShortBeatDto } from '../../../types/admin/shorts';

const PILL = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold';

/** The photo check's verdict on one shot: passed, passed after a retry, or still flagged (kept anyway). */
export function ShotQaBadge({ beat }: { beat: ShortBeatDto }) {
  const qa = beat.qa;
  if (!qa) return null;
  if (qa.ok && !qa.retried) {
    return <span className={`${PILL} bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300`}>Photo check ✓</span>;
  }
  return (
    <span
      title={qa.firstProblem ?? qa.problem}
      className={qa.ok ? `${PILL} bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300` : `${PILL} bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300`}
    >
      {qa.ok ? 'Photo check ✓ after retry' : 'Photo check: flagged'}
    </span>
  );
}

/** What the check found and what the retry changed, under the shot's photo. */
export function ShotQaDetail({ beat }: { beat: ShortBeatDto }) {
  const qa = beat.qa;
  if (!qa || (qa.ok && !qa.retried)) return null;
  return (
    <div className="space-y-1 rounded-lg bg-app-sunken p-2 text-[11px] text-app-muted">
      {qa.firstProblem && <p>First photo rejected: <span className="text-app-ink">{qa.firstProblem}</span></p>}
      {qa.fix && <p>Retry added: <span className="text-app-ink">{qa.fix}</span></p>}
      {!qa.ok && qa.problem && <p>Still flagged (photo kept): <span className="text-app-danger">{qa.problem}</span></p>}
    </div>
  );
}
