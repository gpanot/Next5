'use client';

import { useState } from 'react';
import { AppButton } from '../../ui/AppButton';
import { ChipGroup } from '../../ui/Chip';
import { StepCard } from './StepCard';
import { stepError, type StepProps } from './types';

const INTENTS = [
  { value: 'content_now', label: 'I need content now' },
  { value: 'content_future', label: 'I need content in the future' },
  { value: 'just_curious', label: 'Just curious' },
] as const;

const GOALS = [
  { value: 'save_time', label: 'Save time on content creation' },
  { value: 'more_views', label: 'Get more views on social media' },
  { value: 'drive_traffic', label: 'Drive traffic to my listings/site' },
  { value: 'generate_leads', label: 'Generate leads' },
  { value: 'learn_content', label: 'Learn and become better at content marketing' },
  { value: 'other', label: 'Other' },
] as const;

export const IntentGoalsStep = ({ advance }: StepProps) => {
  const [signupIntent, setSignupIntent] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canContinue = Boolean(signupIntent && goals.length > 0);

  const submit = async () => {
    if (!canContinue) return;
    setBusy(true);
    setError(null);
    try {
      await advance(5, { data: { signupIntent, goals } });
    } catch (err) {
      setError(stepError(err, 'Could not save. Try again.'));
      setBusy(false);
    }
  };

  return (
    <StepCard
      title="Why did you sign up?"
      footer={<AppButton size="lg" disabled={!canContinue} loading={busy} onClick={submit}>Continue</AppButton>}
    >
      <div className="flex flex-col gap-6">
        <ChipGroup options={INTENTS} value={signupIntent} onChange={(v) => setSignupIntent(String(v))} />
        <div className="flex flex-col gap-3">
          <p className="text-[14px] font-medium text-app-ink">What do you expect from the platform? <span className="font-normal text-app-muted">(pick all that apply)</span></p>
          <ChipGroup
            options={GOALS}
            value={goals}
            onChange={(v) => setGoals(v as string[])}
            multi
          />
        </div>
      </div>
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
    </StepCard>
  );
};
