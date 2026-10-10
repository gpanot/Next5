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

/**
 * The Brand Cast at `path` (the user's '/brand-cast', or the admin's '/workspaces/[id]/cast'): load, make it, swap or
 * retry a face, make intro videos. Polls while a photo or a video is being made.
 */
export function useBrandCast(client: LabClient, path: string) {
  const [members, setMembers] = useState<BrandCastMemberDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchList = useCallback(
    () => client.request<BrandCastDto>(path).catch(() => null).then((res) => {
      if (res?.ok) {
        setMembers(res.data.members);
        setLoadError(null);
      } else setLoadError(res ? errorOf(res) : OFFLINE);
    }),
    [client, path],
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

  const send = useCallback(async (key: string, url: string, json: unknown) => {
    setBusy(key);
    setActionError(null);
    const res = await client.request<BrandCastDto>(url, { method: 'POST', json }).catch(() => null);
    if (res?.ok) setMembers(res.data.members);
    else setActionError(res ? errorOf(res) : OFFLINE);
    setBusy(null);
  }, [client]);

  const build = useCallback(() => send('build', path, {}), [send, path]);
  const act = useCallback((id: string, action: CastAction) => send(id, `${path}/${id}`, { action }), [send, path]);
  /** Starts the intro video of each member, one request at a time (each answers at once; the videos are made in parallel). */
  const makeIntros = useCallback(async (ids: string[]) => {
    setBusy('intros');
    setActionError(null);
    for (const id of ids) {
      const res = await client.request<BrandCastDto>(`${path}/${id}`, { method: 'POST', json: { action: 'intro' } }).catch(() => null);
      if (res?.ok) setMembers(res.data.members);
      else {
        setActionError(res ? errorOf(res) : OFFLINE);
        break;
      }
    }
    setBusy(null);
  }, [client, path]);
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
    if (res?.ok) setMembers(res.data.members);
    else setActionError(res ? errorOf(res) : OFFLINE);
    setBusy(null);
    return Boolean(res?.ok);
  }, [client, path]);
  const reload = useCallback(() => {
    setLoadError(null);
    void fetchList();
  }, [fetchList]);

  return { members, loadError, busy, actionError, build, act, swap, makeIntros, reload };
}
