'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BrandCastDto, BrandCastMemberDto } from '../../../../types/admin/brandCast';
import { errorOf, type LabClient } from '../../../labs/labClient';
import type { NewFaceRequest } from './NewFaceDialog';
import { MAX_RAW_BYTES, shrinkPhoto } from './shrinkPhoto';

const OFFLINE = 'Could not reach the server. Check your connection.';
/** While a face is being made (30-60 s), the list is read again this often. */
const POLL_MS = 4_000;

export type CastAction = 'swap' | 'retry' | 'intro';

/** What the owner can do to an archived face, or to a name and age: done when the request answers. */
export type ArchiveRequest =
  | { action: 'restore'; replace?: string }
  | { action: 'delete' }
  | { action: 'edit'; name: string; age: number };

/**
 * The Brand Cast at `path` (the user's '/brand-cast', or the admin's '/workspaces/[id]/cast'): load, make it, swap or
 * retry a face, make intro videos, and the archive (bring back, delete) and name edits. Polls while a photo or a video
 * is being made.
 */
export function useBrandCast(client: LabClient, path: string) {
  const [members, setMembers] = useState<BrandCastMemberDto[] | null>(null);
  const [archived, setArchived] = useState<BrandCastMemberDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const apply = useCallback((dto: BrandCastDto) => {
    setMembers(dto.members);
    setArchived(dto.archived ?? []);
  }, []);

  const fetchList = useCallback(
    () => client.request<BrandCastDto>(path).catch(() => null).then((res) => {
      if (res?.ok) {
        apply(res.data);
        setLoadError(null);
      } else setLoadError(res ? errorOf(res) : OFFLINE);
    }),
    [client, path, apply],
  );

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const pending = members?.some((m) => m.status === 'pending' || m.introStatus === 'pending') ?? false;
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => void fetchList(), POLL_MS);
    return () => clearTimeout(timer);
  }, [pending, members, fetchList]);

  /** True when it worked. */
  const send = useCallback(async (key: string, url: string, json: unknown): Promise<boolean> => {
    setBusy(key);
    setActionError(null);
    const res = await client.request<BrandCastDto>(url, { method: 'POST', json }).catch(() => null);
    if (res?.ok) apply(res.data);
    else setActionError(res ? errorOf(res) : OFFLINE);
    setBusy(null);
    return Boolean(res?.ok);
  }, [client, apply]);

  /** Makes the people of the empty slots, or only one of them (a "+ Create Avatar" card). */
  const build = useCallback((one = false) => send('build', path, one ? { count: 1 } : {}), [send, path]);
  const act = useCallback((id: string, action: CastAction) => send(id, `${path}/${id}`, { action }), [send, path]);
  const manage = useCallback((id: string, request: ArchiveRequest) => send(id, `${path}/${id}`, request), [send, path]);
  /** Starts the intro videos of these members as one click (1 credit in all; the videos are made in parallel). */
  const makeIntros = useCallback((ids: string[]) => send('intros', path, { action: 'intros', ids }), [send, path]);
  /** "New face" from the dialog: the note and the photo (made small first) go as a form. True when it started. */
  const swap = useCallback(async (id: string, { note, file }: NewFaceRequest): Promise<boolean> => {
    setBusy(id);
    setActionError(null);
    const form = new FormData();
    form.append('action', 'swap');
    form.append('note', note);
    const small = file ? await shrinkPhoto(file) : null;
    if (small && small.size > MAX_RAW_BYTES) {
      setActionError('This photo is too big. Try a JPG or PNG.');
      setBusy(null);
      return false;
    }
    if (small) form.append('file', small);
    const res = await client.request<BrandCastDto>(`${path}/${id}`, { form }).catch(() => null);
    if (res?.ok) apply(res.data);
    else setActionError(res ? errorOf(res) : OFFLINE);
    setBusy(null);
    return Boolean(res?.ok);
  }, [client, path, apply]);
  const reload = useCallback(() => {
    setLoadError(null);
    void fetchList();
  }, [fetchList]);

  const clearError = useCallback(() => setActionError(null), []);

  return { members, archived, loadError, busy, actionError, build, act, manage, swap, makeIntros, reload, clearError };
}
