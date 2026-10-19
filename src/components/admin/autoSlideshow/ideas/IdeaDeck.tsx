'use client';

import { Check, Undo2, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BLITZ_DEFAULT_TEXT_CONFIG, BLITZ_SLIDESHOW_TEXT_DEFAULTS } from '../../../../config/blitzLab';
import type { HookCtaStyle } from '../../../../remotion/types';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { blitzVoiceLabel } from '../../../../types/admin/blitzVoice';
import { SwipeCard } from '../../../labs/blitzLab/SwipeCard';
import { mergeTextConfig } from '../../../labs/blitzLab/useTextLayout';
import { useDeckSound } from '../../../labs/blitzLab/useDeckSound';
import { canSwap, nextClipOf } from '../../../../types/admin/ideaMedia';
import { DeckSide, type ShotSwap } from './DeckSide';
import type { VoicePreviewState } from './useVoicePreview';
import { formatLabel, ideaCard, whenOf } from './ideaCards';
import type { HookStyleState } from './useHookStyle';
import { VoiceCountdown } from './VoiceCountdown';

/** How long the card flies out before the next one shows. */
const EXIT_MS = 220;

type Props = {
  idea: IdeaDto;
  next: IdeaDto | null;
  canUndo: boolean;
  onDecide: (idea: IdeaDto, status: 'kept' | 'discarded') => void;
  onUndo: () => void;
  onEditHook: (idea: IdeaDto) => void;
  /** The mic on a Blitz idea: swaps to the other voice (woman / man). Null when it takes no voice. */
  onVoice: ((idea: IdeaDto) => void) | null;
  /** This idea's voiceover in its voice: loading, ready (plays on the card) or failed. */
  voice?: VoicePreviewState | null;
  /** "panel": the ideas panel (or phone sheet). "day": inside a day's card, with less room around it. */
  size?: DeckSize;
  /** When it will be posted if kept, when not its own day (a day's deck reusing an idea of another day). */
  plannedAt?: string;
  /** Asked before a keep (it uses a credit): false leaves the card where it is. */
  confirmKeep?: () => Promise<boolean>;
  /** The deck's ⋯ menu: pinned outside the card, top right. */
  menu?: ReactNode;
  /** The hook's look on Blitz ideas (picked in the Hook sheet). Absent: the Default look. */
  hookStyle?: HookStyleState;
  /** Blitz ideas, while paused: another clip for the shot on screen, and back to the one before. */
  clips?: DeckClips;
  /** Blitz ideas, while paused: the shot's caption dragged up or down (saved for when it is made). */
  onCaptionMove?: (idea: IdeaDto, shot: number, positionY: number) => void;
};

export type DeckClips = {
  /** `assetKey` null: the server finds the next one of the same kind. Settles once shown. */
  swap: (idea: IdeaDto, shot: number, assetKey: string | null) => Promise<void>;
  /** Null: nothing to undo on this idea. */
  undoOf: (idea: IdeaDto) => (() => void) | null;
};

export type DeckSize = 'panel' | 'day' | 'page';

/** Card sizes that keep ~48px free on each side for the side buttons (36px + gap) while the card stays centered.
 *  Phone panel: the height left after the tight header (~4.5rem) and the controls + undo row (~7.5rem) goes to the card. */
const CARD_SIZE: Record<DeckSize, string> = {
  panel: 'aspect-[9/16] w-[min(calc(100vw-6rem),calc((100dvh-13rem)*0.5625),380px)] lg:w-[min(calc((100dvh-28rem)*0.5625),260px)]',
  /** Phones: the buttons beside the card too (outside it, in the screen gutter), so the card leaves them room. */
  day: 'aspect-[9/16] w-[min(calc(100vw-7.5rem),calc((100dvh-10rem)*0.5625),460px)] lg:w-[min(calc((100dvh-22rem)*0.5625),260px)]',
  /** The Ideas page: every bit of height left after its compact header and the controls goes to the card, 9:16.
   *  Phones: as wide as the screen allows with the buttons beside it. */
  page: 'aspect-[9/16] w-[min(calc(100vw-7rem),calc((100lvh-12rem)*0.5625))] lg:w-[min(calc((100dvh-20rem)*0.5625),480px)]',
};

/** Where the ⋯ menu and the side buttons sit: beside the card, closer to it on phones (Ideas page and a day). Only
 *  "Why this?" sits on the card. */
const MENU_AT = { beside: 'top-0 left-full ml-1.5', on: 'top-0 left-full ml-0.5 lg:ml-1.5' };
const SIDE_AT = { beside: 'bottom-0 left-full ml-1.5', on: 'bottom-0 left-full ml-1 lg:ml-1.5' };

const round = 'flex items-center justify-center rounded-full border shadow-sm transition active:scale-90 disabled:opacity-30';

