'use client';

// Right column of the deck: music for the card on screen, and the deck's images (Assets modal).

import { Images } from 'lucide-react';
import { useState, type Dispatch, type SetStateAction } from 'react';
import type { TextConfig } from '../../../remotion/types';
import type { BlitzAssetDto } from './api';
import { useDeckShotRefit } from './autoFit/useDeckShotRefit';
import { DeckAssetsModal } from './DeckAssetsModal';
import { deckImageKeys, removeImageFromCards, replaceImageInCards } from './deckImageCards';
import { DeckMusicPanel } from './DeckMusicPanel';
import type { DeckCardData, DeckSound } from './SwipeDeck';

type Props = {
  /** The card on screen (top of the deck or the one in Preview). */
  card: DeckCardData | null;
  sound: DeckSound;
  deckCards: DeckCardData[];
  setDeckCards: Dispatch<SetStateAction<DeckCardData[]>>;
  assets: BlitzAssetDto[];
  /** How the deck draws captions: a shot whose image changes is fitted again in this style. */
  captionConfig: TextConfig;
};

export function DeckAside({ card, sound, deckCards, setDeckCards, assets, captionConfig }: Props) {
  const [assetsOpen, setAssetsOpen] = useState(false);
  const changeImages = useDeckShotRefit({ deckCards, setDeckCards, assets, captionConfig });
  const keys = deckImageKeys(deckCards);
  const usage: Record<string, number> = {};
  deckCards.forEach((c) => c.shots.forEach((s) => {
    const key = s.edit?.assetKey;
    if (key) usage[key] = (usage[key] ?? 0) + 1;
  }));

  return (
    <div className="flex flex-col gap-3">
      <DeckMusicPanel
        card={card}
        sound={sound}
        assets={assets}
        onChange={(cardId, audio) => setDeckCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, audio } : c)))}
      />
      <button
        type="button"
        onClick={() => setAssetsOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] text-[14px] font-semibold text-[var(--ink,#000)] shadow-sm transition-all hover:bg-[var(--soft-2,#e6e1db)] active:scale-[.98] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
      >
        <Images aria-hidden className="h-4 w-4" /> Assets
        <span className="text-[12px] font-medium text-[var(--mute,#7c7d82)]">{keys.length} images</span>
      </button>
      {assetsOpen && (
        <DeckAssetsModal
          keys={keys}
          usage={usage}
          onReplaced={(oldKey, next) => changeImages((prev) => replaceImageInCards(prev, oldKey, next))}
          onRemoved={(key) => changeImages((prev) => removeImageFromCards(prev, key))}
          onClose={() => setAssetsOpen(false)}
        />
      )}
    </div>
  );
}
