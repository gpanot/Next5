'use client';

import { useState } from 'react';
import { AppButton } from '../../ui/AppButton';
import { ChipGroup } from '../../ui/Chip';
import { StepCard } from './StepCard';
import { stepError, type StepProps } from './types';

const BUSINESS_TYPES = [
  { value: 'solo_realtor', label: 'Solo Realtor (1)' },
  { value: 'small_agency', label: 'Small Agency (2-5)' },
  { value: 'established_agency', label: 'Established Agency (>5)' },
  { value: 'marketing_agency', label: 'Marketing Agency' },
] as const;

const LISTING_COUNTS = [
  { value: '1_5', label: '1 to 5' },
  { value: '5_10', label: '5 to 10' },
  { value: '10_plus', label: 'More than 10' },
] as const;

const Question = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-3">
    <p className="text-[14px] font-medium text-app-ink">{label}</p>
    {children}
  </div>
);

/** Brand (realtor) version of the role step: business type + how many listings at a time. */
export const RealtorRoleStep = ({ me, advance }: StepProps) => {
  const ws = me.workspace as (typeof me.workspace & { obRole?: string | null; listingCount?: string | null }) | null;
  const [role, setRole] = useState(ws?.obRole ?? '');
  const [listings, setListings] = useState(ws?.listingCount ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canContinue = Boolean(role && listings);

  const submit = async () => {
    if (!canContinue) return;
    setBusy(true);
    setError(null);
    try {
      await advance(4, { data: { role, listingCount: listings } });
    } catch (err) {
      setError(stepError(err, 'Could not save. Try again.'));
      setBusy(false);
    }
  };

  return (
    <StepCard
      title="What describes you best?"
      sub="Two quick taps. We size your videos to your business."
      footer={<AppButton size="lg" disabled={!canContinue} loading={busy} onClick={submit}>Continue</AppButton>}
    >
      <div className="flex flex-col gap-6">
        <Question label="Who are you?">
          <ChipGroup options={BUSINESS_TYPES} value={role} onChange={(v) => setRole(String(v))} />
        </Question>
        <Question label="How many listings do you usually have?">
          <ChipGroup options={LISTING_COUNTS} value={listings} onChange={(v) => setListings(String(v))} />
        </Question>
      </div>
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
    </StepCard>
  );
};
