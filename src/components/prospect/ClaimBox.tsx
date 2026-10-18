'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { claimPath } from './postLabels';

type Props = { shareToken: string; name: string; total: number; price: string; claimed: boolean };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Sends the sign-in link that comes back to this page and claims the posts (ClaimRunner). The business email rule is
 *  the sign-in route's own: its error shows here. */
function ClaimForm({ shareToken, name }: Pick<Props, 'shareToken' | 'name'>) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!EMAIL.test(clean)) return setError('Enter an email like you@business.com.');
    setBusy(true);
    setError('');
    const res = await fetch('/api/auth/studio/magic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clean, destination: 'slideshow', returnTo: claimPath(shareToken) }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    if (!res?.ok) return setError(body?.error ?? 'Could not send the link. Try again.');
    setSentTo(clean);
  };

  if (sentTo) {
    return (
      <div aria-live="polite">
        <h3 className="m-0 mb-2 font-display text-[28px] font-[800] leading-tight">Check your inbox.</h3>
        <p className="m-0 opacity-75">We sent a link to {sentTo}. Tap it on this phone and the posts for {name} are yours.</p>
      </div>
    );
  }
  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-3">
      <label htmlFor="claim-email" className="text-[13px] font-semibold opacity-85">Work email</label>
      <input
        id="claim-email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@business.com"
        className="min-h-[52px] w-full rounded-[14px] border-[1.5px] border-app-bg/25 bg-transparent px-4 text-[16px] text-app-bg placeholder:text-app-bg/45 focus:border-app-bg/60 focus:outline-none"
      />
      <p role="alert" className="m-0 min-h-[1em] text-[13px] text-red-300 dark:text-red-700">{error}</p>
      <button type="submit" disabled={busy} className="mt-1 inline-flex min-h-[50px] w-full items-center justify-center rounded-full bg-app-accent px-6 text-[16px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60">
        {busy ? 'Sending…' : 'Get my posts'}
      </button>
    </form>
  );
}

/** The dark box at the end: what they get, what it costs after, and the email form. */
export function ClaimBox({ shareToken, name, total, price, claimed }: Props) {
  const rows = [
    ['These posts', 'Free to claim'],
    ['After that', `${price} a post`],
    ['Plan to cancel', 'None'],
  ];
  return (
    <section id="claim" className="scroll-mt-4 pb-16 pt-5">
      <div className="mx-auto max-w-[1180px] px-5">
        <div className="grid gap-7 rounded-[28px] bg-app-ink px-5 py-8 text-app-bg md:grid-cols-2 md:items-center md:p-12">
          <div>
            <h2 className="m-0 font-display text-[clamp(1.7rem,5vw,2.6rem)] font-[800] leading-[1.05] tracking-[-0.03em]">
              {claimed ? 'These posts were taken.' : `Get the ${total} posts for ${name}`}
            </h2>
            <p className="m-0 mt-3 max-w-[40ch] opacity-70">
              {claimed ? 'Log in to Next5 to see them.' : 'They land in your Next5 account, ready to approve, with your faces and your captions.'}
            </p>
            <dl className="m-0 mt-5 grid gap-1.5 text-[15px]">
              {rows.map(([k, v]) => (
                <div key={k} className="flex max-w-[360px] justify-between border-t border-app-bg/20 pt-2">
                  <dt>{k}</dt>
                  <dd className="m-0 font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            {claimed ? (
              <Link href="/slideshow/login" className="inline-flex min-h-[50px] w-full items-center justify-center rounded-full bg-app-accent px-6 font-semibold text-white">Log in</Link>
            ) : (
              <ClaimForm shareToken={shareToken} name={name} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
