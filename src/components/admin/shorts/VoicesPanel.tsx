'use client';

import { useState } from 'react';
import type { ShortDetailDto, ShortVoiceOptionDto, VoicePicker } from '../../../types/admin/shorts';
import { Section } from './Section';
import { isRunning, swapVoice } from './useShorts';

const PICKED_BY: Record<VoicePicker, string> = { jev: 'Picked by Jev', planner: 'Planner pick (Jev unavailable)', you: 'Picked by you' };

type CardProps = { option: ShortVoiceOptionDto; current: boolean; canSwap: boolean; busy: boolean; onUse: () => void };

function VoiceCard({ option, current, canSwap, busy, onUse }: CardProps) {
  return (
    <li className={`space-y-2 rounded-xl border p-3 transition ${current ? 'border-app-ink bg-app-sunken' : 'border-app-line bg-app-panel'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-extrabold text-app-ink">
          {option.name} <span className="font-semibold text-app-muted">· {option.style}</span>
        </p>
        {typeof option.jevScore === 'number' && <span className="text-[11px] font-semibold text-app-muted" title="Jev fit score">Jev {Math.round(option.jevScore * 100)}</span>}
      </div>
      {option.why && <p className="text-xs leading-snug text-app-muted">{option.why}</p>}
      {option.sampleUrl ? (
        <audio src={option.sampleUrl} controls preload="none" className="h-9 w-full" />
      ) : (
        <p className="text-xs text-app-muted">No sample.</p>
      )}
      {current ? (
        <p className="text-xs font-bold text-app-ink">✓ Narrating this short</p>
      ) : (
        <button type="button" onClick={onUse} disabled={!canSwap || busy} className="min-h-11 w-full rounded-lg border border-app-line px-3 text-sm font-bold text-app-ink transition hover:bg-app-sunken active:scale-95 disabled:opacity-40">
          Use this voice
        </button>
      )}
    </li>
  );
}

/** The 6 voice options cast for this short, each reading the hook. Choosing one re-narrates and re-renders (no new clips). */
export function VoicesPanel({ short, token, onSwap }: { short: ShortDetailDto; token: string; onSwap: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audio = short.audio;
  if (!audio?.options.length) return null;
  const canSwap = Boolean(short.videoUrl) && !isRunning(short.status);
  const use = async (voice: string) => {
    setBusy(voice);
    setError(null);
    try {
      await swapVoice(token, short.id, voice);
      onSwap();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not swap the voice');
    } finally {
      setBusy(null);
    }
  };
  const groups = [
    { label: 'Female', items: audio.options.filter((o) => o.gender === 'female') },
    { label: 'Male', items: audio.options.filter((o) => o.gender === 'male') },
  ];
  return (
    <Section title="Voices" aside={audio.pickedBy ? PICKED_BY[audio.pickedBy] : undefined}>
      {audio.direction && <p className="rounded-lg bg-app-sunken px-3 py-2 text-xs leading-relaxed text-app-ink"><b>Delivery:</b> {audio.direction}</p>}
      <p className="text-xs text-app-muted">Each sample reads the hook. Using another voice re-records the narration and re-renders on the same photos and clips (about 1 minute, under $0.01).</p>
      {groups.map((g) => (
        <div key={g.label} className="space-y-2">
          <h3 className="text-[11px] font-bold tracking-wide text-app-muted uppercase">{g.label}</h3>
          <ul className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {g.items.map((o) => (
              <VoiceCard key={o.name} option={o} current={o.name === audio.voice} canSwap={canSwap} busy={busy !== null} onUse={() => void use(o.name)} />
            ))}
          </ul>
        </div>
      ))}
      {busy && <p role="status" className="text-xs text-app-muted">Starting with {busy}…</p>}
      {error && <p className="text-xs text-app-danger">{error}</p>}
    </Section>
  );
}
