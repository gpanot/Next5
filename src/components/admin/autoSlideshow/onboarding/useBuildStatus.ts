'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AutoRunDto } from '../../../../types/admin/autoSlideshow';
import { buildStatusOf, type BuildStatus } from './buildStatus';

/** Past this, the flow says the build is taking longer than usual and lets the user leave. */
const SLOW_AFTER_MS = 6 * 60_000;
/** Screens 0-3 show at least this much, so the bar moves while the first step runs. */
const FLOOR_BY_STEP = [8, 22, 36, 50];
const FLOOR_CAP = 95;

const msSince = (iso: string) => Date.now() - new Date(iso).getTime();

/**
 * The build as the onboarding shows it, read from the run the page already polls every 2 s. `barPct(step)`: on screens
 * 0-3 the bar shows max(real, floor) capped at 95 until the build is done; from screen 4 on, only the real value.
 */
export const useBuildStatus = (run: AutoRunDto) => {
  const build: BuildStatus = useMemo(() => buildStatusOf(run), [run]);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (build.status !== 'running') return;
    const check = () => setSlow(msSince(run.startedAt) > SLOW_AFTER_MS);
    const id = window.setInterval(check, 5_000);
    return () => window.clearInterval(id);
  }, [build.status, run.startedAt]);

  const barPct = (step: number): number => {
    if (build.status === 'done') return 100;
    const floor = FLOOR_BY_STEP[step];
    return floor === undefined ? build.pct : Math.min(FLOOR_CAP, Math.max(build.pct, floor));
  };

  return { build, slow: slow && build.status === 'running', barPct, buildMs: () => msSince(run.startedAt) };
};
