'use client';

import { useState } from 'react';
import { AppButton } from '../../ui/AppButton';
import { ChipGroup } from '../../ui/Chip';
import { StepCard } from './StepCard';
import { stepError, type StepProps } from './types';

const SOURCES = [
  { value: 'x_twitter', label: 'X (Twitter)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'google', label: 'Google' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'referral', label: 'Friend / Referral' },
  { value: 'other', label: 'Other' },
] as const;

export const AttributionStep = ({ advance }: StepProps) => {
  const [attribution, setAttribution] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await advance(6, { data: { attribution } });
    } catch (err) {
      setError(stepError(err, 'Could not save. Try again.'));
      setBusy(false);
    }
  };

  return (
    <StepCard
      title="How did you hear about us?"
      footer={<AppButton size="lg" loading={busy} onClick={submit}>{attribution.length === 0 ? 'Skip' : 'Continue'}</AppButton>}
    >
      <ChipGroup
        options={SOURCES}
        value={attribution}
        onChange={(v) => setAttribution(v as string[])}
        multi
      />
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
    </StepCard>
  );
};
