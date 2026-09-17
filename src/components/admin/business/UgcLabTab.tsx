'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ResearchPanel } from './ugcLab/ResearchPanel';
import { CharacterPanel } from './ugcLab/CharacterPanel';
import { VideoPanel } from './ugcLab/VideoPanel';

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: 'Research Hooks',
  2: 'Build Character',
  3: 'Generate Video',
};

type UgcLabTabProps = {
  token: string;
};

export function UgcLabTab({ token }: UgcLabTabProps) {
  const [step, setStep] = useState<Step>(1);
  const [hook, setHook] = useState('');
  const [characterUrl, setCharacterUrl] = useState('');

  function handleHookSelected(selected: string) {
    setHook(selected);
    setStep(2);
  }

  function handleCharacterSelected(url: string) {
    setCharacterUrl(url);
  }

  function goToVideoStep() {
    if (hook && characterUrl) setStep(3);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Step navigation */}
      <div className="flex items-center gap-0 mb-8 border border-zinc-800 rounded-xl overflow-hidden">
        {([1, 2, 3] as Step[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              if (s <= step || (s === 2 && hook) || (s === 3 && hook && characterUrl)) {
                setStep(s);
              }
            }}
            className={[
              'flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors border-r border-zinc-800 last:border-0',
              step === s
                ? 'bg-zinc-800 text-white'
                : s < step || (s === 2 && hook) || (s === 3 && hook && characterUrl)
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer'
                : 'text-zinc-600 cursor-default',
            ].join(' ')}
          >
            {(s === 2 && hook && step > 2) || (s === 3 && characterUrl && step === 3) ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <span
                className={[
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                  step === s ? 'bg-white text-black' : 'bg-zinc-700 text-zinc-400',
                ].join(' ')}
              >
                {s}
              </span>
            )}
            {STEP_LABELS[s]}
          </button>
        ))}
      </div>

      {/* State summary bar */}
      {(hook || characterUrl) && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-zinc-900 border border-zinc-800 px-5 py-3">
          {hook && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-zinc-500 shrink-0">Hook:</span>
              <span className="text-xs text-white truncate max-w-[280px]">{hook}</span>
              <button
                onClick={() => { setHook(''); setStep(1); }}
                className="text-xs text-zinc-600 hover:text-zinc-400 shrink-0"
              >
                ×
              </button>
            </div>
          )}
          {characterUrl && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Character:</span>
              <img src={characterUrl} alt="character" className="w-7 h-10 rounded object-cover" />
              <button
                onClick={() => { setCharacterUrl(''); if (step === 3) setStep(2); }}
                className="text-xs text-zinc-600 hover:text-zinc-400"
              >
                ×
              </button>
            </div>
          )}
          {hook && characterUrl && step === 2 && (
            <button
              onClick={goToVideoStep}
              className="ml-auto rounded-lg bg-white px-4 py-1.5 text-xs font-medium text-black hover:bg-zinc-100 transition-colors"
            >
              Proceed to video →
            </button>
          )}
        </div>
      )}

      {/* Step panels */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
        {step === 1 && (
          <ResearchPanel token={token} onHookSelected={handleHookSelected} />
        )}
        {step === 2 && (
          <CharacterPanel token={token} onCharacterSelected={handleCharacterSelected} />
        )}
        {step === 3 && (
          <VideoPanel token={token} hook={hook} characterUrl={characterUrl} />
        )}
      </div>
    </div>
  );
}
