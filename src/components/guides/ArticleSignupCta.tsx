'use client';

import { track } from '@vercel/analytics';
import { useState, type FormEvent } from 'react';
import { BUSINESS_EMAIL_ONLY } from '../../lib/emailDomain';
import { pendingSiteStore } from '../admin/autoSlideshow/workspace/WorkspaceContext';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const inputClass =
  'min-h-12 w-full rounded-xl border border-line bg-white px-4 text-base text-ink placeholder:text-zinc-400 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500';

type Phase = { name: 'idle' } | { name: 'sending' } | { name: 'sent'; email: string } | { name: 'error'; message: string };

/** POST the sign-in link. The website waits in pendingSiteStore: the link opens /slideshow/login, which turns it into the workspace. */
async function sendLink(email: string): Promise<string | null> {
  const res = await fetch('/api/auth/studio/magic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, destination: 'slideshow' }),
  }).catch(() => null);
  if (res?.ok) return null;
  const body = (await res?.json().catch(() => null)) as { error?: string } | null;
  return body?.error === BUSINESS_EMAIL_ONLY ? 'Use your work email (not Gmail or Yahoo).' : 'We could not send the link. Check your email and try again.';
}

function SignupForm({ source, onSent }: { source?: string; onSent: (email: string) => void }) {
  const [site, setSite] = useState('');
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!site.trim()) return setPhase({ name: 'error', message: 'Add your website.' });
    if (!EMAIL.test(cleanEmail)) return setPhase({ name: 'error', message: 'Enter an email like you@business.com.' });
    setPhase({ name: 'sending' });
    pendingSiteStore.set(site.trim());
    const error = await sendLink(cleanEmail);
    if (error) return setPhase({ name: 'error', message: error });
    if (source) track('guide_cta_submit', { source });
    onSent(cleanEmail);
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="mx-auto mt-6 grid w-full max-w-md gap-3 text-left">
      <p className="text-center text-[15px] text-muted dark:text-zinc-400">We read your site to tailor your content with your voice.</p>
      <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-zinc-200">
        Your website
        <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="yourbusiness.com" inputMode="url" autoCapitalize="none" autoComplete="url" autoFocus className={inputClass} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink dark:text-zinc-200">
        Work email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" inputMode="email" autoComplete="email" className={inputClass} />
      </label>
      <p role="alert" className="min-h-5 text-sm text-red-600 dark:text-red-400">{phase.name === 'error' ? phase.message : ''}</p>
      <button type="submit" disabled={phase.name === 'sending'} className="min-h-12 rounded-full bg-blue-600 px-6 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400">
        {phase.name === 'sending' ? 'Sending…' : 'Send my free week →'}
      </button>
    </form>
  );
}

/**
 * The one call to action of a guide or blog post, after its questions. A big button; a tap opens the website + work
 * email form, which emails the sign-in link. `source` is the article's path, sent with the events.
 */
export function ArticleSignupCta({ source }: { source?: string }) {
  const [open, setOpen] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const openForm = () => {
    if (source) track('guide_cta_open', { source });
    setOpen(true);
  };

  return (
    <section aria-labelledby="article-cta" className="mt-14 rounded-3xl border border-line bg-white px-5 py-10 text-center shadow-sm md:px-10 md:py-14 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 id="article-cta" className="font-display text-[1.75rem] leading-tight font-bold tracking-tight text-balance text-ink md:text-4xl dark:text-zinc-100">
        Skip the work. Get the posts.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-[17px] leading-relaxed text-muted dark:text-zinc-400">
        Give us your website. We make a week of posts for your business, ready to post.
      </p>
      {sentTo ? (
        <div aria-live="polite" className="mx-auto mt-6 max-w-md rounded-2xl bg-blue-50 p-5 dark:bg-blue-950/40">
          <p className="text-lg font-bold text-ink dark:text-zinc-100">Check your inbox.</p>
          <p className="mt-1 text-[15px] text-muted dark:text-zinc-400">We sent a link to {sentTo}. Tap it and your week starts.</p>
        </div>
      ) : open ? (
        <SignupForm source={source} onSent={setSentTo} />
      ) : (
        <button type="button" onClick={openForm} className="mt-7 inline-flex min-h-14 w-full max-w-md items-center justify-center rounded-full bg-blue-600 px-6 text-base font-semibold whitespace-nowrap sm:w-auto sm:px-8 sm:text-lg text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] dark:bg-blue-500 dark:hover:bg-blue-400">
          Get 7 days of content for FREE
        </button>
      )}
      <p className="mt-4 text-sm text-muted dark:text-zinc-500">Free to start. No subscription.</p>
    </section>
  );
}
