'use client';

import { Check, Pencil, Undo2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { SwipeCard } from '../../../labs/blitzLab/SwipeCard';
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
};

export type DeckSize = 'panel' | 'day';

/** Card widths that keep ~48px free on each side for the sound buttons (36px + gap) while the card stays centered.
 *  Phone panel: the height left after the tight header (~4.5rem) and the controls + undo row (~7.5rem) goes to the card. */
const CARD_WIDTH: Record<DeckSize, string> = {
  panel: 'w-[min(calc(100vw-6rem),calc((100dvh-13rem)*0.5625),380px)] lg:w-[min(calc((100dvh-28rem)*0.5625),260px)]',
  day: 'w-[min(calc(100vw-11.5rem),calc((100dvh-18rem)*0.5625),300px)] lg:w-[min(calc((100dvh-22rem)*0.5625),260px)]',
};

const round = 'flex items-center justify-center rounded-full border shadow-sm transition active:scale-90 disabled:opacity-30';

/** The three buttons under the card: ✕ skip, pencil (another first line), ✓ keep. */
function Controls({ idea, onSkip, onKeep, onEditHook }: { idea: IdeaDto; onSkip: () => void; onKeep: () => void; onEditHook: () => void }) {
  return (
    <div className="flex items-center justify-center gap-5">
      <button type="button" onClick={onSkip} aria-label="Skip this idea" className={`${round} h-14 w-14 border-line bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200`}>
        <X aria-hidden className="h-6 w-6" />
      </button>
      <button type="button" onClick={onEditHook} disabled={idea.hooks.length === 0} aria-label="Pick another first line" className={`${round} h-11 w-11 border-line bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300`}>
        <Pencil aria-hidden className="h-4 w-4" />
      </button>
      <button type="button" onClick={onKeep} aria-label="Keep this idea" className={`${round} h-14 w-14 border-blue-600 bg-blue-600 text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-500`}>
        <Check aria-hidden className="h-6 w-6" />
      </button>
    </div>
  );
}

/** One idea at a time: swipe or tap ✓ / ✕. The day it will be posted shows under the card. */
export function IdeaDeck({ idea, next, canUndo, onDecide, onUndo, onEditHook, onShuffle, size = 'panel', plannedAt, confirmKeep }: Props) {
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
  const tags = [{ label: formatLabel(idea), variant: 'style' as const }, { label: card.lensValue, variant: 'audience' as const }];
  return (
    <div className="flex flex-col items-center gap-2 lg:gap-3">
      {/* Centered over ✕ / ✓; sized by the screen height (✕ and ✓ stay in view) and leaving room for the sound buttons. */}
      <div className={`relative aspect-[9/16] ${CARD_WIDTH[size]}`} aria-live="polite">
        {back && <SwipeCard key={back.id} shots={back.shots} position="back1" hue={back.hue} onKeep={() => {}} onDiscard={() => {}} onOpen={() => {}} />}
        <SwipeCard
          key={card.id}
          shots={card.shots}
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
        <div className="absolute bottom-0 left-full ml-1.5">
          <DeckSide soundOn={soundOn} onToggleSound={toggleSound} onShuffle={onShuffle && idea.card ? () => onShuffle(idea) : null} trackLabel={card.audio?.label ?? null} />
        </div>
      </div>
      <CardMusic url={card.audio?.url ?? null} startAt={card.audio?.startAt ?? 0} playing={soundOn && !exit} />
      <Controls idea={idea} onSkip={() => void decide('discarded')} onKeep={() => void decide('kept')} onEditHook={() => onEditHook(idea)} />
      <div className="-mt-1 flex items-center gap-3 text-xs text-muted lg:mt-0">
        <button type="button" onClick={onUndo} disabled={!canUndo} className="flex min-h-10 lg:min-h-11 items-center gap-1 px-2 font-semibold transition hover:text-ink disabled:opacity-30 dark:hover:text-zinc-100">
          <Undo2 aria-hidden className="h-4 w-4" /> Undo
        </button>
        <span>Will be posted: <span className="font-semibold text-ink dark:text-zinc-100">{whenOf(idea, plannedAt)}</span></span>
      </div>
    </div>
  );
}
