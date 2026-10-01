'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { SlideshowSideDecks, SlideshowStrip } from '../SlideshowShowcase';
import { PublicTopBar } from './PublicTopBar';
import { pendingSiteStore, SLIDESHOW_LOGIN } from './WorkspaceContext';

/** Website box: kept through sign-in, then it becomes the user's workspace and first run. */
function SiteForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    pendingSiteStore.set(url.trim());
    router.push(SLIDESHOW_LOGIN);
  };
  return (
    <form onSubmit={submit} className="mt-8 flex w-full flex-col gap-2 rounded-2xl border border-line bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:rounded-full dark:border-zinc-800 dark:bg-zinc-900">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="yourbrand.com"
        aria-label="Your website"
        inputMode="url"
        autoCapitalize="none"
        className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base font-medium text-ink placeholder:text-zinc-300 focus:outline-none dark:text-zinc-100"
      />
      <button type="submit" disabled={!url.trim()} className="min-h-11 rounded-full bg-blue-600 px-5 text-sm font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-400">
        Make slideshows →
      </button>
    </form>
  );
}

/** /slideshow: the public Auto Slideshow home. Website in, then sign in (the email link also signs up), then the run starts. */
export function SlideshowHome() {
  return (
    <div className="min-h-dvh bg-app-bg">
      <PublicTopBar page="home" />
      <main className="relative px-4 py-4 md:px-8 md:py-8">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle,rgb(0_0_0/0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)] dark:bg-[radial-gradient(circle,rgb(255_255_255/0.08)_1px,transparent_1px)]" />
        <SlideshowSideDecks />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center py-8 text-center md:py-16">
          <h1 className="text-4xl leading-[0.95] font-extrabold tracking-tight text-ink md:text-6xl dark:text-zinc-100">
            TikTok slideshows
            <br />
            <span className="text-blue-600 dark:text-blue-400">made from your website.</span>
          </h1>
          <p className="mt-4 text-base text-muted dark:text-zinc-400">Paste a website. Get slideshows built on formats that already win.</p>
          <SiteForm />
          <p className="mt-4 text-xs text-muted">Uses approved models from Slideshow Knowledge. About 3-5 minutes.</p>
          <p className="mt-1 text-xs text-muted">You will need to review the posts first as per TikTok Policy.</p>
          <SlideshowStrip />
        </div>
      </main>
    </div>
  );
}
