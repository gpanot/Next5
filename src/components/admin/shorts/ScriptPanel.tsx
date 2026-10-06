'use client';

import type { ClaimVerdict, ShortDetailDto, ShortScriptAttempt } from '../../../types/admin/shorts';
import { Disclosure, Section } from './Section';

const VERDICT: Record<ClaimVerdict, { label: string; className: string }> = {
  source: { label: 'In brand source', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  web: { label: 'Verified on web', className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  unsupported: { label: 'Unsupported', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
};

function Attempt({ attempt, index, used }: { attempt: ShortScriptAttempt; index: number; used: boolean }) {
  const bad = attempt.claims.filter((c) => c.verdict === 'unsupported').length;
  return (
    <div className={`space-y-3 rounded-lg border p-3 ${used ? 'border-app-ink' : 'border-app-line opacity-80'}`}>
      <p className="text-xs font-bold text-app-muted">
        Draft {index + 1} {used ? '· used' : '· rejected by fact check'} · {attempt.claims.length} claims{bad ? `, ${bad} unsupported` : ''}
      </p>
      <p className="text-sm leading-relaxed text-app-ink">{attempt.script.narration}</p>
      {attempt.claims.length > 0 && (
        <ul className="space-y-1.5">
          {attempt.claims.map((c, i) => (
            <li key={i} className="space-y-0.5 text-xs">
              <p className="flex flex-wrap items-start gap-2">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${VERDICT[c.verdict].className}`}>{VERDICT[c.verdict].label}</span>
                <span className="text-app-ink">{c.claim}</span>
              </p>
              {c.evidence && <p className="pl-1 text-[11px] break-words text-app-muted">↳ {c.evidence}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** What the script was built from, every draft, and the fact check of each. */
export function ScriptPanel({ short }: { short: ShortDetailDto }) {
  const { inputs, attempts } = short;
  return (
    <Section title="Script & fact check" aside={inputs ? `${inputs.brandName} · hook ${inputs.hookId}` : undefined}>
      {inputs && (
        <div className="space-y-2">
          <p className="text-sm text-app-ink"><span className="font-bold">Bank hook:</span> {inputs.hookText}</p>
          <p className="text-xs text-app-muted">Topic: {inputs.meatTopic} · Tone: {inputs.tone}</p>
          <Disclosure label="Brand source (the only facts the script may use)" text={inputs.sourceText} />
        </div>
      )}
      {attempts.length === 0 ? (
        <div className="h-24 animate-pulse rounded-lg bg-app-sunken" />
      ) : (
        <div className="space-y-2">
          {attempts.map((a, i) => <Attempt key={i} attempt={a} index={i} used={i === attempts.length - 1} />)}
        </div>
      )}
    </Section>
  );
}
