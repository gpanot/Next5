'use client';

import { useEffect, useState } from 'react';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { DeckMenu } from './DeckMenu';
import { HookPicker } from './HookPicker';
import { whenOf } from './ideaCards';
import { IdeaDeck, type DeckSize } from './IdeaDeck';
import type { Make } from './IdeasPanel';
import { useKeepConfirm } from './KeepConfirm';
import type { IdeasState } from './useIdeas';
import { useHookStyle } from './useHookStyle';
import { useVoicePreview, voiceOf } from './useVoicePreview';
import { nextBlitzVoice } from '../../../../types/admin/blitzVoice';
import { useBlitzVoices } from '../../../labs/blitzLab/useBlitzVoices';

/** How long a card stays on top before its voiceover is recorded. */
const VOICE_AFTER_MS = 1000;

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
 * `placeOf` says) and makes it right away; swipe left skips; undo, another first line (pencil), the hook's look (Hook), the voiceover (recorded once the card stays on screen; the mic swaps woman / man voice); ⋯ creates 3 slideshows.
 */
export function LiveDeck({ ideas, maker, idea, next, size, placeOf }: Props) {
  const [hookFor, setHookFor] = useState<IdeaDto | null>(null);
  const voices = useBlitzVoices(ideas.client);
  const hookStyle = useHookStyle();
  const { confirm, dialog } = useKeepConfirm();
  const asked = ideas.making.filter((i) => i.requested).length;
  const preview = useVoicePreview(ideas.client);
  const { load } = preview;
  // The top card's voiceover is recorded once it stays on screen a moment (a fast skip costs nothing).
  const needsVoice = Boolean(idea.card) && preview.stateOf(idea) === null;
  useEffect(() => {
    if (!needsVoice) return;
    const timer = setTimeout(() => void load(idea, voiceOf(idea)), VOICE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [needsVoice, idea, load]);
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
      <IdeaDeck idea={idea} next={next} canUndo={ideas.canUndo} onDecide={decide} onUndo={ideas.undo} onEditHook={setHookFor} onVoice={(target) => void changeVoice(target)} voice={preview.stateOf(idea)} size={size} plannedAt={placeOf?.(idea)} confirmKeep={maker ? () => confirm(1, whenOf(idea, placeOf?.(idea))) : undefined} menu={<DeckMenu onCreate={ideas.createSlideshows} making={asked} filters={size === 'page' ? ideas : undefined} bareOnPhone={size === 'page' || size === 'day'} />} hookStyle={hookStyle} />
      {hookFor && <HookPicker idea={hookFor} onPick={(id) => ideas.pickHook(hookFor, id)} onClose={() => setHookFor(null)} />}
      {dialog}
    </>
  );
}
