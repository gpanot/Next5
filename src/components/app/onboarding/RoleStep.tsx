'use client';

import { useState } from 'react';
import { AppButton } from '../../ui/AppButton';
import { ChipGroup } from '../../ui/Chip';
import { StepCard } from './StepCard';
import { stepError, type StepProps } from './types';

const ROLES = [
  { value: 'founder', label: 'Founder' },
  { value: 'agency_owner', label: 'Agency Owner' },
  { value: 'realtor', label: 'Realtor' },
  { value: 'coach', label: 'Coach' },
  { value: 'content_creator', label: 'Content Creator' },
  { value: 'marketing_manager', label: 'Marketing Manager' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'other', label: 'Other' },
] as const;

export const RoleStep = ({ advance }: StepProps) => {
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!role) return;
    setBusy(true);
    setError(null);
    try {
      await advance(4, { data: { role } });
    } catch (err) {
      setError(stepError(err, 'Could not save. Try again.'));
      setBusy(false);
    }
  };

  return (
    <StepCard
      title="What describes you best?"
      sub="We'll customize your experience based on your role."
      footer={<AppButton size="lg" disabled={!role} loading={busy} onClick={submit}>Continue</AppButton>}
    >
      <ChipGroup options={ROLES} value={role} onChange={(v) => setRole(String(v))} />
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
    </StepCard>
  );
};
