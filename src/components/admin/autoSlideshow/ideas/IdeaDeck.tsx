'use client';

import { Check, Pencil, Undo2, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { BLITZ_DEFAULT_TEXT_CONFIG, BLITZ_SLIDESHOW_TEXT_DEFAULTS } from '../../../../config/blitzLab';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { SwipeCard } from '../../../labs/blitzLab/SwipeCard';
import { mergeTextConfig } from '../../../labs/blitzLab/useTextLayout';
import { useDeckSound } from '../../../labs/blitzLab/useDeckSound';
import { CardMusic, DeckSide } from './DeckSide';
import { formatLabel, ideaCard, whenOf } from './ideaCards';

/** How long the card flies out before the next one shows. */
const EXIT_MS = 220;

type Props = {
  idea: IdeaDto;
  next: IdeaDto | null;
  canUndo: boolean;
  onDecide: (idea: IdeaDto, status: 'kept' | 'discarded') => void;
  onUndo: () => void;
  onEditHook: (idea: IdeaDto) => void;
  /** Another track at random for this idea; null when it takes no other music. */
  onShuffle: ((idea: IdeaDto) => void) | null;
  /** "panel": the ideas panel (or phone sheet). "day": inside a day's card, with less room around it. */
  size?: DeckSize;
  /** When it will be posted if kept, when not its own day (a day's deck reusing an idea of another day). */
  plannedAt?: string;
  /** Asked before a keep (it uses a credit): false leaves the card where it is. */
  confirmKeep?: () => Promise<boolean>;
  /** The deck's ⋯ menu: pinned outside the card, top right. */
  menu?: ReactNode;
};

export type DeckSize = 'panel' | 'day' | 'page';

/** Card sizes that keep ~48px free on each side for the sound buttons (36px + gap) while the card stays centered.
 *  Phone panel: the height left after the tight header (~4.5rem) and the controls + undo row (~7.5rem) goes to the card. */
const CARD_SIZE: Record<DeckSize, string> = {
  panel: 'aspect-[9/16] w-[min(calc(100vw-6rem),calc((100dvh-13rem)*0.5625),380px)] lg:w-[min(calc((100dvh-28rem)*0.5625),260px)]',
  /** Phones: as on the Ideas page, sound buttons on the card and bare ⋯ beside it, so the card takes almost all the width. */
  day: 'aspect-[9/16] w-[min(calc((100vw-7.5rem)*1.1),calc((100dvh-10rem)*0.5625),460px)] lg:w-[min(calc((100dvh-22rem)*0.5625),260px)]',
  /** The Ideas page: every bit of height left after its compact header and the controls goes to the card, 9:16.
   *  Phones: as wide as the screen allows, the buttons sit on the card. Desktop: the buttons beside it. */
  page: 'aspect-[9/16] w-[min(calc(100vw-5rem),calc((100dvh-13.5rem)*0.5625))] lg:w-[min(calc((100dvh-20rem)*0.5625),480px)]',
};

/** Where the ⋯ menu and the sound buttons sit: beside the card, or (sound) on it on phones (Ideas page and a day). */
const MENU_AT = { beside: 'top-0 left-full ml-1.5', on: 'top-0 left-full ml-0.5 lg:ml-1.5' };
const SIDE_AT = { beside: 'bottom-0 left-full ml-1.5', on: 'bottom-14 right-3 lg:bottom-0 lg:right-auto lg:left-full lg:ml-1.5' };

const round = 'flex items-center justify-center rounded-full border shadow-sm transition active:scale-90 disabled:opacity-30';

type ControlsProps = { idea: IdeaDto; onSkip: () => void; onKeep: () => void; onEditHook: () => void; undo?: ReactNode };

/** The buttons under the card: ✕ skip, pencil (another first line), ✓ keep; `undo` left of ✕ (the Ideas page on phones).
 *  The pencil stays under the card's middle whatever sits left of it. */
function Controls({ idea, onSkip, onKeep, onEditHook, undo }: ControlsProps) {
  return (
    <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-5">
      <div className="flex items-center justify-end gap-5">
        {undo}
        <button type="button" onClick={onSkip} aria-label="Skip this idea" className={`${round} h-14 w-14 border-line bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200`}>
          <X aria-hidden className="h-6 w-6" />
        </button>
      </div>
      <button type="button" onClick={onEditHook} disabled={idea.hooks.length === 0} aria-label="Pick another first line" className={`${round} h-11 w-11 border-line bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300`}>
        <Pencil aria-hidden className="h-4 w-4" />
      </button>
      <div className="flex justify-start">
        <button type="button" onClick={onKeep} aria-label="Keep this idea" className={`${round} h-14 w-14 border-app-cta bg-app-cta text-app-cta-ink hover:bg-app-cta/90`}>
          <Check aria-hidden className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

/** Video ideas draw their captions like the editor's "Default" style (and the render), each at its shot's position.
 *  Photo slideshows have their text in the pictures. */
const VIDEO_CAPTION = mergeTextConfig(BLITZ_DEFAULT_TEXT_CONFIG, BLITZ_SLIDESHOW_TEXT_DEFAULTS);
const captionFor = (idea: IdeaDto) => (idea.card ? VIDEO_CAPTION : undefined);

/** One idea at a time: swipe or tap ✓ / ✕. The day it will be posted shows under the card. */
export function IdeaDeck({ idea, next, canUndo, onDecide, onUndo, onEditHook, onShuffle, size = 'panel', plannedAt, confirmKeep, menu }: Props) {
  const { soundOn, toggleSound } = useDeckSound();
  const [exit, setExit] = useState<{ id: string; dir: 'keep' | 'discard' } | null>(null);
  const card = useMemo(() => ideaCard(idea), [idea]);
  const back = useMemo(() => (next ? ideaCard(next) : null), [next]);
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
        {back && next && <SwipeCard key={back.id} shots={back.shots} captionConfig={captionFor(next)} position="back1" hue={back.hue} onKeep={() => {}} onDiscard={() => {}} onOpen={() => {}} />}
        <SwipeCard
          key={card.id}
          shots={card.shots}
          captionConfig={captionFor(idea)}
          tags={tags}
          whyPanel={card.whyPanel}
          position="top"
          hue={card.hue}
          exitDirection={exit?.id === idea.id ? exit.dir : null}
          onKeep={() => void decide('kept')}
          onDiscard={() => void decide('discarded')}
          onOpen={() => {}}
          soundOn={soundOn}
          ariaLabel={`${formatLabel(idea)} idea: ${idea.hook}`}
        />
        {menu && <div className={`absolute z-10 ${MENU_AT[at]}`}>{menu}</div>}
        <div className={`absolute z-10 ${SIDE_AT[at]}`}>
          <DeckSide overlay={at === 'on'} soundOn={soundOn} onToggleSound={toggleSound} onShuffle={onShuffle && idea.card ? () => onShuffle(idea) : null} trackLabel={card.audio?.label ?? null} />
        </div>
      </div>
      <CardMusic url={card.audio?.url ?? null} startAt={card.audio?.startAt ?? 0} playing={soundOn && !exit} />
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
