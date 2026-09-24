'use client';

import { useState } from 'react';
import { ProfileStep } from './profile/ProfileStep';
import { ResearchStep } from './research/ResearchStep';
import { GenerationStep } from './generation/GenerationStep';
import { CalendarStep } from './calendar/CalendarStep';
import { RunListPanel } from './runs/RunListPanel';
import { useSelectedRunId } from './runs/useSelectedRunId';

// ─── Step pill nav ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'profile', label: 'Profile' },
  { id: 'research', label: 'Research' },
  { id: 'generation', label: 'Generation' },
  { id: 'calendar', label: 'Calendar' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

function StepNav({ current, onChange }: { current: StepId; onChange: (s: StepId) => void }) {
  return (
    <div className="flex gap-1 border-b border-line mb-6">
      {STEPS.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={[
            'flex items-center gap-2 border-b-2 -mb-px px-4 py-3 text-[13px] font-medium transition-colors',
            current === s.id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
          ].join(' ')}
        >
          <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] bg-surface border border-line text-muted font-bold">
            {i + 1}
          </span>
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main editor ───────────────────────────────────────────────────────────────

export function CampaignStudioEditor({ token }: { token: string }) {
  // Shared with UGC Lab and Blitz Slideshow, so the same run stays picked across tabs.
  const [runId, setRunId] = useSelectedRunId();
  const [step, setStep] = useState<StepId>('profile');

  const handleSelectRun = (id: string) => {
    setRunId(id);
    setStep('profile');
  };

  const handleBackToList = () => {
    setRunId(null);
    setStep('profile');
  };

  if (!runId) {
    return (
      <div>
        <h2 className="text-[17px] font-semibold text-ink mb-6">Campaign Studio</h2>
        <RunListPanel token={token} onSelectRun={handleSelectRun} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleBackToList} className="text-[12px] text-muted hover:text-ink">
          ← All runs
        </button>
        <span className="text-[12px] text-muted font-mono">{runId}</span>
      </div>

      <StepNav current={step} onChange={setStep} />

      {step === 'profile'    && <ProfileStep    token={token} runId={runId} onProfileConfirmed={() => setStep('research')} />}
      {step === 'research'   && <ResearchStep   token={token} runId={runId} />}
      {step === 'generation' && <GenerationStep token={token} runId={runId} />}
      {step === 'calendar'   && <CalendarStep   token={token} runId={runId} />}
    </div>
  );
}
