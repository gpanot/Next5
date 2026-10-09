'use client';

import type { BlitzLearningDto, LearnedScoreDto } from '../../../types/admin/workspaceDetail';

const tone = (score: number) =>
  score > 0.2 ? 'text-emerald-700 dark:text-emerald-400' : score < -0.2 ? 'text-red-700 dark:text-red-400' : 'text-muted';

function ScoreList({ title, items }: { title: string; items: LearnedScoreDto[] }) {
  return (
    <div>
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</span>
      {items.length === 0 ? <p className="mt-1 text-sm text-muted">Nothing yet.</p> : (
        <ul className="mt-1 space-y-0.5 text-sm">
          {items.map((i) => (
            <li key={i.label} className="flex justify-between gap-3">
              <span className="text-ink dark:text-zinc-200">{i.label}</span>
              <span className={`tabular-nums ${tone(i.score)}`}>{i.score > 0 ? '+' : ''}{i.score.toFixed(2)} · {i.cards}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** What the workspace's Blitz cards taught the bank: swipes, views, scores per format and hook type, winners. */
export function LearningPanel({ learning }: { learning: BlitzLearningDto }) {
  const l = learning;
  return (
    <section className="space-y-3 rounded-xl border border-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h3 className="text-base font-bold text-ink dark:text-zinc-100">What it learned</h3>
        <p className="text-xs text-muted">
          {l.kept} kept · {l.skipped} skipped · {l.posted} posted with views{l.medianViews !== null && <> · median {Math.round(l.medianViews).toLocaleString()} views</>}
        </p>
        <p className="text-xs text-muted">Kept +1, skipped −1, views vs. median up to ±3. Better formats get more new stories; better hook types lead.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <ScoreList title="Story formats" items={l.formats} />
        <ScoreList title="Hook types" items={l.hooks} />
        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Winners (follow-ups written)</span>
          {l.winners.length === 0 ? <p className="mt-1 text-sm text-muted">None yet (needs 3+ posted videos).</p> : (
            <ul className="mt-1 space-y-0.5 text-sm">
              {l.winners.map((w) => <li key={w.story} className="text-ink dark:text-zinc-200">{w.story} · {w.views.toLocaleString()} views · {w.ratio}× median</li>)}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
