'use client';

import type { ShortDetailDto } from '../../../types/admin/shorts';
import { Section } from './Section';

/** Inline delivery tags ([confident]…) left in scripts written before 2026-10-08: never spoken. */
const plain = (text: string) => text.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();

/** Above this speed-up the voice starts to sound rushed (the cap is 1.25×). */
const RUSHED_TEMPO = 1.15;

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-app-muted">{label}</dt>
      <dd className={`text-sm font-semibold ${warn ? 'text-amber-700 dark:text-amber-300' : 'text-app-ink'}`}>{value}</dd>
    </div>
  );
}

/** The full text the voice reads (the draft that was used), with the pace numbers to judge whether it was rushed. */
export function NarrationPanel({ short }: { short: ShortDetailDto }) {
  const script = short.attempts[short.attempts.length - 1]?.script;
  if (!script) {
    return (
      <Section title="Narration">
        <div className="h-20 animate-pulse rounded-lg bg-app-sunken" />
      </Section>
    );
  }
  const text = plain(script.narration);
  const words = text.split(' ').filter(Boolean).length;
  const audio = short.audio;
  const wpm = audio?.durationS ? Math.round((words / audio.durationS) * 60) : null;
  const tempo = audio?.tempo;
  return (
    <Section title="Narration" aside={script.structure ? script.structure.replace(/_/g, ' ') : undefined}>
      <p className="text-base leading-relaxed text-app-ink">{text}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-app-line pt-3 sm:grid-cols-4">
        <Stat label="Words" value={String(words)} />
        <Stat label="Voice length" value={audio ? `${audio.durationS.toFixed(1)} s` : '—'} />
        <Stat label="Pace (with breaths)" value={wpm ? `${wpm} wpm` : '—'} />
        <Stat
          label="Speed-up"
          value={tempo ? `${tempo.toFixed(2)}×${audio?.rawWpm ? ` (read at ${Math.round(audio.rawWpm)} wpm)` : ''}` : '—'}
          warn={Boolean(tempo && tempo > RUSHED_TEMPO)}
        />
      </dl>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-app-muted">
        <span><span className="font-bold">On screen, first scene:</span> {script.hook}</span>
        <span><span className="font-bold">On screen, last scene:</span> {script.cta || 'no call to action'}</span>
      </div>
    </Section>
  );
}
