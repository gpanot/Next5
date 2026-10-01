'use client';

import { useState, type FormEvent } from 'react';
import { adminFetch } from '../business/useAdminApi';
import { AdSideDecks, AdStrip } from './AdShowcase';
import { HowItWorks } from './HowItWorks';
import { RecentRuns } from './RecentRuns';

const EXAMPLES = ['allbirds.com', 'glossier.com', 'warbyparker.com'];

/** A first run makes one ad; "Get 5 more" on the run page makes the rest. */
const FIRST_RUN_ADS = 1;

type Props = { token: string; onRun: (runId: string) => void };

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function StartScreen({ token, onRun }: Props) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (target: string) => {
    if (!target.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { runId } = await adminFetch<{ runId: string }>(token, '/api/admin/meta-ads/runs', { method: 'POST', body: JSON.stringify({ url: target, adCount: FIRST_RUN_ADS }) });
      onRun(runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start');
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void start(url);
  };

  return (
    <div className="relative">
      {/* Decorative dot grid, faded out toward the bottom */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle,rgb(0_0_0/0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)] dark:bg-[radial-gradient(circle,rgb(255_255_255/0.08)_1px,transparent_1px)]" />
      <AdSideDecks />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center py-10 text-center md:py-20">
        <h2 className="text-5xl leading-[0.95] font-extrabold tracking-tight text-ink md:text-7xl dark:text-zinc-100">
          Meta ads
          <br />
          <span className="text-blue-600 dark:text-blue-400">that win.</span>
        </h2>
        <p className="mt-5 text-base text-muted md:text-lg dark:text-zinc-400">Paste your website. Get ads in about a minute.</p>

        <form onSubmit={submit} className="mt-10 flex w-full max-w-2xl items-center rounded-full border border-line bg-white p-1.5 shadow-sm transition focus-within:ring-4 focus-within:ring-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:focus-within:ring-blue-950">
          <span className="ml-3 hidden text-muted sm:block"><GlobeIcon /></span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yourbrand.com"
            inputMode="url"
            autoCapitalize="none"
            className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base font-medium text-ink placeholder:text-zinc-300 focus:outline-none dark:text-zinc-100"
          />
          <button type="submit" disabled={busy || !url.trim()} className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-400">
            {busy ? 'Starting…' : 'Get ads →'}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-muted">
          <span>Try</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              disabled={busy}
              onClick={() => void start(example)}
              className="rounded-full border border-line bg-white px-3 py-2 text-xs font-medium text-ink transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {example}
            </button>
          ))}
        </div>

        <HowItWorks />
        <AdStrip />

        <RecentRuns token={token} onOpen={onRun} />
      </div>
    </div>
  );
}
