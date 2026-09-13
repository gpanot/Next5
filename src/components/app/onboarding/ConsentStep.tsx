'use client';

import { useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import { AppButton } from '../../ui/AppButton';
import { Checkbox } from '../../ui/Checkbox';
import { StepCard } from './StepCard';
import { stepError, type StepProps } from './types';

export const ConsentStep = ({ product, advance }: StepProps) => {
  const [terms, setTerms] = useState(false);
  const [face, setFace] = useState(false);
  const [labels, setLabels] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const faceRequired = product === 'brand';
  const canContinue = terms && labels && (!faceRequired || face);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const types = ['terms', 'ai_labeling', ...(face ? ['face_processing'] : [])];
      await apiFetch('/api/app/consents', { method: 'POST', json: { types } });
      await advance(2);
    } catch (err) {
      setError(stepError(err, 'Could not save your choices.'));
      setBusy(false);
    }
  };

  return (
    <StepCard
      title="A few things before we start"
      sub="We take your photos and your face seriously. Here is exactly what we do."
      footer={<AppButton size="lg" disabled={!canContinue} loading={busy} onClick={submit}>Agree and continue</AppButton>}
    >
      <div className="flex flex-col gap-5">
        <Checkbox checked={face} onChange={setFace} label={
          <span className="text-[14px] text-app-ink">
            <strong className="font-semibold">These are photos of me.</strong> I agree that Next5 processes my face to create my photos. {faceRequired ? '' : '(Only needed if you’ll wear the products yourself.)'}
            <span className="block text-app-muted">Used only to create your photos, never to train AI models. Delete them anytime.</span>
          </span>
        } />
        <Checkbox checked={labels} onChange={setLabels} label={
          <span className="text-[14px] text-app-ink">
            <strong className="font-semibold">I understand my photos are AI-generated.</strong> Every file carries an AI label, and I’ll follow platform rules when posting.
          </span>
        } />
        <Checkbox checked={terms} onChange={setTerms} label={
          <span className="text-[14px] text-app-ink">I agree to the Next5 Terms and Privacy Policy.</span>
        } />
        {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
      </div>
    </StepCard>
  );
};
