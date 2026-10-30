'use client';

import { useEffect } from 'react';
import { adminFetch, useAdminApi } from '../business/useAdminApi';
import { isCopyViralBusy, type CopyViralCutMode, type CopyViralDirector, type CopyViralProject, type CopyViralResolution, type CopyViralSetup, type CopyViralShotEdit } from '../../../types/admin/copyViral';

const POLL_MS = 2_000;
const BASE = '/api/admin/copy-viral';

const usePoll = (active: boolean, refresh: () => void) => {
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [active, refresh]);
};

export const useCopyViralList = (token: string) => {
  const api = useAdminApi<{ projects: CopyViralProject[] }>(token, BASE);
  const projects = api.data?.projects ?? null;
  usePoll(!!projects?.some((p) => isCopyViralBusy(p.status)), api.refresh);
  return { projects, error: api.error, refresh: api.refresh };
};

export const useCopyViralProject = (token: string, id: string) => {
  const api = useAdminApi<{ project: CopyViralProject; dir?: string }>(token, `${BASE}/${id}`);
  const project = api.data?.project ?? null;
  /** The project folder on this Mac, to paste in Claude Code. */
  const dir = api.data?.dir ?? null;
  const previewing = !!project && (Object.values(project.previews).some((p) => p.status === 'RUNNING') || project.steal?.status === 'RUNNING');
  usePoll(!!project && (isCopyViralBusy(project.status) || previewing), api.refresh);
  return { project, dir, error: api.error, refresh: api.refresh };
};

/** Pasted in Claude Code: the short-editing skill joins the project's takes in shot order and edits them in a style. */
export const shortEditingCommand = (dir: string, style = 'kallaway') => `/short-editing ${dir} style ${style}`;

export const createFromUrl = (token: string, url: string) =>
  adminFetch<{ project: CopyViralProject }>(token, BASE, { method: 'POST', body: JSON.stringify({ url }) });

/** Sends the file itself as the body (no multipart), so the server streams it to disk. */
export const createFromUpload = async (token: string, file: File): Promise<CopyViralProject> => {
  const title = file.name.replace(/\.[^.]+$/, '');
  const res = await fetch(`${BASE}/upload?title=${encodeURIComponent(title)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type || 'video/mp4' },
    body: file,
  });
  const data = (await res.json().catch(() => ({}))) as { project?: CopyViralProject; error?: string; message?: string };
  if (!res.ok || !data.project) throw new Error(data.message ?? data.error ?? `Upload failed (${res.status})`);
  return data.project;
};

export const saveShots = (token: string, id: string, shots: CopyViralShotEdit[]) =>
  adminFetch<{ project: CopyViralProject }>(token, `${BASE}/${id}/shots`, { method: 'PUT', body: JSON.stringify({ shots }) });

export const reanalyzeProject = (token: string, id: string, threshold: number, cutMode?: CopyViralCutMode) =>
  adminFetch<{ ok: boolean }>(token, `${BASE}/${id}`, { method: 'POST', body: JSON.stringify({ action: 'reanalyze', threshold, cutMode }) });

export const readProjectShots = (token: string, id: string) =>
  adminFetch<{ ok: boolean }>(token, `${BASE}/${id}`, { method: 'POST', body: JSON.stringify({ action: 'read' }) });

/** Claude Code measures the reel's look once (/copy-viral-steal); `boards` keeps the look and writes the boards only. */
export const stealStyle = (token: string, id: string, boards = false) =>
  adminFetch<{ ok: boolean }>(token, `${BASE}/${id}`, { method: 'POST', body: JSON.stringify({ action: 'steal', boards }) });

export const useCopyViralSetups = (token: string) => {
  const api = useAdminApi<{ setups: CopyViralSetup[] }>(token, `${BASE}/setups`);
  return { setups: api.data?.setups ?? null, error: api.error, refresh: api.refresh };
};

/** Saves the project's measured look as a reusable setup. */
export const saveSetup = (token: string, projectId: string, name: string) =>
  adminFetch<{ setup: CopyViralSetup }>(token, `${BASE}/setups`, { method: 'POST', body: JSON.stringify({ projectId, name }) });

export const deleteSetup = (token: string, slug: string) =>
  adminFetch<{ ok: boolean }>(token, `${BASE}/setups?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });

/** A saved setup's look on this project, no boards yet. */
export const applySetup = (token: string, id: string, setup: string) =>
  adminFetch<{ project: CopyViralProject }>(token, `${BASE}/${id}`, { method: 'POST', body: JSON.stringify({ action: 'useSetup', setup }) });

