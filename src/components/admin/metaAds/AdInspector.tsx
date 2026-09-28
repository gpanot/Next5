'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { adminFetch } from '../business/useAdminApi';
import { isTerminalStatus, type CompetitorAd, type MetaAdDto, type MetaAdRunDto } from '../../../types/admin/metaAds';
import { CopyRow } from './CopyRow';
import { FeedPreview } from './FeedPreview';
import { downloadAd } from './downloads';
import { VideoAdTab } from './VideoAdTab';

type Props = { token: string; run: MetaAdRunDto; index: number; onIndex: (index: number | null) => void; onChanged: () => void };

function Section({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <span className="text-[10px] font-bold tracking-wider text-muted uppercase">{label}</span>
        <span className="text-[10px] text-muted">{hint}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RoundButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button aria-label={label} onClick={onClick} disabled={disabled} className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition hover:bg-zinc-50 disabled:opacity-30 dark:border-zinc-700 dark:hover:bg-zinc-800">
      {children}
    </button>
  );
}

function Details({ ad, source }: { ad: MetaAdDto; source: CompetitorAd | undefined }) {
  return (
    <div className="flex-1 space-y-6">
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase dark:bg-blue-950 dark:text-blue-300">{ad.angle}</span>
          <span className="rounded bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-700 uppercase dark:bg-zinc-800 dark:text-zinc-300">{ad.style}</span>
        </div>
        <h3 className="text-2xl font-bold text-ink dark:text-zinc-100">{ad.overlayText}</h3>
        {ad.play && (
          <p className="mt-2 text-xs text-muted">
            Play <span className="font-semibold text-ink dark:text-zinc-100">{ad.play}</span>
            {source && (
              <>
                {' '}· from {source.own ? 'your own winning ad' : 'Hormozi pick'}{' '}
                <a href={source.libraryUrl} target="_blank" rel="noreferrer" className="font-medium text-blue-600 dark:text-blue-400">{source.pageName} ↗</a>
              </>
            )}
          </p>
        )}
      </div>
      <Section label="Primary text" hint="Above the image · 125 chars visible">
        <CopyRow index={1} text={ad.primaryText} limit={125} primary />
        {ad.primaryTextAlt && <CopyRow index={2} text={ad.primaryTextAlt} limit={125} primary={false} />}
      </Section>
      <Section label="Headline" hint="Below the image · 40 chars">
        <CopyRow index={1} text={ad.headline} limit={40} primary />
      </Section>
      <details className="rounded-xl border border-line bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
        <summary className="cursor-pointer font-medium text-muted">Image prompt sent to the image model</summary>
        <p className="mt-2 leading-relaxed whitespace-pre-wrap text-ink dark:text-zinc-200">{ad.imagePrompt}</p>
      </details>
      {ad.error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">{ad.error}</p>}
    </div>
  );
}

/** New image for this ad (same prompt): for the times the model gets a detail wrong. */
function RegenerateButton({ token, run, ad, onChanged }: { token: string; run: MetaAdRunDto; ad: MetaAdDto; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const busy = ad.status === 'imaging' || ad.status === 'compositing';
  const regenerate = async () => {
    setError(null);
    try {
      await adminFetch(token, `/api/admin/meta-ads/runs/${run.id}/ads/${ad.id}/regenerate`, { method: 'POST' });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not regenerate');
    }
  };
  return (
    <div className="flex flex-col items-end">
      <button
        onClick={() => void regenerate()}
        disabled={busy}
        className="flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-xs font-semibold transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        {busy && <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-ink dark:border-zinc-600 dark:border-t-zinc-100" />}
        {busy ? 'Regenerating…' : '↻ Regenerate image'}
      </button>
      {error && <span className="mt-1 text-[10px] text-red-600">{error}</span>}
    </div>
  );
}

type Tab = 'image' | 'video';

function Tabs({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-line px-4 md:px-6 dark:border-zinc-800">
      {(['image', 'video'] as const).map((id) => (
        <button
          key={id}
          role="tab"
          aria-selected={tab === id}
          onClick={() => onTab(id)}
          className={['-mb-px min-h-11 border-b-2 px-3 text-sm font-semibold transition', tab === id ? 'border-ink text-ink dark:border-zinc-100 dark:text-zinc-100' : 'border-transparent text-muted hover:text-ink dark:hover:text-zinc-100'].join(' ')}
        >
          {id === 'image' ? 'Ad image' : 'Video ad'}
        </button>
      ))}
    </div>
  );
}

export function AdInspector({ token, run, index, onIndex, onChanged }: Props) {
  const [tab, setTab] = useState<Tab>('image');
  const ad = run.ads[index];
  const total = run.ads.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onIndex(null);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      if (e.key === 'ArrowRight' && index < total - 1) onIndex(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, total, onIndex]);

  if (!ad) return null;
  const brandName = run.profile?.brandName ?? 'Brand';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => onIndex(null)}>
      <div className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-zinc-950" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-6 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <RoundButton label="Previous ad" onClick={() => onIndex(index - 1)} disabled={index === 0}>←</RoundButton>
            <RoundButton label="Next ad" onClick={() => onIndex(index + 1)} disabled={index === total - 1}>→</RoundButton>
            <span className="ml-1 text-xs font-medium text-muted">{String(index + 1).padStart(2, '0')} / {total}</span>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'image' && isTerminalStatus(run.status) && <RegenerateButton token={token} run={run} ad={ad} onChanged={onChanged} />}
            {tab === 'image' && ad.finalUrl && ad.status === 'ready' && (
              <button onClick={() => void downloadAd(ad, brandName)} className="min-h-10 rounded-full border border-line px-4 text-xs font-semibold transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800">
                Download 4:5
              </button>
            )}
            <RoundButton label="Close ad" onClick={() => onIndex(null)}>✕</RoundButton>
          </div>
        </div>
        <Tabs tab={tab} onTab={setTab} />
        {tab === 'image' ? (
          <div className="flex flex-1 flex-col gap-8 overflow-y-auto bg-zinc-50 p-4 md:flex-row md:p-8 dark:bg-zinc-900/40">
            <div className="w-full shrink-0 md:w-[340px]">
              <FeedPreview ad={ad} brandName={brandName} domain={run.profile?.domain ?? ''} />
            </div>
            <Details ad={ad} source={[...(run.competitors?.ads ?? []), ...(run.competitors?.ownAds ?? [])].find((c) => c.id === ad.inspiredByAdId)} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-zinc-50 p-4 md:p-8 dark:bg-zinc-900/40">
            <VideoAdTab key={ad.id} token={token} run={run} ad={ad} onChanged={onChanged} />
          </div>
        )}
      </div>
    </div>
  );
}
