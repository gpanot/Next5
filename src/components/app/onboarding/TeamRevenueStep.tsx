'use client';

import { useState } from 'react';
import { AppButton } from '../../ui/AppButton';
import { ChipGroup } from '../../ui/Chip';
import { StepCard } from './StepCard';
import { stepError, type StepProps } from './types';

const TEAM_SIZES = [
  { value: 'just_me', label: 'Just me' },
  { value: '2_5', label: '2–5' },
  { value: '6_10', label: '6–10' },
  { value: '11_20', label: '11–20' },
  { value: '21_50', label: '21–50' },
  { value: '50_plus', label: '50+' },
] as const;

const REVENUES = [
  { value: 'pre_revenue', label: 'Pre-revenue' },
  { value: '1_1k', label: '$1–$1,000' },
  { value: '1k_10k', label: '$1k–$10k' },
  { value: '10k_50k', label: '$10k–$50k' },
  { value: '50k_500k', label: '$50k–$500k' },
  { value: '500k_plus', label: '$500k+' },
] as const;

export const TeamRevenueStep = ({ advance }: StepProps) => {
  const [teamSize, setTeamSize] = useState('');
  const [monthlyRevenue, setMonthlyRevenue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canContinue = Boolean(teamSize && monthlyRevenue);

  const submit = async () => {
    if (!canContinue) return;
    setBusy(true);
    setError(null);
    try {
      await advance(3, { data: { teamSize, monthlyRevenue } });
    } catch (err) {
      setError(stepError(err, 'Could not save. Try again.'));
      setBusy(false);
    }
  };

  return (
    <StepCard
      title="Tell us about yourself"
      sub="This helps us tailor recommendations to your stage."
      footer={<AppButton size="lg" disabled={!canContinue} loading={busy} onClick={submit}>Continue</AppButton>}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-[14px] font-medium text-app-ink">How big is your current team?</p>
          <ChipGroup options={TEAM_SIZES} value={teamSize} onChange={(v) => setTeamSize(String(v))} />
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-[14px] font-medium text-app-ink">What is your current monthly revenue?</p>
          <ChipGroup options={REVENUES} value={monthlyRevenue} onChange={(v) => setMonthlyRevenue(String(v))} />
        </div>
      </div>
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
    </StepCard>
  );
};
