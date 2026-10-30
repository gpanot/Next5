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

/** What the owner can do to an archived face, to an active one ("Move to archive"), or to a name and age: done when the request answers. */
export type ArchiveRequest =
  | { action: 'restore'; replace?: string }
  | { action: 'delete' }
  | { action: 'archive' }
  | { action: 'edit'; name: string; age: number };

/**
 * The Brand Cast at `path` (the user's '/brand-cast', or the admin's '/workspaces/[id]/cast'): load, make it, swap or
 * retry a face, make intro videos, and the archive (bring back, delete) and name edits. Polls while a photo or a video
 * is being made.
 */
export function useBrandCast(client: LabClient, path: string) {
  const [members, setMembers] = useState<BrandCastMemberDto[] | null>(null);
  const [archived, setArchived] = useState<BrandCastMemberDto[]>([]);
  const [avatarConfirmedAt, setAvatarConfirmedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const apply = useCallback((dto: BrandCastDto) => {
    setMembers(dto.members);
    setArchived(dto.archived ?? []);
    setAvatarConfirmedAt(dto.avatarConfirmedAt ?? null);
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

  /** Makes the people of the empty slots, or only one of them. */
  const build = useCallback((one = false) => send('build', path, one ? { count: 1 } : {}), [send, path]);
  const act = useCallback((id: string, action: CastAction) => send(id, `${path}/${id}`, { action }), [send, path]);
  const manage = useCallback((id: string, request: ArchiveRequest) => send(id, `${path}/${id}`, request), [send, path]);
  /** Sends the note and the photo (made small first) as a form, busy under `key`. True when it started. */
  const sendForm = useCallback(async (key: string, url: string, { note, file }: NewFaceRequest, extra: Record<string, string> = {}): Promise<boolean> => {
    setBusy(key);
    setActionError(null);
    const form = new FormData();
    Object.entries(extra).forEach(([k, v]) => form.append(k, v));
    form.append('note', note);
    const small = file ? await shrinkPhoto(file) : null;
    if (small && small.size > MAX_RAW_BYTES) {
      setActionError('This photo is too big. Try a JPG or PNG.');
      setBusy(null);
      return false;
    }
    if (small) form.append('file', small);
    const res = await client.request<BrandCastDto>(url, { form }).catch(() => null);
    if (res?.ok) apply(res.data);
    else setActionError(res ? errorOf(res) : OFFLINE);
    setBusy(null);
    return Boolean(res?.ok);
  }, [client, apply]);
  /** "New face" from the dialog. True when it started. */
  const swap = useCallback((id: string, request: NewFaceRequest) => sendForm(id, `${path}/${id}`, request, { action: 'swap' }), [sendForm, path]);
  /** "Create avatar" from the dialog: one new person from the note and/or photo (neither: "Surprise me"). True when it started. */
  const create = useCallback((request: NewFaceRequest) => sendForm('build', path, request), [sendForm, path]);
  /** Onboarding's avatar gate: keeps this candidate, drops the others and starts the first slideshow. True when saved. */
  const confirmAvatar = useCallback((id: string) => send(id, `${path}/confirm`, { memberId: id }), [send, path]);
  /** The person "Surprise me" would make, as text to edit; null with `actionError` set when it failed. */
  const draft = useCallback(async (): Promise<string | null> => {
    setActionError(null);
    const res = await client.request<{ prompt: string }>(`${path}/draft`, { method: 'POST', json: {} }).catch(() => null);
    if (res?.ok) return res.data.prompt;
    setActionError(res ? errorOf(res) : OFFLINE);
    return null;
  }, [client, path]);
  const reload = useCallback(() => {
    setLoadError(null);
    void fetchList();
  }, [fetchList]);

  const clearError = useCallback(() => setActionError(null), []);

  return { members, archived, avatarConfirmedAt, loadError, busy, actionError, build, act, manage, swap, create, confirmAvatar, draft, reload, clearError };
}
