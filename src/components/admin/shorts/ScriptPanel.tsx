'use client';

import type { ClaimVerdict, ShortDetailDto, ShortScriptAttempt, ShortScriptJev } from '../../../types/admin/shorts';
import { Disclosure, Section } from './Section';

const VERDICT: Record<ClaimVerdict, { label: string; className: string }> = {
  source: { label: 'In brand source', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  web: { label: 'Verified on web', className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  unsupported: { label: 'Unsupported', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
};

const JEV_LABELS: [keyof ShortScriptJev, string][] = [['overall', 'Overall'], ['hook', 'Hook'], ['lesson', 'Lesson']];

/** Jev's 0..1 ratings shown as /100, colored by band. */
function JevScores({ jev }: { jev: ShortScriptJev }) {
  const tone = (v: number) =>
    v >= 0.8
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
      : v >= 0.65
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
  return (
    <div className="flex flex-wrap items-center gap-1.5" title="Jev's rating of this draft as a YouTube Short script (not a gate)">
      <span className="text-[10px] font-bold uppercase text-app-muted">Jev</span>
      {JEV_LABELS.map(([key, label]) => {
        const v = jev[key];
        return (
          <span key={key} className={`rounded px-1.5 py-0.5 text-[11px] font-bold transition-colors ${typeof v === 'number' ? tone(v) : 'bg-app-sunken text-app-muted'}`}>
            {label} {typeof v === 'number' ? Math.round(v * 100) : '—'}
          </span>
        );
      })}
    </div>
  );
}

function Attempt({ attempt, index, used }: { attempt: ShortScriptAttempt; index: number; used: boolean }) {
  const bad = attempt.claims.filter((c) => c.verdict === 'unsupported').length;
  return (
    <div className={`space-y-3 rounded-lg border p-3 ${used ? 'border-app-ink' : 'border-app-line opacity-80'}`}>
      <p className="text-xs font-bold text-app-muted">
        Draft {index + 1} {used ? '· used' : '· rejected by fact check'} · {attempt.claims.length} claims{bad ? `, ${bad} unsupported` : ''}
      </p>
      {attempt.jev && <JevScores jev={attempt.jev} />}
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
