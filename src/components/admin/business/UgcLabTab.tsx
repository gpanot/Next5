'use client';

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../types/admin/ugc';
import { CharacterPanel } from './ugcLab/CharacterPanel';
import { HookPanel } from './ugcLab/HookPanel';
import { LibraryPanel } from './ugcLab/LibraryPanel';
import { Pill } from './ugcLab/ui';
import type { ScriptReady } from './ugcLab/useScriptFlow';
import { VideoPanel, type VideoSelection } from './ugcLab/VideoPanel';
import { VoicePanel } from './ugcLab/VoicePanel';

type Step = 'character' | 'hook' | 'voice' | 'video' | 'library';

const STEPS: { id: Step; label: string }[] = [
  { id: 'character', label: '1 · Character' },
  { id: 'hook',      label: '2 · Hook' },
  { id: 'voice',     label: '3 · Voice' },
  { id: 'video',     label: '4 · Video' },
  { id: 'library',   label: 'Library' },
];

type UgcLabTabProps = { token: string };

const SelectionBar = ({
  character,
  hook,
  selection,
  voiceKey,
  onClearCharacter,
  onClearHook,
  onClearSelection,
  onClearVoice,
}: {
  character: UgcCharacterDto | null;
  hook: string;
  selection: VideoSelection | null;
  voiceKey: string | null;
  onClearCharacter: () => void;
  onClearHook: () => void;
  onClearSelection: () => void;
  onClearVoice: () => void;
}) => {
  if (!character && !hook && !selection && !voiceKey) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[12px]">
      {character && (
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-muted">Character</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
          <img src={character.url} alt="" className="h-9 w-[20px] rounded object-cover ring-1 ring-line" />
          <span className="text-ink capitalize">{character.kind}</span>
          <button type="button" onClick={onClearCharacter} className="text-subtle underline hover:text-ink">Clear</button>
        </span>
      )}
      {hook && (
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-muted">Hook</span>
          <span className="max-w-[240px] truncate text-ink">{hook}</span>
          <button type="button" onClick={onClearHook} className="text-subtle underline hover:text-ink">Clear</button>
        </span>
      )}
      {selection && (
        <span className="flex items-center gap-2">
          <span className="text-muted">Script</span>
          <span className="text-ink tabular-nums">{selection.duration} s</span>
          <button type="button" onClick={onClearSelection} className="text-subtle underline hover:text-ink">Clear</button>
        </span>
      )}
      {voiceKey && (
        <span className="flex items-center gap-2">
          <span className="text-muted">Voice</span>
          <span className="text-ink">Custom voice</span>
          <button type="button" onClick={onClearVoice} className="text-subtle underline hover:text-ink">Clear</button>
        </span>
      )}
    </div>
  );
};

export function UgcLabTab({ token }: UgcLabTabProps) {
  const [step, setStep] = useState<Step>('character');

  // Shared state threaded through steps
  const [selectedCharacter, setSelectedCharacter] = useState<UgcCharacterDto | null>(null);
  const [hook, setHook] = useState('');
  const [scriptReady, setScriptReady] = useState<VideoSelection | null>(null);
  const [voiceKey, setVoiceKey] = useState<string | null>(null);

  function handleCharacterSelected(character: UgcCharacterDto) {
    setSelectedCharacter(character);
    setStep('hook');
  }

  function handleScriptReady(ready: ScriptReady, hookText: string) {
    setHook(hookText); // the original hook phrase shown in the SelectionBar
    setScriptReady(ready);
    setStep('voice');
  }

  function handleVoiceReady(key: string) {
    setVoiceKey(key);
    setStep('video');
  }

  function handleVoiceSkip() {
    setStep('video');
  }

  function clearCharacter() {
    setSelectedCharacter(null);
    setHook('');
    setScriptReady(null);
    setVoiceKey(null);
    setStep('character');
  }

  function clearHook() {
    setHook('');
    setScriptReady(null);
    setVoiceKey(null);
    setStep('hook');
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STEPS.map((s) => (
          <Pill key={s.id} active={step === s.id} onClick={() => setStep(s.id)}>{s.label}</Pill>
        ))}
      </div>

      {step !== 'library' && (
        <SelectionBar
          character={selectedCharacter}
          hook={scriptReady?.script ?? ''}
          selection={scriptReady}
          voiceKey={voiceKey}
          onClearCharacter={clearCharacter}
          onClearHook={clearHook}
          onClearSelection={() => { setScriptReady(null); setStep('hook'); }}
          onClearVoice={() => setVoiceKey(null)}
        />
      )}

      {step === 'character' && (
        <CharacterPanel token={token} onCharacterSelected={handleCharacterSelected} />
      )}
      {step === 'hook' && (
        <HookPanel token={token} character={selectedCharacter} onReady={handleScriptReady} />
      )}
      {step === 'voice' && (
        <VoicePanel token={token} onVoiceReady={handleVoiceReady} onSkip={handleVoiceSkip} />
      )}
      {step === 'video' && (
        <VideoPanel
          token={token}
          selection={scriptReady}
          voiceKey={voiceKey}
          onOpenLibrary={() => setStep('library')}
        />
      )}
      {step === 'library' && <LibraryPanel token={token} />}
    </div>
  );
}
