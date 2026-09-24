'use client';

/**
 * The three answers the Template Engine matches on.
 *
 * `audienceType` is asked at signup; this is where she corrects it. The two lines below it are
 * what a campaign defaults to when she does not write her own — so they are worth getting right
 * once, rather than retyping every week.
 */
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import type { ProductLineDto } from '../../../types/business/me';
import { AppButton } from '../../ui/AppButton';
import { ChipGroup } from '../../ui/Chip';
import { Field } from '../../ui/Field';
import { TextInput } from '../../ui/TextInput';

const AUDIENCE_OPTIONS = [
  { value: 'b2c', label: 'People (consumers)' },
  { value: 'b2b', label: 'Other businesses' },
  { value: 'both', label: 'Both' },
] as const;

type Props = {
  product: ProductLineDto | null;
  audienceType: string | null;
  promoting: string | null;
  offer: string | null;
};

export const BusinessProfileSection = ({ product, audienceType, promoting, offer }: Props) => {
  const [audience, setAudience] = useState(audienceType ?? '');
  const [promotingText, setPromotingText] = useState(promoting ?? '');
  const [offerText, setOfferText] = useState(offer ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync local state when extraction fills in empty fields from the website
  // (only overwrites if the field was blank — never clobbers user edits)
  useEffect(() => {
    if (!audience && audienceType) setAudience(audienceType);
  }, [audienceType]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!promotingText && promoting) setPromotingText(promoting);
  }, [promoting]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!offerText && offer) setOfferText(offer);
  }, [offer]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty =
    audience !== (audienceType ?? '') ||
    promotingText !== (promoting ?? '') ||
    offerText !== (offer ?? '');

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/app/workspace/business-profile', {
        method: 'PATCH',
        json: { product, audienceType: audience || undefined, promoting: promotingText, offer: offerText },
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-app-line bg-app-surface p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-semibold text-app-ink">Your business</h2>
        <p className="text-[13px] text-app-muted">We use this to pick which content ideas to suggest.</p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[14px] font-medium text-app-ink">Who do you sell to?</p>
        <ChipGroup
          options={AUDIENCE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={audience}
          onChange={(v) => {
            setAudience(String(v));
            setSaved(false);
          }}
        />
      </div>

      <Field label="What are you promoting?" htmlFor="brand-promoting" helper="One line — what your business or product is">
        <TextInput
          id="brand-promoting"
          value={promotingText}
          onChange={(e) => {
            setPromotingText(e.target.value);
            setSaved(false);
          }}
          placeholder="Mobile mechanic serving South Austin"
        />
      </Field>

      <Field label="What should people know?" htmlFor="brand-offer" helper="One line — the reason they should pick you">
        <TextInput
          id="brand-offer"
          value={offerText}
          onChange={(e) => {
            setOfferText(e.target.value);
            setSaved(false);
          }}
          placeholder="Same-day repairs at your driveway, no tow needed"
        />
      </Field>

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <AppButton size="sm" disabled={!dirty} loading={saving} onClick={save}>Save</AppButton>
        {saved && !dirty && <span className="text-[13px] text-app-muted">Saved</span>}
      </div>
    </section>
  );
};
