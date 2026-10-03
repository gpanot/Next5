'use client';

import type { BankHook, BankMeat } from '../../../../types/admin/slideshowBank';
import { GOAL_LABELS } from '../../../../types/admin/contentGoals';
import { goalStyle } from '../calendar/goalStyle';
import type { HookFilter, OpenUse, UseIndex } from './matrixUse';
import { UsedChips } from './UsedChips';

type Props = { meat: BankMeat; hooks: BankHook[]; uses: UseIndex; filter: HookFilter; runId: string; onOpen: OpenUse };

function HookRow({ hook, uses, runId, onOpen }: { hook: BankHook; uses: UseIndex; runId: string; onOpen: OpenUse }) {
  const used = uses.hooks.get(hook.id) ?? [];
  return (
    <li className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4 ${used.length ? '' : 'opacity-80'}`}>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink dark:text-zinc-100">{hook.text}</span>
        <span className="mt-0.5 block text-xs text-muted">
          {hook.category} · score {hook.score}/15
        </span>
      </span>
      <span className="sm:w-56 sm:shrink-0 sm:text-right">
        <UsedChips uses={used} runId={runId} onOpen={onOpen} />
      </span>
    </li>
  );
}

/** One meat: its goal, topic, promise and slides, then its hooks with the slideshows that used each. */
export function MeatCard({ meat, hooks, uses, filter, runId, onOpen }: Props) {
  const style = goalStyle(meat.goal);
  const usedCount = uses.meats.get(meat.id)?.length ?? 0;
  const shown = hooks.filter((h) => filter === 'all' || (filter === 'used') === (uses.hooks.get(h.id)?.length ?? 0) > 0);
  const usedHooks = hooks.filter((h) => uses.hooks.has(h.id)).length;
  return (
    <article className={`rounded-xl border border-l-4 border-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${style.border}`}>
      <header className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.pill}`}>{GOAL_LABELS[meat.goal]}</span>
        <span className="text-xs text-muted tabular-nums">
          {usedHooks}/{hooks.length} hooks used · {usedCount} slideshow{usedCount === 1 ? '' : 's'}
        </span>
      </header>
      <h3 className="mt-2 text-base font-bold text-ink dark:text-zinc-100">{meat.topic}</h3>
      <p className="mt-1 text-sm text-muted">{meat.promise}</p>
      <details className="group mt-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold text-ink dark:text-zinc-100">
          {meat.items.length} middle slides{meat.listicle ? ' · list' : ''}
          <span aria-hidden className="text-muted transition group-open:rotate-90">›</span>
        </summary>
        <ol className="space-y-2 px-3 pb-3">
          {meat.items.map((it, i) => (
            <li key={i} className="text-sm">
              <span className="font-semibold text-ink dark:text-zinc-100">{i + 1}. {it.title}</span>
              {it.body && <span className="block text-muted">{it.body}</span>}
            </li>
          ))}
          <li className="border-t border-line pt-2 text-xs text-muted dark:border-zinc-700">
            Caption: {meat.caption} {meat.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}
          </li>
        </ol>
      </details>
      {shown.length > 0 ? (
        <ul className="mt-2 divide-y divide-line dark:divide-zinc-800">
          {shown.map((h) => <HookRow key={h.id} hook={h} uses={uses} runId={runId} onOpen={onOpen} />)}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">No {filter} hooks here.</p>
      )}
    </article>
  );
}
