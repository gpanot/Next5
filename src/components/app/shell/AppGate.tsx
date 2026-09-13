'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { UNAUTHORIZED_EVENT } from '../../../lib/apiClient';
import { sessionTokenStore } from '../../../lib/localStore';
import { SkeletonText } from '../../ui/Skeleton';
import { SignInScreen } from './SignInScreen';
import { WorkspaceProvider } from './WorkspaceProvider';

type VerifyResult = { urlToken: string; ok: boolean };

/** Consumes `?token=` magic links, keeps the session token, and shows sign-in when there is none. */
export const AppGate = ({ children }: { children: ReactNode }) => {
  const token = sessionTokenStore.useValue();
  const params = useSearchParams();
  const router = useRouter();
  const urlToken = params.get('token');
  const [verified, setVerified] = useState<VerifyResult | null>(null);
  const verifying = Boolean(urlToken) && verified?.urlToken !== urlToken;

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

  useEffect(() => {
    const onUnauthorized = () => sessionTokenStore.set(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  if (token === undefined || verifying) {
    return <div className="mx-auto max-w-md px-5 py-24"><SkeletonText lines={4} /></div>;
  }
  if (!token) {
    return <SignInScreen notice={verified && !verified.ok ? 'That sign-in link has expired. Enter your email for a new one.' : undefined} />;
  }
  return <WorkspaceProvider token={token}>{children}</WorkspaceProvider>;
};
