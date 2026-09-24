/**
 * Typed client helpers for the Campaign Studio admin API.
 */

const BASE = '/api/admin/studio/runs';

async function req<T>(url: string, options: RequestInit, token: string): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Run CRUD ────────────────────────────────────────────────────────────────

export type StudioRunSummary = {
  id: string;
  step: string;
  extractStatus: string;
  researchStatus: string;
  generateStatus: string;
  extractDurationMs: number | null;
  researchDurationMs: number | null;
  generateDurationMs: number | null;
  extractCostUsdMicros: string | null;
  researchCostUsdMicros: string | null;
  extractError: string | null;
  researchError: string | null;
  generateError: string | null;
  createdAt: string;
  brandProfile: { sourceUrl: string; version: number };
  _count: { candidates: number };
};

export const listRuns = (token: string) =>
  req<StudioRunSummary[]>(BASE, { method: 'GET' }, token);

export const createRun = (token: string, sourceUrl: string, workspaceId?: string) =>
  req<{ runId: string; profileId: string }>(BASE, {
    method: 'POST',
    body: JSON.stringify({ sourceUrl, workspaceId }),
  }, token);

// ── Profile ─────────────────────────────────────────────────────────────────

export type StudioRunFull = StudioRunSummary & {
  extractError: string | null;
  researchError: string | null;
  generateError: string | null;
  researchDurationMs: number | null;
  researchCostUsdMicros: string | null;
  brandProfile: {
    id: string;
    sourceUrl: string;
    version: number;
    data: Record<string, unknown>;
    crawl: Record<string, unknown>;
  };
};

export const getRun = (token: string, runId: string) =>
  req<StudioRunFull>(`${BASE}/${runId}/profile`, { method: 'GET' }, token);

export const triggerExtract = (token: string, runId: string) =>
  req<{ ok: boolean; runId: string }>(`${BASE}/${runId}/profile`, { method: 'POST', body: '{}' }, token);

export const patchProfile = (token: string, runId: string, data: Record<string, unknown>) =>
  req<{ ok: boolean; profileId: string; version: number }>(`${BASE}/${runId}/profile`, {
    method: 'PATCH',
    body: JSON.stringify({ data }),
  }, token);

// ── Research ────────────────────────────────────────────────────────────────

export type StudioResearchItemDto = {
  id: string;
  keyword: string;
  sourceUrl: string;
  author: string | null;
  durationSeconds: number | null;
  stats: Record<string, unknown>;
  hook: string | null;
  transcript: string | null;
  templateId: string | null;
  variables: Record<string, unknown>;
  selected: boolean;
  excluded: boolean;
  excludedReason: string | null;
  isCompetitor: boolean;
  createdAt: string;
};

export const listResearchItems = (token: string, runId: string) =>
  req<StudioResearchItemDto[]>(`${BASE}/${runId}/research`, { method: 'GET' }, token);

export const triggerResearch = (token: string, runId: string, keywords?: string[]) =>
  req<{ ok: boolean; runId: string }>(`${BASE}/${runId}/research`, {
    method: 'POST',
    body: JSON.stringify({ keywords }),
  }, token);

// ── Generation ──────────────────────────────────────────────────────────────

export type StudioCandidateDto = {
  id: string;
  runId: string;
  engine: string;
  templateId: string | null;
  angle: string | null;
  payload: Record<string, unknown>;
  costUsdMicros: string | null;
  generateDurationMs: number | null;
  profileVersion: number;
  status: 'pending' | 'accepted' | 'rejected' | 'edited';
  rejectReason: string | null;
  rejectNote: string | null;
  blitzProjectId: string | null;
  slotDate: string | null;
  guardrailWarnings: Array<{ type: string; text: string; rule: string }>;
  createdAt: string;
};

export const listCandidates = (token: string, runId: string) =>
  req<StudioCandidateDto[]>(`${BASE}/${runId}/generate`, { method: 'GET' }, token);

export const triggerGenerate = (token: string, runId: string) =>
  req<{ ok: boolean; runId: string }>(`${BASE}/${runId}/generate`, {
    method: 'POST',
    body: '{}',
  }, token);

export const patchCandidate = (
  token: string,
  runId: string,
  candidateId: string,
  patch: {
    status?: 'accepted' | 'rejected' | 'edited';
    rejectReason?: string;
    rejectNote?: string;
    payload?: Record<string, unknown>;
  },
) =>
  req<StudioCandidateDto>(`${BASE}/${runId}/candidates/${candidateId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }, token);
