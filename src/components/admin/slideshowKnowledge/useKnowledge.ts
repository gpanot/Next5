'use client';

import { isBusy, type ModelDetailDto, type ModelSummaryDto, type ReferenceDto } from '../../../types/admin/slideshowKnowledge';
import { useAdminApi } from '../business/useAdminApi';
import { useRunPoller } from '../shared/useRunPoller';

type ReferencesResponse = { references: ReferenceDto[] };

const importing = ({ references }: ReferencesResponse) => references.some((r) => isBusy(r.status));

/** Recent imports, polled every 3 s while any post is still importing. */
export const useReferences = (token: string) => {
  const { data, error, refresh } = useRunPoller<ReferencesResponse>(token, '/api/admin/slideshow-knowledge/references', { isChanging: importing, intervalMs: 3_000 });
  return { references: data?.references ?? null, error, refresh, busy: data ? importing(data) : false };
};

export const useModels = (token: string) => {
  const { data, error, loading, refresh } = useAdminApi<{ models: ModelSummaryDto[] }>(token, '/api/admin/slideshow-knowledge/models');
  return { models: data?.models ?? null, error, loading, refresh };
};

export const useModel = (token: string, modelId: string) => {
  const { data, error, refresh } = useAdminApi<{ model: ModelDetailDto }>(token, `/api/admin/slideshow-knowledge/models/${modelId}`);
  return { model: data?.model ?? null, error, refresh };
};
