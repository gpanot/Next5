'use client';

import { useEffect, type ReactNode } from 'react';
import { useMagicToken } from '../../../hooks/useMagicToken';
import { UNAUTHORIZED_EVENT } from '../../../lib/apiClient';
import { sessionTokenStore } from '../../../lib/localStore';
import { SkeletonText } from '../../ui/Skeleton';
import { SignInScreen } from './SignInScreen';
import { WorkspaceProvider } from './WorkspaceProvider';

/** Consumes `?token=` magic links, keeps the session token, and shows sign-in when there is none. */
export const AppGate = ({ children }: { children: ReactNode }) => {
  const token = sessionTokenStore.useValue();
  const { verifying, failed } = useMagicToken();

  useEffect(() => {
    const onUnauthorized = () => sessionTokenStore.set(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  if (token === undefined || verifying) {
    return <div className="mx-auto max-w-md px-5 py-24"><SkeletonText lines={4} /></div>;
  }
  if (!token) {
    return <SignInScreen notice={failed ? 'That sign-in link has expired. Enter your email for a new one.' : undefined} />;
  }
  return <WorkspaceProvider token={token}>{children}</WorkspaceProvider>;
};