type ControlsProps = { idea: IdeaDto; onSkip: () => void; onKeep: () => void; onEditHook: () => void; undo?: ReactNode };

/** The buttons under the card: ✕ skip, Hook (another first line, and the hook's look), ✓ keep; `undo` left of ✕ (the Ideas page on phones).
 *  Hook stays under the card's middle whatever sits left of it. */
function Controls({ idea, onSkip, onKeep, onEditHook, undo }: ControlsProps) {
  return (
    <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-5">
      <div className="flex items-center justify-end gap-5">
        {undo}
        <button type="button" onClick={onSkip} aria-label="Skip this idea" className={`${round} h-14 w-14 border-line bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200`}>
          <X aria-hidden className="h-6 w-6" />
        </button>
      </div>
      <button type="button" onClick={onEditHook} disabled={idea.hooks.length === 0 && !idea.card} aria-label="Edit the hook" className={`${round} h-11 min-w-11 border-line bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200`}>
        Hook
      </button>
      <div className="flex justify-start">
        <button type="button" onClick={onKeep} aria-label="Keep this idea" className={`${round} h-14 w-14 border-app-cta bg-app-cta text-app-cta-ink hover:bg-app-cta/90`}>
          <Check aria-hidden className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

/** Video ideas draw their captions like the editor's "Default" style (and the render), each at its shot's position,
 *  with the picked hook look on the first and last slide. Photo slideshows have their text in the pictures. */
const VIDEO_CAPTION = mergeTextConfig(BLITZ_DEFAULT_TEXT_CONFIG, BLITZ_SLIDESHOW_TEXT_DEFAULTS);
const captionFor = (idea: IdeaDto, hookCtaStyle?: HookCtaStyle) => (idea.card ? { ...VIDEO_CAPTION, hookCtaStyle } : undefined);

/** Why the voiceover did not play, over the top of the card for a few seconds. */
function VoiceNote({ message }: { message: string }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShown(false), 5000);
    return () => clearTimeout(timer);
  }, []);
  if (!shown) return null;
  return (
    <p role="status" className="absolute inset-x-3 top-8 z-[6] rounded-xl bg-black/70 px-3 py-2 text-center text-[13px] font-semibold text-white backdrop-blur-sm transition-opacity">
      {message}
    </p>
  );
}

/** Over the card while its voiceover records: the card waits for it (2026-10-19), so the voice starts with the first shot. Swipes still go through. */
function VoiceWait() {
  return (
    <div role="status" className="pointer-events-none absolute inset-0 z-[6] grid place-items-center rounded-[26px] bg-black/45 backdrop-blur-[2px] transition-opacity">
      <span className="flex flex-col items-center gap-2 text-[13px] font-semibold text-white">
        <VoiceCountdown large />
        Recording the voice…
      </span>
    </div>
  );
}

/** The swap buttons for the shot on screen (Blitz ideas with `clips`): a photo swaps for a photo, a clip for a clip.
 *  The card's own runner-ups show at once; past them the server searches the library (`busy` meanwhile). */
const useShotSwap = (idea: IdeaDto, shot: number, clips?: DeckClips): ShotSwap | undefined => {
  const [busy, setBusy] = useState(false);
  if (!idea.card || !clips) return undefined;
  const swap = async () => {
    setBusy(true);
    await clips.swap(idea, shot, nextClipOf(idea.card!, shot));
    setBusy(false);
  };
  return { onSwap: canSwap(idea.card.shots[shot]) ? () => void swap() : null, onUndo: clips.undoOf(idea), busy, kind: idea.card.shots[shot]?.mediaKind === 'image' ? 'photo' : 'clip' };
};

