'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { pendingSiteStore, SLIDESHOW_LOGIN } from './WorkspaceContext';

/** Website box: kept through sign-in, then it becomes the user's workspace and first run. Used in the hero and the final CTA. */
export function SiteForm({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    pendingSiteStore.set(url.trim());
    router.push(SLIDESHOW_LOGIN);
  };
  return (
    <form onSubmit={submit} className={`flex w-full max-w-2xl flex-col gap-2 rounded-2xl border border-line bg-white p-2 shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-2 focus-within:ring-blue-600/30 sm:flex-row sm:items-center sm:rounded-full dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="yourwebsite.com"
        aria-label="Your website"
        inputMode="url"
        autoCapitalize="none"
        className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base font-medium text-ink placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none dark:text-zinc-100"
      />
      <button type="submit" disabled={!url.trim()} className="min-h-11 rounded-full bg-blue-600 px-5 text-sm font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-95 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-400">
        Make slideshows →
      </button>
    </form>
  );
}
