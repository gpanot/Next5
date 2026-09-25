'use client';

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../types/admin/ugc';
import { errorOf, useLabClient } from './api';

type PortraitCloneResponse = { character?: UgcCharacterDto };

/** Runs the Portrait Clone analysis per character and reports each updated character. */
export const usePortraitJson = (onUpdated: (character: UgcCharacterDto) => void) => {
  const client = useLabClient();
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setBusy = (id: string, busy: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });

  async function generate(character: UgcCharacterDto): Promise<UgcCharacterDto | null> {
    setBusy(character.id, true);
    setErrors((prev) => ({ ...prev, [character.id]: '' }));
    const res = await client
      .request<PortraitCloneResponse>('/ugc-lab/portrait-clone', { json: { characterId: character.id } })
      .catch(() => null);
    setBusy(character.id, false);
    if (!res?.ok || !res.data.character) {
      setErrors((prev) => ({ ...prev, [character.id]: res ? errorOf(res) : 'JSON generation failed' }));
      return null;
    }
    onUpdated(res.data.character);
    return res.data.character;
  }

  return {
    generate,
    isBusy: (id: string): boolean => busyIds.has(id),
    errorFor: (id: string): string => errors[id] ?? '',
  };
};
