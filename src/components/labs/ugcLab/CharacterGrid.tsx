'use client';

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../types/admin/ugc';
import { PortraitJsonDialog } from './PortraitJsonDialog';
import { Spinner } from './ui';
import { usePortraitJson } from './usePortraitJson';

type CharacterGridProps = {
  characters: UgcCharacterDto[];
  selectedId: string | null;
  onSelect: (character: UgcCharacterDto) => void;
  onArchive: (id: string) => void;
  /** A character changed (its JSON was generated). */
  onUpdate: (character: UgcCharacterDto) => void;
};

type JsonButtonProps = { character: UgcCharacterDto; busy: boolean; onOpen: () => void };

/** "Generate JSON" under a tile, or "View JSON" once the character has one. */
const JsonButton = ({ character, busy, onOpen }: JsonButtonProps) => (
  <button
    type="button"
    onClick={onOpen}
    className={`inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-medium transition-colors ${
      character.portraitJson
        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        : 'border border-line bg-white text-ink hover:bg-surface-alt'
    }`}
  >
    {busy ? <><Spinner /> JSON…</> : character.portraitJson ? 'View JSON' : 'Generate JSON'}
  </button>
);

/** Saved characters as 9:16 tiles. Tap to select; "Hide" archives without deleting videos. */
export function CharacterGrid({ characters, selectedId, onSelect, onArchive, onUpdate }: CharacterGridProps) {
  const portrait = usePortraitJson(onUpdate);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = characters.find((c) => c.id === openId) ?? null;

  function openJson(character: UgcCharacterDto) {
    setOpenId(character.id);
    if (!character.portraitJson && !portrait.isBusy(character.id)) void portrait.generate(character);
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {characters.map((c) => {
          const selected = c.id === selectedId;
          return (
            <figure key={c.id} className="flex flex-col gap-1.5">
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
              <JsonButton character={c} busy={portrait.isBusy(c.id)} onOpen={() => openJson(c)} />
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
      {open && (
        <PortraitJsonDialog
          character={open}
          busy={portrait.isBusy(open.id)}
          error={portrait.errorFor(open.id)}
          onGenerate={() => void portrait.generate(open)}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}
