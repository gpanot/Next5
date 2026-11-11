'use client';

import { useMemo, useState } from 'react';
import { currentAutoStep, isTerminalAutoStatus, type AutoRunDto } from '../../../../types/admin/autoSlideshow';
import type { BrandCastMemberDto } from '../../../../types/admin/brandCast';
import { createWorkspaceLabClient } from '../../../labs/labClient';
import { useBrandCast } from '../brand/useBrandCast';
import type { NewFaceRequest } from '../brand/NewFaceDialog';

/** Ready candidates first: the pick defaults to one the owner can actually use. */
const firstReady = (members: BrandCastMemberDto[]): BrandCastMemberDto | undefined => members.find((m) => m.status === 'ready' && m.imageUrl);

/**
 * The onboarding's brand avatar gate: the candidates, the pick and the confirm. `open` while the owner has not picked
 * yet and the run is parked for it (or a candidate is already there) — the run makes no slideshow before the pick
 * (src/server/brandCast/gate.ts). Closed for a run that is over, so a failed or finished run is never blocked by it.
 */
export const useAvatarGate = (token: string, workspaceId: string, run: AutoRunDto) => {
  const client = useMemo(() => createWorkspaceLabClient(token, workspaceId), [token, workspaceId]);
  const cast = useBrandCast(client, '/brand-cast');
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const members = cast.members;
  const started = run.status === 'WAITING_AVATAR' || (members !== null && members.length > 0);
  // Never a run already past step 4: its slideshows are written, so there is nothing left to validate.
  const beforeStep4 = !isTerminalAutoStatus(run.status) && currentAutoStep(run.status) <= 4;
  const open = cast.avatarConfirmedAt === null && started && beforeStep4;
  // The owner's tap, while that candidate is still there; otherwise the first usable one.
  const chosenId = (picked && members?.some((m) => m.id === picked) ? picked : firstReady(members ?? [])?.id) ?? null;

  const confirm = async (): Promise<boolean> => {
    if (!chosenId) return false;
    setSaving(true);
    const ok = await cast.confirmAvatar(chosenId);
    setSaving(false);
    return ok;
  };

  return {
    open,
    members,
    chosenId,
    busy: cast.busy,
    saving,
    error: cast.actionError ?? cast.loadError,
    choose: setPicked,
    create: (request: NewFaceRequest) => void cast.create(request),
    retry: (id: string) => void cast.act(id, 'retry'),
    draft: cast.draft,
    confirm,
  };
};
