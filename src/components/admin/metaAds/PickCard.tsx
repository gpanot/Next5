'use client';

import { ARCHETYPE_LABELS, CRITERION_LABELS, HORMOZI_CRITERIA, type AdRating, type CompetitorAd, type HormoziPick } from '../../../types/admin/metaAds';

type Props = { rank: number; pick: HormoziPick; ad: CompetitorAd; rating: AdRating };

function Dots({ score }: { score: number }) {
  return (
    <span className="mt-1 flex gap-0.5" aria-label={`${score} of 3`}>
      {[1, 2, 3].map((n) => <span key={n} className={['h-1.5 w-3 rounded-full', n <= score ? 'bg-blue-500' : 'bg-zinc-200 dark:bg-zinc-700'].join(' ')} />)}
    </span>
  );
}

function ScoreRow({ label, score, detail, unstable }: { label: string; score: number; detail: string | null; unstable?: boolean }) {
  return (
    <li className="grid grid-cols-[84px_44px_minmax(0,1fr)] items-start gap-2 text-[11px] leading-snug">
      <span className="text-muted">{label}</span>
      <Dots score={score} />
      <span className="break-words text-ink dark:text-zinc-200">
        {detail ?? <span className="text-zinc-300 dark:text-zinc-600">—</span>}
        {unstable && <span className="ml-1 text-amber-600">(unstable)</span>}
      </span>
    </li>
  );
}

function Note({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div>
      <p className="text-[10px] font-bold tracking-wider text-muted uppercase">{label}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-ink dark:text-zinc-200">{text}</p>
    </div>
  );
}

function Badges({ rank, pick }: { rank: number; pick: HormoziPick }) {
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
      <span className="text-blue-600 dark:text-blue-400">{pick.own ? 'Your winner' : `Pick #${rank}`}</span>
      {pick.proven ? (
        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Proven</span>
      ) : (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Best available · unproven</span>
      )}
    </p>
  );
}

/** Image read: format, printed words and the two judged scores. */
function ImageRead({ rating }: { rating: AdRating }) {
  const c = rating.creative;
  if (!c) return <p className="text-[11px] text-muted">Image not read (video or carousel: image ads only for now).</p>;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-ink dark:text-zinc-200">
        <span className="mr-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-muted dark:bg-zinc-800">{ARCHETYPE_LABELS[c.archetype]}</span>
        {c.subject}
      </p>
      {c.onImageText && <p className="text-[11px] break-words text-muted">Printed: “{c.onImageText}”</p>}
      <ul className="space-y-1.5">
        <ScoreRow label="Thumb-stop" score={c.thumbStop.score} detail={c.thumbStop.because || null} unstable={c.unstable} />
        <ScoreRow label="Clarity" score={c.clarity.score} detail={c.clarity.because || null} />
      </ul>
    </div>
  );
}

/** One pick: the ad, why the market says it wins, the verified copy grade, the image read, and Hormozi's take. */
export function PickCard({ rank, pick, ad, rating }: Props) {
  return (
    <article className="min-w-0 rounded-xl border border-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex gap-3">
        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          {ad.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.imageUrl} alt={ad.pageName} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Badges rank={rank} pick={pick} />
          <p className="truncate text-sm font-bold text-ink dark:text-zinc-100">{ad.pageName}</p>
          <a href={ad.libraryUrl} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Ad Library ↗</a>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold tracking-tight text-ink dark:text-zinc-100">{rating.winnerScore}</p>
          <p className="text-[10px] leading-tight text-muted">winner<br />craft {rating.craftScore}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-0.5 rounded-lg bg-emerald-50 p-2 text-[11px] text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        {(ad.evidence?.reasons ?? [`Live ${ad.daysRunning} days`]).map((r) => <li key={r}>· {r}</li>)}
      </ul>
      <p className="mt-3 line-clamp-3 text-xs break-words text-muted">{ad.title ? `${ad.title} — ` : ''}{ad.body}</p>
      <div className="mt-3 border-t border-line pt-3 dark:border-zinc-800">
        <ImageRead rating={rating} />
      </div>
      <ul className="mt-3 space-y-1.5 border-t border-line pt-3 dark:border-zinc-800">
        {HORMOZI_CRITERIA.map((c) => (
          <ScoreRow key={c} label={CRITERION_LABELS[c]} score={rating.scores[c].score} detail={rating.scores[c].quote ? `“${rating.scores[c].quote}”` : null} unstable={rating.unstable.includes(c)} />
        ))}
      </ul>
      {rating.rejectedQuotes > 0 && <p className="mt-2 text-[10px] text-amber-600">{rating.rejectedQuotes} score(s) zeroed: quote not found in the ad.</p>}
      <div className="mt-3 space-y-2 border-t border-line pt-3 dark:border-zinc-800">
        <Note label="Why it works" text={pick.why} />
        <Note label="Steal this" text={pick.stealThis} />
        <Note label="Hormozi's fix" text={pick.fix} />
      </div>
    </article>
  );
}
