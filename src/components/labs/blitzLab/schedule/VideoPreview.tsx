'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BLITZ_DEFAULT_TEXT_CONFIG } from '../../../../config/blitzLab';
import type { TextConfig } from '../../../../remotion/types';
import type { BlitzEditDto } from '../../../../types/admin/blitzSchedule';
import { useLabClient } from '../../LabClientProvider';
import { SwipeCard, type ShotView } from '../SwipeCard';
import type { CardNarration } from '../useNarrationAudio';
import { useDeckSound } from '../useDeckSound';
import { mergeTextConfig } from '../useTextLayout';
import { scheduleApi } from './scheduleApi';

/** The saved deck shots (zones, labels), if the video came from a deck card. */
const setShots = (set: unknown): ShotView[] => {
  const shots = (set as { shots?: ShotView[] } | undefined)?.shots;
  return Array.isArray(shots) ? shots : [];
};

/** The video as it will be made: each saved slide's text over its current photo or clip. */
export const previewShots = (edit: BlitzEditDto): ShotView[] => {
  const deck = setShots(edit.assets.set);
  return edit.assets.slides.map((slide, i) => {
    const media = edit.media[i];
    // The caption sits at the slide's saved position, as in the editor and the render.
    const shotEdit = { ...(deck[i]?.edit ?? { source: 'library' as const, durationSec: slide.durationSec ?? 0, alternatives: [] }), positionY: slide.positionY };
    return { ...deck[i], edit: shotEdit, textZone: deck[i]?.textZone ?? 'bottom', text: slide.text, mediaUrl: media?.url ?? deck[i]?.mediaUrl, mediaKind: media ? (media.video ? 'video' : 'image') : deck[i]?.mediaKind };
  });
};

/** The video's caption style as it will render (and as the editor opens it): the template's, plus the saved changes. */
export const previewCaption = (edit: BlitzEditDto): TextConfig =>
  mergeTextConfig(BLITZ_DEFAULT_TEXT_CONFIG, (edit.assets.textConfigOverride ?? {}) as Partial<TextConfig>);

/** The video's music, hidden, at half volume: plays while sound is on (the same on/off as the deck). */
function PreviewMusic({ url, playing }: { url: string; playing: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    if (playing) audio.play().catch(() => undefined); // autoplay may be blocked until a tap
    else audio.pause();
  }, [playing, url]);
  return <audio ref={ref} src={url} loop preload="auto" onLoadedMetadata={(e) => { e.currentTarget.volume = 0.5; }} className="hidden" />;
}

/** One small round button beside the card: sound on / off. */
function SoundButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} aria-label={on ? 'Mute sound' : 'Turn sound on'} className="absolute bottom-0 left-full ml-1.5 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line,#e8e5e1)] bg-white text-[var(--ink,#000)] shadow-sm transition hover:bg-neutral-50 active:scale-90 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
      {on ? <Volume2 aria-hidden className="h-4 w-4" /> : <VolumeX aria-hidden className="h-4 w-4" />}
    </button>
  );
}

/** A narrated video's voiceover, as the render will use it (recorded once per text and voice, then replayed from the
 *  cache); null when it cannot be had (the free daily limit, a busy voice): the preview then plays silent. */
const loadNarration = async (client: ReturnType<typeof useLabClient>, edit: BlitzEditDto): Promise<CardNarration | null> => {
  if (!edit.voice) return null;
  const texts = edit.assets.slides.map((s) => s.text).filter((t) => t.trim());
  const res = await client.request<{ url: string; durations: number[] }>('/blitz/voice-preview', { json: { texts, voice: edit.voice } }).catch(() => null);
  return res?.ok ? { url: res.data.url, durations: res.data.durations } : null;
};

/** A planned video, played like a deck card with its voiceover (or, on older videos, its music). It is only rendered
 *  about an hour before its time. */
export function VideoPreview({ id, title }: { id: string; title: string }) {
  const client = useLabClient();
  const { soundOn, toggleSound } = useDeckSound();
  const [shots, setShots] = useState<ShotView[] | null>(null);
  const [caption, setCaption] = useState<TextConfig | undefined>(undefined);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [narration, setNarration] = useState<CardNarration | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void scheduleApi.get(client, id).catch(() => null).then((res) => {
      if (cancelled) return;
      if (!res?.ok) return setFailed(true);
      setShots(previewShots(res.data));
      setCaption(previewCaption(res.data));
      // A narrated video plays its voice, never the music it may still carry.
      if (!res.data.voice) setAudioUrl(res.data.audioUrl);
      else void loadNarration(client, res.data).then((n) => !cancelled && setNarration(n));
    });
    return () => {
      cancelled = true;
    };
  }, [client, id]);
  if (failed) return null;
  return (
    <div className="relative mx-auto aspect-[9/16] w-[min(56vw,220px)]">
      {shots ? (
        <>
          <SwipeCard key={narration?.url ?? 'silent'} shots={shots} captionConfig={caption} position="top" onKeep={() => {}} onDiscard={() => {}} onOpen={() => {}} soundOn={soundOn} narration={narration} ariaLabel={`Preview: ${title}`} />
          <SoundButton on={soundOn} onToggle={toggleSound} />
          {audioUrl && <PreviewMusic url={audioUrl} playing={soundOn} />}
        </>
      ) : (
        <div className="h-full w-full animate-pulse rounded-[26px] bg-neutral-100 dark:bg-neutral-800" aria-label="Loading the preview" />
      )}
    </div>
  );
}
