'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AvatarVoicesDto } from '../../../../types/admin/brandCast';
import { errorOf, type LabClient } from '../../../labs/labClient';

const OFFLINE = 'Could not reach the server. Check your connection.';

/** "Change voice" for one avatar at `${path}/${memberId}/voices`: loads the candidates (made on the first open, ~15 s)
 *  and attaches one. `memberId` null: nothing loads. */
export function useAvatarVoices(client: LabClient, path: string, memberId: string | null) {
  const [data, setData] = useState<AvatarVoicesDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const url = memberId ? `${path}/${memberId}/voices` : null;

  const fetchVoices = useCallback(
    () => (url ? client.request<AvatarVoicesDto>(url).catch(() => null).then((res) => {
      if (res?.ok) {
        setData(res.data);
        setError(null);
      } else setError(res ? errorOf(res) : OFFLINE);
    }) : Promise.resolve()),
    [client, url],
  );

  // The dialog mounts with `key={member.id}`, so another avatar starts empty.
  useEffect(() => {
    void fetchVoices();
  }, [fetchVoices]);

  /** "Try again" after a failed load: back to the skeleton. */
  const load = useCallback(() => {
    setError(null);
    void fetchVoices();
  }, [fetchVoices]);

  /** True when it was attached. */
  const pick = useCallback(async (voice: string): Promise<boolean> => {
    if (!url) return false;
    setSaving(voice);
    setError(null);
    const res = await client.request<AvatarVoicesDto>(url, { method: 'POST', json: { voice } }).catch(() => null);
    if (res?.ok) setData(res.data);
    else setError(res ? errorOf(res) : OFFLINE);
    setSaving(null);
    return Boolean(res?.ok);
  }, [client, url]);

  return { data, error, saving, load, pick };
}
