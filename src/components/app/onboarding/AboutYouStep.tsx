'use client';

import { useState } from 'react';
import { hasRequiredConsents } from '../../../config/consents';
import { apiFetch } from '../../../lib/apiClient';
import { AppButton } from '../../ui/AppButton';
import { ChipGroup } from '../../ui/Chip';
import { ConsentChecks } from './ConsentChecks';
import { StepCard } from './StepCard';
import { stepError, type StepProps } from './types';

const POSTING_FREQUENCIES = [
  { value: 'never', label: 'I don’t post yet' },
  { value: 'few_month', label: 'A few times a month' },
  { value: 'weekly', label: 'Once a week' },
  { value: 'few_week', label: 'A few times a week' },
  { value: 'daily', label: 'Every day' },
] as const;

const STRUGGLES = [
  { value: 'no_time', label: 'No time to make content' },
  { value: 'no_ideas', label: 'I run out of ideas' },
  { value: 'camera_shy', label: 'I don’t like being on camera' },
  { value: 'low_views', label: 'My posts get few views' },
  { value: 'no_leads', label: 'Views don’t turn into leads' },
  { value: 'editing', label: 'Editing is hard' },
  { value: 'consistency', label: 'Hard to stay consistent' },
] as const;

const EXPECTATIONS = [
  { value: 'more_attention', label: 'Get more attention' },
  { value: 'more_leads', label: 'Get more leads' },
  { value: 'more_listings', label: 'Win more listings' },
  { value: 'save_time', label: 'Save time' },
  { value: 'look_pro', label: 'Look more professional' },
  { value: 'stay_consistent', label: 'Post every day' },
] as const;

const Question = ({ label, multi, children }: { label: string; multi?: boolean; children: React.ReactNode }) => (
  <div className="flex flex-col gap-3">
    <p className="text-[14px] font-medium text-app-ink">
      {label}{multi && <span className="font-normal text-app-muted"> (pick all that apply)</span>}
    </p>
    {children}
  </div>
);

/**
 * Brand (real estate) onboarding: 3 content-habit questions + the required consents.
 * Replaces the old "Your business" and team/revenue steps, so it marks server step 3 done.
 */
export const AboutYouStep = ({ product, me, advance }: StepProps) => {
  const alreadyGiven = hasRequiredConsents(product, me.user.consents);
  const ws = me.workspace as (typeof me.workspace & { postingFrequency?: string | null; contentStruggles?: string[]; contentExpectations?: string[] }) | null;
  const [frequency, setFrequency] = useState(ws?.postingFrequency ?? '');
  const [struggles, setStruggles] = useState<string[]>(ws?.contentStruggles ?? []);
  const [expectations, setExpectations] = useState<string[]>(ws?.contentExpectations ?? []);
  const [terms, setTerms] = useState(false);
  const [labels, setLabels] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answered = Boolean(frequency && struggles.length && expectations.length);
  const canContinue = answered && (alreadyGiven || (terms && labels));

  const submit = async () => {
    if (!canContinue) return;
    setBusy(true);
    setError(null);
    try {
      if (!alreadyGiven) await apiFetch('/api/app/consents', { method: 'POST', json: { types: ['terms', 'ai_labeling'] } });
      await advance(3, {
        data: {
          industry: 'realtor',
          audienceType: 'b2c',
          postingFrequency: frequency,
          contentStruggles: struggles,
          contentExpectations: expectations,
        },
      });
    } catch (err) {
      setError(stepError(err, 'Could not save. Try again.'));
      setBusy(false);
    }
  };

  return (
    <StepCard
      title="Tell us about yourself"
      sub="Three quick taps. We use them to plan your content."
      footer={<AppButton size="lg" disabled={!canContinue} loading={busy} onClick={submit}>{alreadyGiven ? 'Continue' : 'Agree and continue'}</AppButton>}
    >
      <div className="flex flex-col gap-6">
        <Question label="How often do you post on social media?">
          <ChipGroup options={POSTING_FREQUENCIES} value={frequency} onChange={(v) => setFrequency(String(v))} />
        </Question>
        <Question label="What’s hard about your content right now?" multi>
          <ChipGroup options={STRUGGLES} value={struggles} onChange={(v) => setStruggles(v as string[])} multi />
        </Question>
        <Question label="What do you want from Next5?" multi>
          <ChipGroup options={EXPECTATIONS} value={expectations} onChange={(v) => setExpectations(v as string[])} multi />
        </Question>
        {!alreadyGiven && <ConsentChecks labels={labels} terms={terms} onLabels={setLabels} onTerms={setTerms} />}
      </div>
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
    </StepCard>
  );
};
