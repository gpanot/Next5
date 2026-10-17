'use client';

import { useEffect, useMemo, useState } from 'react';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { HookPicker } from './HookPicker';
import { whenOf } from './ideaCards';
import { IdeaDeck, type DeckClips, type DeckSize } from './IdeaDeck';
import type { Make } from './IdeasPanel';
import { useKeepConfirm } from './KeepConfirm';
import type { IdeasState } from './useIdeas';
import { useHookStyle } from './useHookStyle';
import { useVoicePreview, voiceOf } from './useVoicePreview';
import { nextBlitzVoice } from '../../../../types/admin/blitzVoice';
import { useBlitzVoices } from '../../../labs/blitzLab/useBlitzVoices';

/** Swapped clips, last first per idea (the shot, and the clip it had), so each swap can be undone. */
const useClipSwaps = (ideas: IdeasState): DeckClips => {
  const [undos, setUndos] = useState<Record<string, Array<{ shot: number; assetKey: string }>>>({});
  const { swapMedia } = ideas;
  return useMemo<DeckClips>(() => ({
    swap: async (idea, shot, assetKey) => {
      const before = idea.card?.shots[shot]?.assetKey;
      if (!before) return;
      await swapMedia(idea, shot, assetKey);
      setUndos((u) => ({ ...u, [idea.id]: [...(u[idea.id] ?? []), { shot, assetKey: before }] }));
    },
    undoOf: (idea) => {
      const last = undos[idea.id]?.at(-1);
      if (!last) return null;
      return () => {
        setUndos((u) => ({ ...u, [idea.id]: (u[idea.id] ?? []).slice(0, -1) }));
        void swapMedia(idea, last.shot, last.assetKey);
      };
    },
  }), [undos, swapMedia]);
};

type Props = {
  ideas: IdeasState;
  /** Swipe right makes the idea right away (1 credit). Null: keep only (ideas off). */
  maker: Make | null;
  idea: IdeaDto;
  next: IdeaDto | null;
  size?: DeckSize;
  /** Where a kept idea goes when not its own day (undefined: its own day). Shown as "Will be posted" too. */
  placeOf?: (idea: IdeaDto) => string | undefined;
};

/**
 * The ideas deck wired to the ideas: swipe right asks once (it uses a credit), keeps the idea on its day (or where
 * `placeOf` says) and makes it right away; swipe left skips; undo, another first line and the hook's look (Hook, under the card), the voiceover (recorded for the top and next card; the mic swaps woman / man voice); paused, the shot's clip swaps (with undo) and its caption moves up or down; ⋯ (Ideas page, phones) filters the deck.
 */
export function LiveDeck({ ideas, maker, idea, next, size, placeOf }: Props) {
  const [hookFor, setHookFor] = useState<IdeaDto | null>(null);
  const clips = useClipSwaps(ideas);
  const voices = useBlitzVoices(ideas.client);
  const hookStyle = useHookStyle();
  const { confirm, dialog } = useKeepConfirm();
  const preview = useVoicePreview(ideas.client, ideas.adoptSpokenLines);
  const { load } = preview;
  // The top card's voiceover is recorded as soon as it is on top, then the next card's (2026-10-14), so a swipe usually
  // lands on a voice already recorded. The next waits for the top: both at once slowed the top one from ~9 s to ~12 s.
  // A skipped card's recording is never heard (~$0.009).
  const topState = preview.stateOf(idea);
  const needsVoice = Boolean(idea.card) && topState === null;
  const topSettled = !idea.card || (topState !== null && topState.status !== 'loading');
  const nextNeedsVoice = topSettled && Boolean(next?.card) && next !== null && preview.stateOf(next) === null;
  useEffect(() => {
    if (needsVoice) void load(idea, voiceOf(idea));
  }, [needsVoice, idea, load]);
  useEffect(() => {
    if (nextNeedsVoice && next) void load(next, voiceOf(next), true);
  }, [nextNeedsVoice, next, load]);
  // The mic swaps to the other voice and plays it. Past the free day's limit the voice still swaps and its sample plays.
  const changeVoice = async (target: IdeaDto) => {
    const voice = nextBlitzVoice(voiceOf(target));
    ideas.setVoice(target, voice);
    const got = await load(target, voice);
    if (got.status === 'error' && got.limit) voices.play(voice);
  };
  const decide = (target: IdeaDto, status: 'kept' | 'discarded') => {
    if (status === 'discarded' || !maker) return ideas.decide(target, status);
    const at = placeOf?.(target);
    void maker.make([{ ...target, status: 'kept', plannedAt: at ?? target.plannedAt, hookCta: hookStyle.hookCta }], () => ideas.keepNow(target, at));
  };
  return (
    <>
      <IdeaDeck idea={idea} next={next} canUndo={ideas.canUndo} onDecide={decide} onUndo={ideas.undo} onEditHook={setHookFor} onVoice={(target) => void changeVoice(target)} voice={preview.stateOf(idea)} size={size} plannedAt={placeOf?.(idea)} confirmKeep={maker ? () => confirm(1, whenOf(idea, placeOf?.(idea))) : undefined} hookStyle={hookStyle} clips={clips} onCaptionMove={(target, shot, y) => void ideas.moveCaption(target, shot, y)} />
      {hookFor && <HookPicker idea={hookFor} onPick={(id) => ideas.pickHook(hookFor, id)} onClose={() => setHookFor(null)} style={hookFor.card ? hookStyle : undefined} />}
      {dialog}
    </>
  );
}
