'use client';

import { Check, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AvatarVoiceOptionDto, BrandCastMemberDto } from '../../../../types/admin/brandCast';
import type { LabClient } from '../../../labs/labClient';
import { Dialog } from '../../../ui/Dialog';
import { useAvatarVoices } from './useAvatarVoices';

type RowProps = { option: AvatarVoiceOptionDto; current: boolean; recommended: boolean; playing: boolean; saving: boolean; disabled: boolean; onPlay: () => void; onPick: () => void };

function VoiceRow({ option, current, recommended, playing, saving, disabled, onPlay, onPick }: RowProps) {
  return (
    <li className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${current ? 'border-app-ink bg-app-sunken' : 'border-app-line bg-app-panel'}`}>
      <button
        type="button"
        onClick={onPlay}
        disabled={!option.sampleUrl}
        aria-label={`${playing ? 'Stop' : 'Play'} ${option.name}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-app-cta text-app-cta-ink shadow-sm transition active:scale-90 disabled:opacity-40"
      >
        {playing ? <Pause aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="ml-0.5 h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <p className="truncate text-sm font-semibold text-app-ink">
            {option.style} <span className="font-normal text-app-muted">· {option.name}</span>
          </p>
          {recommended && <span className="rounded-full bg-app-accent-soft px-2 py-0.5 text-[11px] font-semibold text-app-accent">Recommended</span>}
        </div>
        {option.why && <p className="line-clamp-2 text-xs text-app-muted">{option.why}</p>}
      </div>
      {current ? (
        <span className="inline-flex min-h-11 shrink-0 items-center gap-1 px-2 text-xs font-bold text-app-ink"><Check aria-hidden className="h-4 w-4" /> Current</span>
      ) : (
        <button type="button" onClick={onPick} disabled={disabled} className="min-h-11 shrink-0 rounded-full border border-app-line px-4 text-xs font-semibold text-app-ink transition hover:bg-app-sunken active:scale-95 disabled:opacity-40">
          {saving ? 'Saving…' : 'Use'}
        </button>
      )}
    </li>
  );
}

const INTRO = 'intro';

/** The intro video's own voice (Veo): to hear and compare, not to pick. */
function IntroVoiceRow({ playing, onPlay }: { playing: boolean; onPlay: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-app-line p-2.5">
      <button
        type="button"
        onClick={onPlay}
        aria-label={`${playing ? 'Stop' : 'Play'} the intro video's voice`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-app-line text-app-ink transition hover:bg-app-sunken active:scale-90"
      >
        {playing ? <Pause aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="ml-0.5 h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-app-ink">Intro video voice</p>
        <p className="text-xs text-app-muted">The voice from the video. The closest match is Recommended.</p>
      </div>
    </div>
  );
}

function VoicesSkeleton() {
  return (
    <div aria-busy="true" aria-label="Making voice samples" className="space-y-2">
      <p className="text-xs text-app-muted">Recording a few voices for you. About 15 seconds.</p>
      {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-app-sunken" />)}
    </div>
  );
}

/** One sample plays at a time; returns which one and a toggle. */
function useSamplePlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  const toggle = (name: string, url: string) => {
    audio.current?.pause();
    if (playing === name) return setPlaying(null);
    const next = new Audio(url);
    next.onended = () => setPlaying(null);
    audio.current = next;
    setPlaying(name);
    void next.play().catch(() => setPlaying(null));
  };
  return { playing, toggle };
}

type Props = { client: LabClient; path: string; member: BrandCastMemberDto | null; onClose: () => void; onPicked: () => void };

/** "Change voice" from the ⋮ menu: 6 voices that fit this person, each reading their hello. The pick is kept on the
 *  avatar for later narration; the intro video stays as it is. */
export function VoiceDialog({ client, path, member, onClose, onPicked }: Props) {
  const { data, error, saving, load, pick } = useAvatarVoices(client, path, member?.id ?? null);
  const { playing, toggle } = useSamplePlayer();
  const choose = async (voice: string) => {
    if (await pick(voice)) onPicked();
  };
  return (
    <Dialog open={member !== null} onClose={onClose} title="Change voice" description={`Tap play to hear ${member?.name.split(',')[0] ?? 'them'}. Your intro video stays the same.`}>
      <div className="space-y-3">
        {error && (
          <div role="alert" className="flex items-center gap-3 rounded-xl bg-app-sunken p-3">
            <p className="flex-1 text-sm text-app-danger">{error}</p>
            {!data && <button type="button" onClick={load} className="min-h-11 shrink-0 rounded-full bg-app-cta px-4 text-sm font-semibold text-app-cta-ink transition active:scale-95">Try again</button>}
          </div>
        )}
        {!data && !error && <VoicesSkeleton />}
        {data && data.options.length === 0 && <p className="text-sm text-app-muted">No voices yet. Try again in a moment.</p>}
        {data?.introSampleUrl && <IntroVoiceRow playing={playing === INTRO} onPlay={() => data.introSampleUrl && toggle(INTRO, data.introSampleUrl)} />}
        {data && data.options.length > 0 && (
          <ul className="space-y-2">
            {data.options.map((o) => (
              <VoiceRow
                key={o.name}
                option={o}
                current={o.name === data.voice}
                recommended={o.name === data.recommended}
                playing={playing === o.name}
                saving={saving === o.name}
                disabled={saving !== null}
                onPlay={() => o.sampleUrl && toggle(o.name, o.sampleUrl)}
                onPick={() => void choose(o.name)}
              />
            ))}
          </ul>
        )}
        <button type="button" onClick={onClose} className="min-h-11 w-full rounded-full border border-app-line text-sm font-semibold text-app-ink transition hover:bg-app-sunken active:scale-95">
          Done
        </button>
      </div>
    </Dialog>
  );
}
