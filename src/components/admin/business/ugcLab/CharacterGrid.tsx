'use client';

import type { UgcCharacterDto } from '../../../../types/admin/ugc';

type CharacterGridProps = {
  characters: UgcCharacterDto[];
  selectedId: string | null;
  onSelect: (character: UgcCharacterDto) => void;
  onArchive: (id: string) => void;
};

/** Saved characters as 9:16 tiles. Tap to select; "Hide" archives without deleting videos. */
export function CharacterGrid({ characters, selectedId, onSelect, onArchive }: CharacterGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {characters.map((c) => {
        const selected = c.id === selectedId;
        return (
          <figure key={c.id} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => onSelect(c)}
              aria-pressed={selected}
              className={`relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-surface-alt transition-shadow ${
                selected ? 'ring-2 ring-ink ring-offset-2' : 'ring-1 ring-line hover:ring-ink/40'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
              <img src={c.url} alt={c.scene?.person ?? 'Saved character'} className="h-full w-full object-cover" />
              {selected && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-ink px-2 py-0.5 text-[10px] font-medium text-white">Selected</span>
              )}
            </button>
            <figcaption className="flex items-center justify-between gap-1 text-[11px] text-muted">
              <span className="truncate">{new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              <button type="button" onClick={() => onArchive(c.id)} className="text-subtle underline hover:text-red-700">
                Hide
              </button>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
