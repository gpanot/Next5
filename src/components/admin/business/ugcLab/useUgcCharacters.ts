'use client';

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../../types/admin/ugc';
import { ugcRequest, useAdminApi } from './api';

/** Saved characters of one kind, with local add, update and archive. */
export const useUgcCharacters = (token: string, kind: UgcCharacterDto['kind']) => {
  const { data, error, loading, refresh } = useAdminApi<{ characters: UgcCharacterDto[] }>(
    token,
    `/api/admin/ugc-lab/characters?kind=${kind}`,
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
    update: (character: UgcCharacterDto) => edit((prev) => prev.map((c) => (c.id === character.id ? character : c))),
    archive: (id: string) => {
      edit((prev) => prev.filter((c) => c.id !== id));
      void ugcRequest(token, `/api/admin/ugc-lab/characters/${id}`, { method: 'DELETE' });
    },
  };
};
