'use client';

/** "B2B No Website" requests. Manual runs are Campaign Studio runs with a `manual://` source. */

import type { ManualProfileInput, ProductPhoto } from '../../../../lib/manualProfile';
import type { LabClient } from '../../labClient';

export type ManualRunSummary = { id: string; createdAt: string; brandProfile: { sourceUrl: string; version: number } };
export type ManualRunDetail = { id: string; brandProfile: { sourceUrl: string; data: Record<string, unknown> } };
type SaveResult = { runId: string; products: ProductPhoto[] };

const saveBody = (profile: ManualProfileInput, photoAssetIds: string[], runId?: string) =>
  ({ runId, profile, photoAssetIds });

export const manualApi = {
  /** All runs; the caller keeps the manual ones. */
  listRuns: (client: LabClient) => client.request<ManualRunSummary[]>('/studio/runs'),

  getRun: (client: LabClient, runId: string) =>
    client.request<ManualRunDetail>(`/studio/runs/${encodeURIComponent(runId)}/profile`),

  create: (client: LabClient, profile: ManualProfileInput, photoAssetIds: string[]) =>
    client.request<SaveResult>('/studio/runs/manual', { json: saveBody(profile, photoAssetIds) }),

  update: (client: LabClient, runId: string, profile: ManualProfileInput, photoAssetIds: string[]) =>
    client.request<SaveResult>('/studio/runs/manual', { method: 'PATCH', json: saveBody(profile, photoAssetIds, runId) }),

  deleteRun: (client: LabClient, runId: string) =>
    client.request<{ ok: boolean }>(`/studio/runs?runId=${encodeURIComponent(runId)}`, { method: 'DELETE' }),
};
