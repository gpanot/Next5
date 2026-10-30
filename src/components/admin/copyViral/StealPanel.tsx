'use client';

import { useState } from 'react';
import { copyViralMediaUrl, type CopyViralProject } from '../../../types/admin/copyViral';
import { applySetup, deleteSetup, saveSetup, stealStyle, useCopyViralSetups } from './useCopyViral';

const link = 'text-xs font-semibold text-app-muted underline transition hover:text-app-ink';
const btn = 'min-h-8 rounded-lg border border-app-line px-3 text-xs font-semibold text-app-ink transition hover:bg-app-sunken disabled:opacity-40';

type Props = { token: string; project: CopyViralProject; busy: boolean; onChange: () => void };

/** Status line under the buttons: what runs, or what to do next. */
const hint = (project: CopyViralProject, hasLines: boolean) => {
  const steal = project.steal;
  if (steal?.status === 'RUNNING') {
    return steal.mode === 'boards'
      ? 'Writing the board animations of this reel on the saved look: a few minutes on your Claude Code plan.'
      : 'Contact sheets, cut rhythm, spectrogram, face size and the boards shot by shot: 10 to 15 min on your Claude Code plan.';
  }
  if (!hasLines) return 'Read the shots and write my lines first: the board animations are written for my lines.';
  if (steal?.status === 'DONE' && steal.boards === 0) return 'Look ready, no board animations yet: "Write the boards" adds this reel’s (a few minutes), or render now with plain texts.';
  if (steal?.status === 'DONE') return 'Preview and "Make my edit" (auto) render with this setup. Write the boards again after rewriting my lines.';
  return 'Steal the style once (theme, captions, cuts, camera card, board animations with my words), or reuse a setup saved from another reel of the same creator.';
};

/**
 * Step one of the edit: the look and board animations, measured by Claude Code (/copy-viral-steal) or taken from a
 * saved setup. Every preview and edit after renders with it.
 */
export function StealPanel({ token, project, busy, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const setups = useCopyViralSetups(token);
  const steal = project.steal;
  const running = steal?.status === 'RUNNING';
  const done = steal?.status === 'DONE';
  const v = steal?.finishedAt ?? steal?.startedAt;
  const hasLines = project.shots.some((s) => s.myLine.trim());
  const locked = busy || running || !hasLines;

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      onChange();
      setups.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const measure = () => (!done || confirm('Measure the look again? The current setup of this reel is replaced.')) && run(() => stealStyle(token, project.id));
  const use = (slug: string) => slug && (!done || confirm('Use this saved setup? The current setup of this reel is replaced.')) && run(() => applySetup(token, project.id, slug));
  const save = () => {
    const name = prompt('Name this setup (e.g. the creator’s handle):', steal?.setup ?? project.title);
    if (name?.trim()) void run(() => saveSetup(token, project.id, name));
  };
  const remove = (slug: string, name: string) => confirm(`Delete the saved setup "${name}"?`) && run(() => deleteSetup(token, slug));

  return (
    <div className="space-y-2 rounded-xl border border-app-line bg-app-panel p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold text-app-ink">Set up the edit</p>
        <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${done ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-app-sunken text-app-muted'}`}>
          {running ? 'Claude Code is working…' : done ? `Ready${steal.setup ? ` · ${steal.setup}` : ''}${steal.boards ? ` · boards on ${steal.boards} shots` : ' · no boards'}` : 'Not set up: the edit uses Gemini’s words'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={measure} disabled={locked} className="min-h-8 rounded-lg bg-app-cta px-3 text-xs font-bold text-app-cta-ink shadow-sm transition hover:opacity-90 disabled:opacity-40">
          {done && steal.mode !== 'boards' && !steal.setup ? 'Steal again' : 'Steal the style'}
        </button>
        <select value="" disabled={locked || !setups.setups?.length} onChange={(e) => use(e.target.value)} className={`${btn} bg-app-panel`}>
          <option value="">{setups.setups?.length ? 'Use a saved setup…' : 'No saved setup yet'}</option>
          {setups.setups?.map((s) => <option key={s.slug} value={s.slug}>{s.name} · from {s.fromTitle}</option>)}
        </select>
        {done && <button type="button" onClick={() => run(() => stealStyle(token, project.id, true))} disabled={locked} className={btn}>Write the boards</button>}
        {done && <button type="button" onClick={save} disabled={busy || running} className={btn}>Save as setup</button>}
      </div>
      <p className="text-xs text-app-muted">{hint(project, hasLines)}</p>
      {running && <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-app-sunken"><div className="h-full w-1/3 animate-pulse rounded-full bg-app-ink" /></div>}
      {done && steal.summary && <p className="text-sm whitespace-pre-line text-app-ink">{steal.summary}</p>}
      {(error || steal?.error) && <p className="text-xs break-words text-app-danger">{error ?? steal?.error}</p>}
      {steal && (
        <div className="flex flex-wrap gap-3">
          {done && <a href={copyViralMediaUrl(token, project.id, 'stolen/STYLE.md', v)} target="_blank" rel="noreferrer" className={link}>STYLE.md</a>}
          {done && <a href={copyViralMediaUrl(token, project.id, 'stolen/style.json', v)} target="_blank" rel="noreferrer" className={link}>style.json</a>}
          {done && <a href={copyViralMediaUrl(token, project.id, 'stolen/scenes.json', v)} target="_blank" rel="noreferrer" className={link}>scenes.json</a>}
          <a href={copyViralMediaUrl(token, project.id, 'claude-steal.log', v ?? undefined)} target="_blank" rel="noreferrer" className={link}>Claude Code log</a>
        </div>
      )}
      {!!setups.setups?.length && (
        <details className="text-xs text-app-muted">
          <summary className="cursor-pointer select-none">Saved setups ({setups.setups.length})</summary>
          <ul className="mt-1.5 space-y-1">
            {setups.setups.map((s) => (
              <li key={s.slug} className="flex items-center gap-2">
                <span className="text-app-ink">{s.name}</span> · from {s.fromTitle}
                <button type="button" onClick={() => remove(s.slug, s.name)} className="ml-auto font-semibold text-app-danger hover:underline">Delete</button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
