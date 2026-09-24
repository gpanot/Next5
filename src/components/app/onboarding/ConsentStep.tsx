'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { INDUSTRIES, SHOP_CATEGORIES } from '../../../content/business/catalog/types';
import { hasRequiredConsents } from '../../../config/consents';
import { apiFetch } from '../../../lib/apiClient';
import { onboardingWebsiteStore } from '../../../lib/localStore';
import { AppButton } from '../../ui/AppButton';
import { Checkbox } from '../../ui/Checkbox';
import { ChipGroup } from '../../ui/Chip';
import { SkeletonText } from '../../ui/Skeleton';
import { StepCard } from './StepCard';
import { stepError, type StepProps } from './types';

/** Kept in the same words a business owner would use, not b2c/b2b jargon. */
const AUDIENCE_OPTIONS = [
  { value: 'b2c', label: 'People (consumers)' },
  { value: 'b2b', label: 'Other businesses' },
  { value: 'both', label: 'Both' },
] as const;

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
  // Falls back to the URL the user typed in step 1 (persisted in onboardingWebsiteStore).
  const rawSaved = (me.workspace as { websiteUrl?: string | null } & typeof me.workspace)?.websiteUrl ?? me.workspace?.name ?? '';
  const savedUrl = rawSaved.startsWith('http') || rawSaved.includes('.') ? rawSaved : '';
  const storedUrl = onboardingWebsiteStore.get() ?? '';
  const [businessName, setBusinessName] = useState(savedUrl || storedUrl);
  const [industry, setIndustry] = useState(me.workspace?.industry ?? '');
  // Who she sells to. The Template Engine's first filter, so a steel trader is never
  // offered a template written for walk-in consumers (and the reverse).
  const [audienceType, setAudienceType] = useState(me.workspace?.audienceType ?? '');
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
          audienceType: audienceType || undefined,
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
          <div className="flex flex-col gap-2">
            <p className="text-[14px] font-medium text-app-ink">{isBrand ? 'What do you do?' : 'What do you sell?'}</p>
            <ChipGroup
              options={industryOptions.map((o) => ({ value: o.id, label: o.label }))}
              value={industry}
              onChange={(v) => setIndustry(String(v))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[14px] font-medium text-app-ink">Who do you sell to?</p>
            <ChipGroup
              options={AUDIENCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={audienceType}
              onChange={(v) => setAudienceType(String(v))}
            />
            <p className="text-[13px] text-app-muted">This decides which content ideas we suggest. You can change it later.</p>
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
