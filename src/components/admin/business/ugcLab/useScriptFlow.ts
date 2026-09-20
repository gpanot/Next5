'use client';

import { useState } from 'react';
import type { UgcDuration, UgcScene } from '../../../../config/ugcLab';
import type { UgcCharacterDto } from '../../../../types/admin/ugc';
import { errorOf, ugcRequest } from './api';
import type { ScriptOption } from './ScriptPicker';

export type ScriptReady = { character: UgcCharacterDto; script: string; duration: UgcDuration };

export type ScriptFlowBusy = '' | 'describe' | 'scripts';

/**
 * Hook → character → 3 scripts → pick and edit one. Shared by photos and AI characters,
 * so both get the same editable hook and the same script lengths.
 */
export const useScriptFlow = (token: string, initialHook: string, onDescribed: (character: UgcCharacterDto) => void) => {
  const [hookDraft, setHookDraft] = useState(initialHook);
  const [selected, setSelected] = useState<UgcCharacterDto | null>(null);
  const [busy, setBusy] = useState<ScriptFlowBusy>('');
  const [error, setError] = useState('');
  const [scripts, setScripts] = useState<ScriptOption[]>([]);
  const [duration, setDuration] = useState<UgcDuration | null>(null);
  const [edited, setEdited] = useState('');

  async function describe(character: UgcCharacterDto): Promise<UgcCharacterDto> {
    if (character.scene) return character;
    setBusy('describe');
    const res = await ugcRequest<{ scene?: UgcScene }>(token, '/api/admin/ugc-lab/describe', { json: { characterId: character.id } })
      .catch(() => null);
    if (!res?.ok || !res.data.scene) {
      setError(`${res ? errorOf(res) : 'Could not describe the image'}. Scripts will not mention the place.`);
      return character;
    }
    const described = { ...character, scene: res.data.scene };
    onDescribed(described);
    return described;
  }

  async function writeScripts(character: UgcCharacterDto, hookOverride?: string) {
    const hook = hookOverride ?? hookDraft;
    if (!hook.trim()) {
      setBusy('');
      setError('Type a hook first (or pick one in Research).');
      return;
    }
    setBusy('scripts');
    setError('');
    const res = await ugcRequest<{ scripts?: ScriptOption[] }>(token, '/api/admin/ugc-lab/scripts', {
      json: { hook, scene: character.scene },
    }).catch(() => null);
    setBusy('');
    if (res?.ok && res.data.scripts) setScripts(res.data.scripts.filter((s) => s.text));
    else setError(res ? errorOf(res) : 'Script generation failed');
  }

  async function choose(character: UgcCharacterDto) {
    setSelected(character);
    setError('');
    setScripts([]);
    setDuration(null);
    const described = await describe(character);
    setSelected(described);
    await writeScripts(described);
  }

  /** For the Hook step: hook is already known; character was selected in the previous step. */
  async function chooseWithHook(character: UgcCharacterDto, hook: string) {
    setHookDraft(hook);
    setSelected(character);
    setError('');
    setScripts([]);
    setDuration(null);
    const described = await describe(character);
    setSelected(described);
    await writeScripts(described, hook);
  }

  return {
    hookDraft, setHookDraft, selected, busy, error, scripts, duration, edited, setEdited,
    choose,
    chooseWithHook,
    rewrite: () => (selected ? writeScripts(selected) : Promise.resolve()),
    pick: (script: ScriptOption) => {
      setDuration(script.duration);
      setEdited(script.text);
    },
    ready: (): ScriptReady | null =>
      selected && duration && edited.trim() ? { character: selected, script: edited.trim(), duration } : null,
    setError,
    /** Forget the character and its scripts, e.g. when switching between photos and AI characters. */
    reset: () => {
      setSelected(null);
      setScripts([]);
      setDuration(null);
      setEdited('');
      setError('');
    },
  };
};

export type ScriptFlow = ReturnType<typeof useScriptFlow>;
