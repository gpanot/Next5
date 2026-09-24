'use client';

/**
 * Profile step for the labs: pick (or create) a Campaign Studio run, then review its profile.
 * Same run list and ProfileStep as Campaign Studio, read from <StudioRunProvider>.
 */

import { ProfileStep } from '../profile/ProfileStep';
import { RunListPanel } from './RunListPanel';
import { useStudioRunContext } from './StudioRunContext';

export function RunProfileStep({ onConfirmed }: { onConfirmed: () => void }) {
  const studio = useStudioRunContext();
  if (!studio) return null;
  const { token, runId, selectRun } = studio;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 sm:p-5">
      {runId ? (
        <>
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => selectRun(null)} className="shrink-0 text-[12px] text-muted hover:text-ink">
              ← All runs
            </button>
            <span className="truncate text-[12px] text-muted font-mono">{runId}</span>
          </div>
          <ProfileStep key={runId} token={token} runId={runId} onProfileConfirmed={onConfirmed} />
        </>
      ) : (
        <>
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Profile</h2>
            <p className="text-[13px] text-muted">
              Pick a run to reuse its brand profile and IDC niches. Runs are shared with Campaign Studio.
            </p>
          </div>
          <RunListPanel token={token} onSelectRun={selectRun} />
        </>
      )}
    </section>
  );
}
