'use client';

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../types/admin/ugc';
import { useLabClient, useLabQuery } from './api';

/** Saved characters of one kind, with local add, update and archive. `onUpdated` hears every update. */
export const useUgcCharacters = (kind: UgcCharacterDto['kind'], onUpdated?: (character: UgcCharacterDto) => void) => {
  const client = useLabClient();
  const { data, error, loading, refresh } = useLabQuery<{ characters: UgcCharacterDto[] }>(
    `/ugc-lab/characters?kind=${kind}`,
  );
  const [own, setOwn] = useState<UgcCharacterDto[] | null>(null);
  const characters = own ?? data?.characters ?? [];
  const edit = (fn: (prev: UgcCharacterDto[]) => UgcCharacterDto[]) => setOwn((prev) => fn(prev ?? data?.characters ?? []));

  return {
    characters,
    error,
    loading: loading && !data,
    reload: () => {
      setOwn(null);
      refresh();
    },
    add: (character: UgcCharacterDto) => edit((prev) => [character, ...prev.filter((c) => c.id !== character.id)]),
    update: (character: UgcCharacterDto) => {
      edit((prev) => prev.map((c) => (c.id === character.id ? character : c)));
      onUpdated?.(character);
    },
    archive: (id: string) => {
      edit((prev) => prev.filter((c) => c.id !== id));
      void client.request(`/ugc-lab/characters/${id}`, { method: 'DELETE' });
    },
  };
};
