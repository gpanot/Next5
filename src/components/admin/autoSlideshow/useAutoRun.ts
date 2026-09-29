'use client';

import { isTerminalAutoStatus, type AutoRunDto } from '../../../types/admin/autoSlideshow';
import { useRunPoller } from '../shared/useRunPoller';

type RunResponse = { run: AutoRunDto };

const isChanging = ({ run }: RunResponse) => !isTerminalAutoStatus(run.status);

/** Polls one run every 2 s until it completes or fails. `refresh` restarts polling (e.g. after a resume). */
export const useAutoRun = (token: string, runId: string) => {
  const { data, error, refresh } = useRunPoller<RunResponse>(token, `/api/admin/auto-slideshow/runs/${runId}`, { isChanging, intervalMs: 2_000 });
  return { run: data?.run ?? null, error, refresh };
};
