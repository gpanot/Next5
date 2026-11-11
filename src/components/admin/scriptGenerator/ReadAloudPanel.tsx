'use client';

import type { GeneratedScript } from '../../../types/admin/scriptGenerator';
import { primaryBtn, softCard } from './ui';
import type { useReadAloud } from './useReadAloud';

/** The spoken lines of the script, in order, as one text. */
export const spokenText = (script: GeneratedScript): string => script.beats.map((b) => b.spoken).filter(Boolean).join('\n\n');

/**
 * Read-aloud tab: the spoken text, and a button that reads it with a man's voice (about $0.01 a script).
 * The recording lives in the parent (`voice`), so leaving this tab and coming back keeps it.
 */
export function ReadAloudPanel({ script, voice }: { script: GeneratedScript; voice: ReturnType<typeof useReadAloud> }) {
  const text = spokenText(script);
  const { audio, busy, error, listen, markHeard } = voice;
  if (!text) return <div className={`${softCard} text-base text-app-ink`}>Nothing is spoken in this format. Use the beat view.</div>;
  return (
    <div className="space-y-3">
      <div className={`${softCard} flex flex-wrap items-center gap-3`}>
        <button type="button" onClick={() => void listen()} disabled={busy} className={primaryBtn}>
          {busy ? 'Recording…' : audio ? 'Record again' : 'Listen with a man’s voice'}
        </button>
        <p className="text-xs text-app-muted">
          Gemini TTS, voice “Achird”. About $0.01 a script.
          {audio && ` Last one: ${audio.durationS.toFixed(0)}s, $${audio.costUsd.toFixed(3)}.`}
        </p>
        {error && <p role="alert" className="w-full text-sm text-app-danger">{error}</p>}
        {audio && <audio key={audio.url} src={audio.url} controls autoPlay={!audio.heard} onPlay={markHeard} className="w-full" />}
      </div>
      <div className={`${softCard} text-base leading-relaxed whitespace-pre-wrap text-app-ink`}>{text}</div>
    </div>
  );
}