/** One idea at a time: swipe or tap ✓ / ✕. The day it will be posted shows under the card. */
export function IdeaDeck({ idea, next, canUndo, onDecide, onUndo, onEditHook, onVoice, voice, size = 'panel', plannedAt, confirmKeep, menu, hookStyle, clips, onCaptionMove }: Props) {
  const { soundOn, toggleSound } = useDeckSound();
  const [exit, setExit] = useState<{ id: string; dir: 'keep' | 'discard' } | null>(null);
  // The next card loads once the top card can play, so its clips don't slow the first one down.
  const [readyId, setReadyId] = useState<string | null>(null);
  const card = useMemo(() => ideaCard(idea), [idea]);
  const back = useMemo(() => (next ? ideaCard(next) : null), [next]);
  // Paused for this idea only: the next card plays. `shot`: the one on screen, for the swap.
  const [pausedFor, setPausedFor] = useState<string | null>(null);
  const paused = pausedFor === idea.id;
  const setPaused = (p: boolean) => setPausedFor(p ? idea.id : null);
  const [shot, setShot] = useState(0);
  const swap = useShotSwap(idea, shot, clips);
  // A Blitz idea plays once its voiceover is recorded (or failed: it then plays without), not before.
  const awaitingVoice = Boolean(idea.card) && onVoice !== null && (!voice || voice.status === 'loading');
  const decide = async (status: 'kept' | 'discarded') => {
    if (exit) return;
    if (status === 'kept' && confirmKeep && !(await confirmKeep())) return; // the card slides back
    setExit({ id: idea.id, dir: status === 'kept' ? 'keep' : 'discard' });
    setTimeout(() => {
      setExit(null);
      onDecide(idea, status);
    }, EXIT_MS);
  };
  const at = size === 'page' || size === 'day' ? 'on' : 'beside';
  // Phones, on the Ideas page and in a day: undo left of ✕, and the date shows in the title above, not under the card.
  const compact = size !== 'panel';
  const tags = [{ label: formatLabel(idea), variant: 'style' as const }, { label: card.lensValue, variant: 'audience' as const }];
  return (
    <div className="flex flex-col items-center gap-2 lg:gap-3">
      {/* Centered over ✕ / ✓; sized by the screen height (✕ and ✓ stay in view) and leaving room for the sound buttons. */}
      <div className={`relative ${CARD_SIZE[size]}`} aria-live="polite">
        {back && next && readyId === idea.id && <SwipeCard key={back.id} shots={back.shots} captionConfig={captionFor(next, hookStyle?.hookCta)} position="back1" hue={back.hue} onKeep={() => {}} onDiscard={() => {}} onOpen={() => {}} />}
        <SwipeCard
          key={`${card.id}-${hookStyle?.version ?? 0}`}
          shots={card.shots}
          captionConfig={captionFor(idea, hookStyle?.hookCta)}
          tags={tags}
          whyPanel={card.whyPanel}
          position="top"
          hue={card.hue}
          exitDirection={exit?.id === idea.id ? exit.dir : null}
          onKeep={() => void decide('kept')}
          onDiscard={() => void decide('discarded')}
          onOpen={() => {}}
          soundOn={soundOn}
          onReady={() => setReadyId(idea.id)}
          narration={voice?.status === 'ready' ? voice.narration : null}
          ariaLabel={`${formatLabel(idea)} idea: ${idea.hook}`}
          paused={paused}
          externalPause={awaitingVoice}
          onPausedChange={setPaused}
          onShotChange={setShot}
          onCaptionMove={idea.card && onCaptionMove ? (at, y) => onCaptionMove(idea, at, y) : undefined}
        />
        {idea.card && hookStyle?.pending && (
          <div role="status" className="absolute inset-0 z-[6] grid place-items-center rounded-[26px] bg-black/45 backdrop-blur-[2px] transition-opacity">
            <span className="flex flex-col items-center gap-2 text-[13px] font-semibold text-white">
              <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
              Applying style…
            </span>
          </div>
        )}
        {awaitingVoice && !hookStyle?.pending && <VoiceWait />}
        {voice?.status === 'error' && <VoiceNote key={voice.message} message={voice.message} />}
        {menu && <div className={`absolute z-10 ${MENU_AT[at]}`}>{menu}</div>}
        <div className={`absolute z-10 ${SIDE_AT[at]}`}>
          <DeckSide soundOn={soundOn} onToggleSound={toggleSound} paused={paused} onTogglePause={() => setPaused(!paused)} swap={swap} onVoice={onVoice && idea.card ? () => onVoice(idea) : null} voiceLabel={blitzVoiceLabel(card.voice)} voiceState={voice?.status ?? null} />
        </div>
      </div>
      <Controls
        idea={idea}
        onSkip={() => void decide('discarded')}
        onKeep={() => void decide('kept')}
        onEditHook={() => onEditHook(idea)}
        undo={compact && (
          <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" className={`${round} h-11 w-11 border-line bg-white text-zinc-600 hover:bg-zinc-50 lg:hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300`}>
            <Undo2 aria-hidden className="h-4 w-4" />
          </button>
        )}
      />
      <div className={`-mt-1 flex items-center gap-3 text-xs text-muted lg:mt-0 ${compact ? 'max-lg:hidden' : ''}`}>
        <button type="button" onClick={onUndo} disabled={!canUndo} className="flex min-h-10 lg:min-h-11 items-center gap-1 px-2 font-semibold transition hover:text-ink disabled:opacity-30 dark:hover:text-zinc-100">
          <Undo2 aria-hidden className="h-4 w-4" /> Undo
        </button>
        <span>Will be posted: <span className="font-semibold text-ink dark:text-zinc-100">{whenOf(idea, plannedAt)}</span></span>
      </div>
    </div>
  );
}