export const rewriteLines = (token: string, id: string) =>
  adminFetch<{ ok: boolean }>(token, `${BASE}/${id}`, { method: 'POST', body: JSON.stringify({ action: 'rewrite' }) });

export const saveCaption = (token: string, id: string, myCaption: string) =>
  adminFetch<{ project: CopyViralProject }>(token, `${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify({ myCaption }) });

export const saveShotText = (token: string, id: string, index: number, startMs: number, patch: { myLine?: string; myOnScreenText?: string }) =>
  adminFetch<{ project: CopyViralProject }>(token, `${BASE}/${id}/shots/${index}`, { method: 'PATCH', body: JSON.stringify({ startMs, ...patch }) });

/** Recording step: this shot and the next become one take, or one shot splits at a sentence end. Lines kept, takes deleted. */
export const changeShot = (token: string, id: string, index: number, startMs: number, action: 'merge' | 'split') =>
  adminFetch<{ project: CopyViralProject }>(token, `${BASE}/${id}/shots/${index}`, { method: 'POST', body: JSON.stringify({ startMs, action }) });

/** Sends the clip itself as the body, like the reference upload. */
export const uploadClip = async (token: string, id: string, index: number, startMs: number, file: File): Promise<CopyViralProject> => {
  const res = await fetch(`${BASE}/${id}/clips/${index}?startMs=${startMs}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type || 'video/mp4' },
    body: file,
  });
  const data = (await res.json().catch(() => ({}))) as { project?: CopyViralProject; error?: string; message?: string };
  if (!res.ok || !data.project) throw new Error(data.message ?? data.error ?? `Upload failed (${res.status})`);
  return data.project;
};

export const deleteClip = (token: string, id: string, index: number, startMs: number) =>
  adminFetch<{ project: CopyViralProject }>(token, `${BASE}/${id}/clips/${index}?startMs=${startMs}`, { method: 'DELETE' });

/** Quick 720 render of one sequence from my takes. */
export const previewSequence = (token: string, id: string, sequence: number, director: CopyViralDirector = 'auto') =>
  adminFetch<{ ok: boolean }>(token, `${BASE}/${id}`, { method: 'POST', body: JSON.stringify({ action: 'preview', sequence, director }) });

/** The command to run the director by hand in Claude Code (same as the button, in a terminal). */
export const directorCommand = (id: string, sequence: number | null, resolution: CopyViralResolution) =>
  `/copy-viral-render ${id}${sequence !== null ? ` --sequence ${sequence + 1}` : ''} --resolution ${resolution}`;

export const renderEdit = (token: string, id: string, resolution: CopyViralResolution, director: CopyViralDirector = 'auto') =>
  adminFetch<{ ok: boolean }>(token, `${BASE}/${id}`, { method: 'POST', body: JSON.stringify({ action: 'render', resolution, director }) });

const bgPath = (id: string, index: number, startMs: number) => `${BASE}/${id}/backgrounds/${index}?startMs=${startMs}`;

/** Nano Banana 2.1 from the description ($0.03). */
export const generateBackground = (token: string, id: string, index: number, startMs: number, description: string) =>
  adminFetch<{ project: CopyViralProject }>(token, bgPath(id, index, startMs), { method: 'POST', body: JSON.stringify({ action: 'generate', description }) });

export const uploadBackground = async (token: string, id: string, index: number, startMs: number, file: File): Promise<CopyViralProject> => {
  const res = await fetch(bgPath(id, index, startMs), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type }, body: file });
  const data = (await res.json().catch(() => ({}))) as { project?: CopyViralProject; error?: string; message?: string };
  if (!res.ok || !data.project) throw new Error(data.message ?? data.error ?? `Upload failed (${res.status})`);
  return data.project;
};

export const previousBackground = (token: string, id: string, index: number, startMs: number) =>
  adminFetch<{ project: CopyViralProject }>(token, bgPath(id, index, startMs), { method: 'POST', body: JSON.stringify({ action: 'previous' }) });

export const removeBackground = (token: string, id: string, index: number, startMs: number) =>
  adminFetch<{ project: CopyViralProject }>(token, bgPath(id, index, startMs), { method: 'DELETE' });

export const deleteCopyViral = (token: string, id: string) =>
  adminFetch<{ ok: boolean }>(token, `${BASE}/${id}`, { method: 'DELETE' });

export const secondsLabel = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

/** 12.3 s → "0:12.3" */
export const timecode = (ms: number) => {
  const s = ms / 1000;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
};
