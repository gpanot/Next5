'use client';

import type { ReactNode } from 'react';

/** The three kinds of slide every editor tabs between. */
export type EditorRole = 'hook' | 'content' | 'cta';

const ROLES: { id: EditorRole; label: string }[] = [
  { id: 'hook', label: 'Hook' },
  { id: 'content', label: 'Content' },
  { id: 'cta', label: 'CTA' },
];

const tabClass = (on: boolean) =>
  `min-h-10 rounded-lg px-4 text-sm font-semibold transition active:scale-95 disabled:opacity-30 ${on ? 'bg-emerald-400 text-zinc-950' : 'text-white/60 hover:text-white'}`;

type Props = {
  active: EditorRole;
  onPick: (role: EditorRole) => void;
  /** Roles with no slide (a slideshow without a CTA): shown, but off. */
  missing?: EditorRole[];
  /** After the tabs: where the editor is ("Slide 3"). */
  after?: ReactNode;
  /** At the end of the row: the text style menu, the slide tools. */
  end?: ReactNode;
};

/** The slide panel's top row: Hook · Content · CTA, then whatever the editor puts after the tabs and at the end. */
export function RoleTabBar({ active, onPick, missing = [], after, end }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
      <div role="tablist" aria-label="Slide kind" className="flex rounded-xl bg-white/5 p-1">
        {ROLES.map((r) => (
          <button key={r.id} type="button" role="tab" aria-selected={active === r.id} disabled={missing.includes(r.id)} onClick={() => onPick(r.id)} className={tabClass(active === r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      {after}
      {end && <div className="ml-auto flex items-center gap-2">{end}</div>}
    </div>
  );
}
