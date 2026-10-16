'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { SignInScreen } from '../../app/shell/SignInScreen';
import { ImpersonationBanner } from '../shared/ImpersonationBanner';
import { RotatingWord } from '../../motion/RotatingWord';
import { SkeletonText } from '../../ui/Skeleton';
import { useMagicToken } from '../../../hooks/useMagicToken';
import { UNAUTHORIZED_EVENT } from '../../../lib/apiClient';
import { sessionTokenStore } from '../../../lib/localStore';
import { SIGNUP_PARAM } from './workspace/WorkspaceContext';

const noSubscribe = () => () => {};
/** True on /slideshow/login?signup=1 (the home page's website box); false on the server and for the plain Log in. */
const useSignupParam = () => useSyncExternalStore(noSubscribe, () => new URLSearchParams(window.location.search).has(SIGNUP_PARAM), () => false);

/**
 * Sign-in for Auto Slideshow users: consumes the `?token=` email link, keeps the session, shows the email form without one.
 * `fallback` shows while the session is read (and in the server HTML); pages pass their own skeleton so the frame does not jump.
 */
export function UserGate({ children, fallback }: { children: (token: string) => ReactNode; fallback?: ReactNode }) {
  const token = sessionTokenStore.useValue();
  const { verifying, failed } = useMagicToken();
  // The home page's website box = a new user's sign up: ask the name too. The plain "Log in" button asks only the email.
  const signingUp = useSignupParam();

  useEffect(() => {
    const onUnauthorized = () => sessionTokenStore.set(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  if (token === undefined || verifying) return fallback ?? <div className="mx-auto max-w-md px-5 py-24"><SkeletonText lines={4} /></div>;
  if (!token) {
    return <SignInScreen destination="slideshow" askName={signingUp} title={<>Log in to Auto <RotatingWord words={['Slideshows', 'Videos']} label="Slideshows and Videos" /></>} notice={failed ? 'That sign-in link has expired. Enter your email for a new one.' : undefined} />;
  }
  return (
    <>
      {children(token)}
      <ImpersonationBanner />
    </>
  );
}
