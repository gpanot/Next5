'use client';

import { useState } from 'react';
import type { CopyViralDirector } from '../../../types/admin/copyViral';

const OPTIONS: { id: CopyViralDirector; label: string; title: string }[] = [
  { id: 'claude', label: 'Claude Code', title: 'The /copy-viral-render skill drafts, compares each shot with the original, fixes the edit, then renders (your Claude Code plan, a few minutes)' },
  { id: 'auto', label: 'Fixed rules', title: 'No AI: the edit straight from the reading (fastest)' },
];

/** Who directs the render: Claude Code (matches the original, on Guillaume's plan) or the fixed rules. */
export function DirectorPicker({ value, onChange, small }: { value: CopyViralDirector; onChange: (d: CopyViralDirector) => void; small?: boolean }) {
  return (
    <div className={`inline-flex rounded-xl bg-app-sunken p-1 font-bold ${small ? 'text-[11px]' : 'text-xs'}`}>
      {OPTIONS.map((o) => (
        <button key={o.id} type="button" title={o.title} onClick={() => onChange(o.id)} className={`rounded-lg px-2.5 transition ${small ? 'min-h-7' : 'min-h-8'} ${value === o.id ? 'bg-app-panel text-app-ink shadow-sm' : 'text-app-muted hover:text-app-ink'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** The same director run, by hand: paste in Claude Code opened in next5-landing. */
export function DirectorCommand({ command, label = 'Or in Claude Code:' }: { command: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex max-w-full items-center gap-2 text-[11px] text-app-muted">
      <span className="shrink-0">{label}</span>
      <code className="truncate rounded bg-app-sunken px-1.5 py-0.5 font-mono text-app-ink">{command}</code>
      <button type="button" onClick={copy} className="shrink-0 font-semibold underline hover:text-app-ink">{copied ? 'Copied' : 'Copy'}</button>
    </div>
  );
}
