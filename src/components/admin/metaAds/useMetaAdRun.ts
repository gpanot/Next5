'use client';

import { isTerminalStatus, type MetaAdRunDto } from '../../../types/admin/metaAds';
import { useRunPoller } from '../shared/useRunPoller';

type RunResponse = { run: MetaAdRunDto };

/** A finished run still changes while one of its ads is being regenerated. */
const isChanging = ({ run }: RunResponse) => !isTerminalStatus(run.status) || run.ads.some((a) => a.status === 'imaging' || a.status === 'compositing');

/** Polls one run until it completes or fails and no ad is being redesigned. `refresh` restarts polling (e.g. after a resume). */
export const useMetaAdRun = (token: string, runId: string) => {
  const { data, error, refresh } = useRunPoller<RunResponse>(token, `/api/admin/meta-ads/runs/${runId}`, { isChanging });
  return { run: data?.run ?? null, error, refresh };
};
