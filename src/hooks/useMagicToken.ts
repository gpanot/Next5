'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sessionTokenStore } from '../lib/localStore';

type VerifyResult = { urlToken: string; ok: boolean };

/** Exchanges a `?token=` magic link for a session token, then removes it from the URL. */
export const useMagicToken = () => {
  const params = useSearchParams();
  const router = useRouter();
  const urlToken = params.get('token');
  const [verified, setVerified] = useState<VerifyResult | null>(null);

  useEffect(() => {
    if (!urlToken) return;
    let cancelled = false;
    fetch('/api/auth/studio/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: urlToken }) })
      .then((res) => res.json() as Promise<{ token?: string }>)
      .then((data) => {
        if (cancelled) return;
        if (data.token) sessionTokenStore.set(data.token);
        setVerified({ urlToken, ok: Boolean(data.token) });
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        router.replace(`${url.pathname}${url.search}`);
      })
      .catch(() => !cancelled && setVerified({ urlToken, ok: false }));
    return () => {
      cancelled = true;
    };
  }, [urlToken, router]);

  return {
    verifying: Boolean(urlToken) && verified?.urlToken !== urlToken,
    failed: verified !== null && !verified.ok,
  };
};
