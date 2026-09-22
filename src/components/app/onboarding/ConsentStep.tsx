'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { INDUSTRIES, SHOP_CATEGORIES } from '../../../content/business/catalog/types';
import { hasRequiredConsents } from '../../../config/consents';
import { apiFetch } from '../../../lib/apiClient';
import { AppButton } from '../../ui/AppButton';
import { Checkbox } from '../../ui/Checkbox';
import { ChipGroup } from '../../ui/Chip';
import { Field } from '../../ui/Field';
import { SkeletonText } from '../../ui/Skeleton';
import { TextInput } from '../../ui/TextInput';
import { StepCard } from './StepCard';
import { stepError, type StepProps } from './types';

export const ConsentStep = ({ product, me, advance }: StepProps) => {
  const alreadyGiven = hasRequiredConsents(product, me.user.consents);
  const skipped = useRef(false);

  // Accepted before (sign-up or the other studio): skip consents but still collect business profile.
  // We intentionally do NOT auto-skip the whole step — we still want businessName + industry.
  // Only skip when the workspace already has a name that isn't just the user's first name,
  // meaning they already went through this step on a previous session.
  const alreadyProfiled = Boolean(me.workspace?.industry);

  useEffect(() => {
    if (!alreadyGiven || !alreadyProfiled || skipped.current) return;
    skipped.current = true;
    void advance(2).catch(() => { skipped.current = false; });
  }, [alreadyGiven, alreadyProfiled, advance]);

  const isBrand = product === 'brand';
  const industryOptions = isBrand ? INDUSTRIES : SHOP_CATEGORIES;

  // Pre-fill from the saved websiteUrl (available after WorkspaceDto includes it).
  // Falls back to filtering workspace.name so old sessions don't show a plain first name.
  const rawSaved = (me.workspace as { websiteUrl?: string | null } & typeof me.workspace)?.websiteUrl ?? me.workspace?.name ?? '';
  const savedUrl = rawSaved.startsWith('http') || rawSaved.includes('.') ? rawSaved : '';
  const [businessName, setBusinessName] = useState(savedUrl);
  const [industry, setIndustry] = useState(me.workspace?.industry ?? '');
  const [terms, setTerms] = useState(false);
  const [labels, setLabels] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consentOk = terms && labels;
  const canContinue = consentOk || alreadyGiven;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!alreadyGiven) {
        const types = ['terms', 'ai_labeling'];
        await apiFetch('/api/app/consents', { method: 'POST', json: { types } });
      }
      await advance(2, {
        data: {
          websiteUrl: businessName.trim() || undefined,
          industry: industry || undefined,
        },
      });
    } catch (err) {
      setError(stepError(err, 'Could not save your choices.'));
      setBusy(false);
    }
  };

  if (alreadyGiven && alreadyProfiled) return <SkeletonText lines={4} />;

  return (
    <StepCard
      title="Your business"
      sub="Tell us about your business and confirm a few things before we start."
      footer={<AppButton size="lg" disabled={!canContinue} loading={busy} onClick={submit}>Agree and continue</AppButton>}
    >
      <div className="flex flex-col gap-6">
        {/* Business profile fields */}
        <div className="flex flex-col gap-4">
          <Field label="Your Website URL" htmlFor="ob-website-url" helper="Optional">
            <TextInput
              id="ob-website-url"
              type="url"
              autoComplete="url"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="https://yourbusiness.com"
            />
          </Field>
          <div className="flex flex-col gap-2">
            <p className="text-[14px] font-medium text-app-ink">{isBrand ? 'What do you do?' : 'What do you sell?'}</p>
            <ChipGroup
              options={industryOptions.map((o) => ({ value: o.id, label: o.label }))}
              value={industry}
              onChange={(v) => setIndustry(String(v))}
            />
          </div>
        </div>

        {/* Consent checkboxes — hidden if already accepted */}
        {!alreadyGiven && (
          <div className="flex flex-col gap-4 border-t border-app-line pt-5">
            <p className="text-[13px] text-app-muted">A couple of things to confirm before we start.</p>
            <Checkbox checked={labels} onChange={setLabels} label={
              <span className="text-[14px] text-app-ink">
                <strong className="font-semibold">I understand my photos are AI-generated.</strong> Every file carries an AI label, and I'll follow platform rules when posting.
              </span>
            } />
            <Checkbox checked={terms} onChange={setTerms} label={
              <span className="text-[14px] text-app-ink">I agree to the Next5 <Link href="/legal/terms" target="_blank" className="text-app-accent underline">Terms</Link>, <Link href="/legal/privacy" target="_blank" className="text-app-accent underline">Privacy Policy</Link> and <Link href="/legal/ai-and-face-data" target="_blank" className="text-app-accent underline">AI & face data</Link> notice.</span>
            } />
          </div>
        )}
      </div>
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
    </StepCard>
  );
};
