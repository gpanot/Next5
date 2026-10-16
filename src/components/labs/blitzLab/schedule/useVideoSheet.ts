'use client';

import { useState } from 'react';
import type { BlitzScheduleDto } from '../../../../types/admin/blitzSchedule';
import { errorOf, type LabResponse } from '../../labClient';
import { useLabClient } from '../../LabClientProvider';
import { scheduleApi } from './scheduleApi';
import type { PostChoices } from './usePostChoices';

type Busy = 'approve' | 'remove' | 'move' | null;

type Options = { item: BlitzScheduleDto; onClose: () => void; onChanged: () => void };

const OFFLINE = 'Could not reach the server. Check your connection.';

/**
 * What the video sheet does to one calendar video: approve it (with its post choices), remove it (its credit comes
 * back), or move it to another day (same time of day). Approve closes the sheet; a move keeps it open on the new day.
 * Remove closes it too, unless a credit came back: then `refunded` shows the "credit added back" popup first, and the
 * list reloads on `dismissRefund` (a reload first could drop the canceled video and unmount the popup).
 */
export function useVideoSheet({ item, onClose, onChanged }: Options, choices: PostChoices) {
  const client = useLabClient();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState(item.scheduledAt);
  const [postNow, setPostNow] = useState(false);
  const [refunded, setRefunded] = useState(false);

  const send = async <T,>(how: Exclude<Busy, null>, call: () => Promise<LabResponse<T>>, notify = true): Promise<T | null> => {
    setBusy(how);
    setError(null);
    const res = await call().catch(() => null);
    setBusy(null);
    if (!res?.ok) {
      setError(res ? errorOf(res) : OFFLINE);
      return null;
    }
    if (notify) onChanged();
    return res.data;
  };

  // The button stays green: a tap says what is missing instead of a greyed-out button that says nothing.
  const approve = async () => {
    const missing = choices.check();
    if (missing) return setError(missing);
    if (await send('approve', () => scheduleApi.approve(client, item.id, postNow ? { ...choices.request(), postNow, tzOffsetMin: new Date().getTimezoneOffset() } : choices.request()))) onClose();
  };

  const remove = async () => {
    const data = await send('remove', () => scheduleApi.cancel(client, item.id), false);
    if (!data) return;
    if (data.refunded) return setRefunded(true);
    onChanged();
    onClose();
  };

  const dismissRefund = () => {
    onChanged();
    onClose();
  };

  const move = async (at: Date) => {
    if (at.getTime() === new Date(scheduledAt).getTime()) return;
    const data = await send('move', () => scheduleApi.move(client, item.id, { scheduledAt: at.toISOString(), tzOffsetMin: at.getTimezoneOffset() }));
    if (data) setScheduledAt(data.item.scheduledAt);
  };

  return { busy, error, setError, scheduledAt, postNow, setPostNow, approve, remove, move, refunded, dismissRefund };
}

export type VideoSheetActions = ReturnType<typeof useVideoSheet>;
