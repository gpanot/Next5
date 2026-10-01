'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { SlideshowSideDecks, SlideshowStrip } from '../SlideshowShowcase';
import { HomeFaq } from './HomeFaq';
import { PlatformBadges } from './PlatformBadges';
import { PublicFooter } from './PublicFooter';
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
    <form onSubmit={submit} className="mt-7 flex w-full max-w-2xl flex-col gap-2 rounded-2xl border border-line bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:rounded-full dark:border-zinc-800 dark:bg-zinc-900">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="yourwebsite.com"
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
        <div className="relative mx-auto flex max-w-2xl flex-col items-center pt-8 pb-4 text-center md:max-w-4xl md:py-10 lg:max-w-5xl xl:max-w-6xl">
          <PlatformBadges />
          <h1 className="text-[2.375rem] leading-[1.05] font-extrabold tracking-tight text-balance text-ink md:text-5xl md:leading-[1.0] lg:text-[3.625rem] dark:text-zinc-100">
            <span className="xl:whitespace-nowrap">Slideshows that bring you customers.</span>
            <span className="mt-2 block text-blue-600 md:mt-1 lg:whitespace-nowrap dark:text-blue-400">
              No filming. No editing. <br className="md:hidden" />
              99¢ a post.
            </span>
          </h1>
          <p className="mt-5 max-w-sm text-[17px] leading-relaxed text-muted md:mt-4 md:max-w-none md:text-base lg:text-lg dark:text-zinc-400">Paste your website. Get posts built on formats that already get views.</p>
          <SiteForm />
          <p className="mt-4 text-[13px] text-muted md:mt-3 md:text-xs">Ready in about 5 minutes. You approve every post first.</p>
          <SlideshowStrip />
        </div>
        <HomeFaq />
      </main>
      <PublicFooter />
    </div>
  );
}
