'use client';

import { useState } from 'react';
import { ARCHETYPE_LABELS, CRITERION_LABELS, type CompetitorResearch, type HormoziResult } from '../../../types/admin/metaAds';
import { OwnAdsPanel } from './OwnAdsPanel';
import { PickCard } from './PickCard';
import { ScoringDetails } from './ScoringDetails';

type Props = { hormozi: HormoziResult | null; competitors: CompetitorResearch | null; loading: boolean; compact: boolean };

function Skeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
    </div>
  );
}

function Playbook({ hormozi, competitors }: { hormozi: HormoziResult; competitors: CompetitorResearch }) {
  const pageOf = (adId: string) => {
    const ad = [...competitors.ads, ...competitors.ownAds].find((a) => a.id === adId);
    return ad?.own ? 'your own winner' : ad?.pageName ?? 'a pick';
  };
  const leverOf = (id: string) => hormozi.levers.find((l) => l.id === id);
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold text-ink dark:text-zinc-100">Playbook for your ads</h4>
      <ol className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {hormozi.plays.map((play) => (
          <li key={play.name} className="rounded-xl border border-line bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950">
            <p className="font-bold text-ink dark:text-zinc-100">{play.name}</p>
            <p className="mt-1 font-mono text-[11px] break-words text-muted">{play.structure}</p>
            <p className="mt-2 text-ink dark:text-zinc-200">“{play.example}”</p>
            <p className="mt-2 text-[10px] text-muted">
              From {pageOf(play.fromAdId)}{play.archetype ? ` · ${ARCHETYPE_LABELS[play.archetype]} image` : ''} · lever: {leverOf(play.leverId)?.claim ?? play.leverId}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Levers({ hormozi }: { hormozi: HormoziResult }) {
  return (
    <details className="rounded-xl border border-line bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="cursor-pointer font-bold text-ink dark:text-zinc-100">Brand levers · {hormozi.levers.length} claims proven by the site</summary>
      <ul className="mt-2 space-y-2">
        {hormozi.levers.map((l) => (
          <li key={l.id}>
            <span className="mr-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-muted dark:bg-zinc-800">{CRITERION_LABELS[l.criterion]}</span>
            <span className="text-ink dark:text-zinc-200">{l.claim}</span>
            <span className="block text-[11px] text-muted">site: “{l.quote}”</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function AllGrades({ hormozi, competitors }: { hormozi: HormoziResult; competitors: CompetitorResearch }) {
  return (
    <details className="rounded-xl border border-line bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="cursor-pointer font-bold text-ink dark:text-zinc-100">All grades · {hormozi.ratings.length} ads</summary>
      <table className="mt-2 w-full text-left">
        <thead className="text-[10px] text-muted uppercase">
          <tr><th className="py-1 font-semibold">Ad</th><th className="font-semibold">Winner</th><th className="font-semibold">Craft</th><th className="font-semibold">Image</th></tr>
        </thead>
        <tbody>
          {hormozi.ratings.map((r) => {
            const ad = [...competitors.ads, ...competitors.ownAds].find((a) => a.id === r.adId);
            return (
              <tr key={r.adId} className="border-t border-line dark:border-zinc-800">
                <td className="max-w-40 truncate py-1.5 pr-2">
                  {ad ? <a href={ad.libraryUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400">{r.own ? 'You' : ad.pageName} ↗</a> : r.adId}
                </td>
                <td className="font-semibold">{r.winnerScore}{r.proven && <span className="ml-1 text-emerald-600">✓</span>}</td>
                <td>{r.craftScore}</td>
                <td className="text-muted">{r.creative ? ARCHETYPE_LABELS[r.creative.archetype] : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </details>
  );
}

/** Step 3 checkpoint: Alex Hormozi picks, the playbook they turn into, and the brand's proven levers. */
export function HormoziPanel({ hormozi, competitors, loading, compact }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (!hormozi && !loading) return null;
  if (hormozi && compact && !expanded) {
    return (
      <button onClick={() => setExpanded(true)} aria-expanded={false} className="group flex w-full items-center gap-4 rounded-xl border border-line bg-white p-4 text-left shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <p className="text-[10px] font-bold tracking-wider text-muted uppercase">Alex Hormozi picks</p>
          <p className="text-sm font-bold text-ink dark:text-zinc-100">{hormozi.picks.length} winners · {hormozi.plays.length} plays</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="ml-auto shrink-0 text-muted transition group-hover:text-ink dark:group-hover:text-zinc-100"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    );
  }
  const byId = new Map([...(competitors?.ads ?? []), ...(competitors?.ownAds ?? [])].map((a) => [a.id, a]));
  const ratingOf = new Map(hormozi?.ratings.map((r) => [r.adId, r]) ?? []);
  return (
    <section className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink dark:text-zinc-100">Alex Hormozi picks</h3>
          <p className="text-[11px] text-muted">Picked by what advertisers keep paying for · explained on his value equation, every point backed by a quote.</p>
        </div>
        {compact && <button onClick={() => setExpanded(false)} className="min-h-10 shrink-0 px-2 text-xs font-medium text-muted hover:text-ink dark:hover:text-zinc-100">Hide ▴</button>}
      </div>
      {!hormozi || !competitors ? (
        <Skeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {hormozi.picks.map((pick, i) => {
              const ad = byId.get(pick.adId);
              const rating = ratingOf.get(pick.adId);
              return ad && rating ? <PickCard key={pick.adId} rank={i + 1} pick={pick} ad={ad} rating={rating} /> : null;
            })}
          </div>
          <Playbook hormozi={hormozi} competitors={competitors} />
          <ScoringDetails hormozi={hormozi} competitors={competitors} />
          <OwnAdsPanel research={competitors} />
          <Levers hormozi={hormozi} />
          <AllGrades hormozi={hormozi} competitors={competitors} />
        </>
      )}
    </section>
  );
}
