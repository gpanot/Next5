'use client';

import { useEffect, type ReactNode } from 'react';
import { SignInScreen } from '../../app/shell/SignInScreen';
import { RotatingWord } from '../../motion/RotatingWord';
import { SkeletonText } from '../../ui/Skeleton';
import { useMagicToken } from '../../../hooks/useMagicToken';
import { UNAUTHORIZED_EVENT } from '../../../lib/apiClient';
import { sessionTokenStore } from '../../../lib/localStore';

/**
 * Sign-in for Auto Slideshow users: consumes the `?token=` email link, keeps the session, shows the email form without one.
 * `fallback` shows while the session is read (and in the server HTML); pages pass their own skeleton so the frame does not jump.
 */
export function UserGate({ children, fallback }: { children: (token: string) => ReactNode; fallback?: ReactNode }) {
  const token = sessionTokenStore.useValue();
  const { verifying, failed } = useMagicToken();

  useEffect(() => {
    const onUnauthorized = () => sessionTokenStore.set(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  if (token === undefined || verifying) return fallback ?? <div className="mx-auto max-w-md px-5 py-24"><SkeletonText lines={4} /></div>;
  if (!token) {
    return <SignInScreen destination="slideshow" title={<>Log in to Auto <RotatingWord words={['Slideshows', 'Videos']} label="Slideshows and Videos" /></>} notice={failed ? 'That sign-in link has expired. Enter your email for a new one.' : undefined} />;
  }
  return <>{children(token)}</>;
}
