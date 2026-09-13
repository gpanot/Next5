'use client';

import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { AppButton } from '../../ui/AppButton';
import { Field } from '../../ui/Field';
import { TextInput } from '../../ui/TextInput';
import { BusinessLogo } from '../../marketing/shared/MarketingHeader';

type Phase = { name: 'idle' } | { name: 'sending' } | { name: 'sent'; email: string } | { name: 'error'; message: string };

export const SignInScreen = ({ notice }: { notice?: string }) => {
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPhase({ name: 'sending' });
    const res = await fetch('/api/auth/studio/magic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, destination: 'app' }),
    }).catch(() => null);
    if (res?.ok) setPhase({ name: 'sent', email: email.trim().toLowerCase() });
    else setPhase({ name: 'error', message: 'We couldn’t send the link. Check the address and try again.' });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12">
      <BusinessLogo />
      <div className="w-full max-w-sm rounded-2xl border border-app-line bg-app-panel p-6 shadow-sm sm:p-8">
        {phase.name === 'sent' ? (
          <div className="flex flex-col items-center gap-3 text-center" role="status">
            <MailCheck aria-hidden className="h-10 w-10 text-app-accent" />
            <h1 className="text-[20px] font-semibold text-app-ink">Check your inbox</h1>
            <p className="text-[14px] text-app-muted">We sent a sign-in link to <span className="font-medium text-app-ink">{phase.email}</span>. It expires in 15 minutes.</p>
            <button type="button" onClick={() => setPhase({ name: 'idle' })} className="mt-2 text-[13px] text-app-accent hover:text-app-ink">Use a different email</button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-5">
            <div>
              <h1 className="text-[22px] font-semibold text-app-ink">Log in to Next5</h1>
              <p className="mt-1 text-[14px] text-app-muted">{notice ?? 'We’ll email you a secure sign-in link. No password needed.'}</p>
            </div>
            <Field label="Work email" htmlFor="signin-email" error={phase.name === 'error' ? phase.message : undefined}>
              <TextInput id="signin-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" />
            </Field>
            <AppButton type="submit" size="lg" fullWidth loading={phase.name === 'sending'}>Email me a link</AppButton>
          </form>
        )}
      </div>
      <p className="text-[14px] text-app-muted">New to Next5? <Link href="/start/brand" className="font-medium text-app-accent hover:text-app-ink">Start free</Link></p>
    </div>
  );
};
