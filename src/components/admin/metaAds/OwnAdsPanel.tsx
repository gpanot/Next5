'use client';

import type { CompetitorResearch } from '../../../types/admin/metaAds';

/** The brand's own Meta ads: what it keeps paying for, and what it stopped. */
export function OwnAdsPanel({ research }: { research: CompetitorResearch }) {
  if (!research.ownPageId) {
    return <p className="rounded-xl border border-dashed border-line p-3 text-xs text-muted dark:border-zinc-800">No Facebook page matched this site&apos;s handle, so the brand&apos;s own ads were not read.</p>;
  }
  if (research.ownAds.length === 0) {
    return <p className="rounded-xl border border-dashed border-line p-3 text-xs text-muted dark:border-zinc-800">The brand&apos;s page has no US ads in the Ad Library.</p>;
  }
  return (
    <details className="rounded-xl border border-line bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="cursor-pointer font-bold text-ink dark:text-zinc-100">
        Your own ads · {research.ownAds.filter((a) => a.isActive).length} running, {research.ownAds.filter((a) => !a.isActive).length} stopped
      </summary>
      <ul className="mt-2 space-y-2">
        {research.ownAds.map((ad) => (
          <li key={ad.id} className="flex gap-2">
            <span
              className={[
                'mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                ad.evidence?.proven ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : ad.isActive ? 'bg-zinc-100 text-muted dark:bg-zinc-800' : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300',
              ].join(' ')}
            >
              {ad.evidence?.proven ? 'Winner' : ad.isActive ? 'Testing' : 'Stopped'}
            </span>
            <div className="min-w-0">
              <p className="line-clamp-2 break-words text-ink dark:text-zinc-200">{ad.body}</p>
              <p className="text-[11px] text-muted">
                {ad.format} · score {ad.evidence?.winnerScore ?? '—'} · {ad.evidence?.reasons.join(' · ')} ·{' '}
                <a href={ad.libraryUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400">Ad Library ↗</a>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
