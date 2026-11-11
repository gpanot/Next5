'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { UNAUTHORIZED_EVENT } from '../../../lib/apiClient';

/** `heard`: it has started playing once. A recording autoplays when it is new, never when its tab is reopened. */
export type ReadAloud = { url: string; durationS: number; costUsd: number; heard: boolean };

/** Fetches the script read aloud by the man's voice. A recording belongs to the text it read: a refined script shows none. */
export function useReadAloud(token: string, text: string) {
  const [made, setMade] = useState<(ReadAloud & { text: string }) | null>(null);
  const [failed, setFailed] = useState<{ text: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const listen = useCallback(async () => {
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch('/api/admin/script-generator/voice', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(data.message ?? data.error ?? `Request failed (${res.status})`);
      }
      const blob = await res.blob();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(blob);
      setMade({ text, url: urlRef.current, durationS: Number(res.headers.get('x-duration-s')) || 0, costUsd: Number(res.headers.get('x-cost-usd')) || 0, heard: false });
    } catch (err) {
      setFailed({ text, message: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setBusy(false);
    }
  }, [token, text]);

  const markHeard = useCallback(() => setMade((m) => (m ? { ...m, heard: true } : m)), []);
  return { audio: made?.text === text ? made : null, busy, error: failed?.text === text ? failed.message : '', listen, markHeard };
}
