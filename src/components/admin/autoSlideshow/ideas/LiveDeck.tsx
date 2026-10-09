'use client';

import { useState } from 'react';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { DeckMenu } from './DeckMenu';
import { HookPicker } from './HookPicker';
import { IdeaDeck, type DeckSize } from './IdeaDeck';
import type { Make } from './IdeasPanel';
import { useKeepConfirm } from './KeepConfirm';
import type { IdeasState } from './useIdeas';
import { useIdeaMusic } from './useIdeaMusic';

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
 * `placeOf` says) and makes it right away; swipe left skips; undo, another first line (pencil), another track (shuffle); ⋯ creates 3 slideshows.
 */
export function LiveDeck({ ideas, maker, idea, next, size, placeOf }: Props) {
  const [hookFor, setHookFor] = useState<IdeaDto | null>(null);
  const music = useIdeaMusic(ideas.client);
  const { confirm, dialog } = useKeepConfirm();
  const asked = ideas.making.filter((i) => i.requested).length;
  const shuffle = (target: IdeaDto) => {
    const track = music.randomOther(target.card?.audio?.assetKey);
    if (track) ideas.setMusic(target, track);
  };
  const decide = (target: IdeaDto, status: 'kept' | 'discarded') => {
    if (status === 'discarded' || !maker) return ideas.decide(target, status);
    const at = placeOf?.(target);
    void maker.make([{ ...target, status: 'kept', plannedAt: at ?? target.plannedAt }], () => ideas.keepNow(target, at));
  };
  return (
    <>
      <IdeaDeck idea={idea} next={next} canUndo={ideas.canUndo} onDecide={decide} onUndo={ideas.undo} onEditHook={setHookFor} onShuffle={music.canShuffle ? shuffle : null} size={size} plannedAt={placeOf?.(idea)} confirmKeep={maker ? () => confirm(1) : undefined} menu={<DeckMenu onCreate={ideas.createSlideshows} making={asked} filters={size === 'page' ? ideas : undefined} bareOnPhone={size === 'page' || size === 'day'} />} />
      {hookFor && <HookPicker idea={hookFor} onPick={(id) => ideas.pickHook(hookFor, id)} onClose={() => setHookFor(null)} />}
      {dialog}
    </>
  );
}
