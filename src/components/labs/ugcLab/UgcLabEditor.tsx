'use client';

/**
 * UGC Lab — (profile →) character → hook → voice → video, plus the library.
 * The Profile step shows only when a <StudioRunProvider> links the lab to Campaign Studio runs.
 *
 * Presentational and transport-agnostic: every request goes through the surrounding
 * <LabClientProvider>, so the same editor runs in the admin tab and on the user side.
 */

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../types/admin/ugc';
import { RunProfileStep } from '../studio/runs/RunProfileStep';
import { useStudioRunContext } from '../studio/runs/StudioRunContext';
import { CharacterPanel } from './CharacterPanel';
import { HookPanel } from './HookPanel';
import { LibraryPanel } from './LibraryPanel';
import { Pill } from './ui';
import type { ScriptReady } from './useScriptFlow';
import { VideoPanel, type VideoSelection } from './VideoPanel';
import { VoicePanel } from './VoicePanel';

type Step = 'profile' | 'character' | 'hook' | 'voice' | 'video' | 'library';

const FLOW_STEPS: { id: Step; label: string }[] = [
  { id: 'character', label: 'Character' },
  { id: 'hook',      label: 'Hook' },
  { id: 'voice',     label: 'Voice' },
  { id: 'video',     label: 'Video' },
];

/** Numbered flow steps, with Profile first when the lab is linked to Campaign Studio. */
const buildSteps = (withProfile: boolean): { id: Step; label: string }[] => {
  const flow = withProfile ? [{ id: 'profile' as const, label: 'Profile' }, ...FLOW_STEPS] : FLOW_STEPS;
  return [
    ...flow.map((s, i) => ({ id: s.id, label: `${i + 1} · ${s.label}` })),
    { id: 'library', label: 'Library' },
  ];
};

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

export function UgcLabEditor() {
  const withProfile = useStudioRunContext() !== null;
  const steps = buildSteps(withProfile);
  const [step, setStep] = useState<Step>(withProfile ? 'profile' : 'character');

  // Shared state threaded through steps
  const [selectedCharacter, setSelectedCharacter] = useState<UgcCharacterDto | null>(null);
  const [hook, setHook] = useState('');
  const [scriptReady, setScriptReady] = useState<VideoSelection | null>(null);
  const [voiceKey, setVoiceKey] = useState<string | null>(null);

  function handleCharacterSelected(character: UgcCharacterDto) {
    setSelectedCharacter(character);
    setStep('hook');
  }

  /** Keeps the picked character fresh, e.g. when its JSON is generated after it was picked. */
  function handleCharacterUpdated(character: UgcCharacterDto) {
    setSelectedCharacter((prev) => (prev?.id === character.id ? character : prev));
    setScriptReady((prev) => (prev?.character.id === character.id ? { ...prev, character } : prev));
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
        {steps.map((s) => (
          <Pill key={s.id} active={step === s.id} onClick={() => setStep(s.id)}>{s.label}</Pill>
        ))}
      </div>

      {step !== 'library' && step !== 'profile' && (
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

      {step === 'profile' && <RunProfileStep onConfirmed={() => setStep('character')} />}
      {step === 'character' && (
        <CharacterPanel onCharacterSelected={handleCharacterSelected} onCharacterUpdated={handleCharacterUpdated} />
      )}
      {step === 'hook' && (
        <HookPanel character={selectedCharacter} onReady={handleScriptReady} />
      )}
      {step === 'voice' && (
        <VoicePanel onVoiceReady={handleVoiceReady} onSkip={handleVoiceSkip} />
      )}
      {step === 'video' && (
        <VideoPanel
          selection={scriptReady}
          voiceKey={voiceKey}
          onOpenLibrary={() => setStep('library')}
        />
      )}
      {step === 'library' && <LibraryPanel />}
    </div>
  );
}
