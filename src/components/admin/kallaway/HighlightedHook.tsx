'use client';

import { HOOK_PARTS, type HookPart, type HookParts } from '../../../lib/kallaway/types';
import { PART_STYLE } from './partStyles';

type Run = { text: string; part: HookPart | null };

/** Splits the hook into runs, one per highlighted part. When parts overlap, the earlier part in the formula wins. */
function toRuns(hook: string, parts: HookParts): Run[] {
  const owner: (HookPart | null)[] = Array.from({ length: hook.length }, () => null);
  const lower = hook.toLowerCase();
  for (const part of HOOK_PARTS) {
    const phrase = parts[part].toLowerCase();
    const at = phrase ? lower.indexOf(phrase) : -1;
    if (at < 0) continue;
    for (let i = at; i < at + phrase.length; i++) owner[i] ??= part;
  }
  const runs: Run[] = [];
  for (let i = 0; i < hook.length; i++) {
    const last = runs[runs.length - 1];
    if (last && last.part === owner[i]) last.text += hook[i];
    else runs.push({ text: hook[i], part: owner[i] });
  }
  return runs;
}

export function HighlightedHook({ hook, parts }: { hook: string; parts: HookParts }) {
  return (
    <p className="text-lg leading-relaxed font-bold text-app-ink">
      {toRuns(hook, parts).map((run, i) =>
        run.part ? <mark key={i} title={PART_STYLE[run.part].label} className={`rounded px-0.5 ${PART_STYLE[run.part].mark}`}>{run.text}</mark> : <span key={i}>{run.text}</span>,
      )}
    </p>
  );
}

/** The 6 parts as a list: present ones with their words, missing ones greyed out. */
export function PartsList({ parts }: { parts: HookParts }) {
  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
      {HOOK_PARTS.map((p) => (
        <div key={p} className={`flex items-start gap-2 ${parts[p] ? '' : 'opacity-40'}`}>
          <i className={`mt-1 h-2 w-2 shrink-0 rounded-full ${PART_STYLE[p].dot}`} />
          <dt className="w-16 shrink-0 font-semibold text-app-ink">{PART_STYLE[p].label}</dt>
          <dd className="text-app-muted">{parts[p] || 'missing'}</dd>
        </div>
      ))}
    </dl>
  );
}
