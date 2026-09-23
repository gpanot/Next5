'use client';

/**
 * Step 2 — what to say. Both lines default from Brand; switching to Customize scopes the change
 * to this campaign only, so a "sell 10mm plate this week" push never rewrites her positioning.
 */
import { Field } from '../../../ui/Field';
import { SegmentedControl } from '../../../ui/SegmentedControl';
import { Textarea } from '../../../ui/Textarea';
import { TextInput } from '../../../ui/TextInput';

type Props = {
  brandPromoting: string | null;
  brandOffer: string | null;
  subject: string | null;
  message: string | null;
  useBrandSubject: boolean;
  useBrandMessage: boolean;
  promo: string | null;
  notes: string | null;
  onChange: (patch: Record<string, unknown>) => void;
};

const SOURCE_OPTIONS = [
  { value: 'brand', label: 'Use Brand info' },
  { value: 'custom', label: 'Customize' },
] as const;

const BrandLine = ({ value }: { value: string | null }) => (
  <p className="rounded-xl border border-app-line bg-app-sunken px-3 py-2.5 text-[13px] text-app-muted">
    {value?.trim() ? value : 'Nothing saved in Brand yet — switch to Customize.'}
  </p>
);

export function CampaignStep({
  brandPromoting, brandOffer, subject, message, useBrandSubject, useBrandMessage, promo, notes, onChange,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[15px] font-medium text-app-ink">What are we promoting?</p>
          <SegmentedControl
            options={SOURCE_OPTIONS}
            value={useBrandSubject ? 'brand' : 'custom'}
            onChange={(v) => onChange({ useBrandSubject: v === 'brand' })}
          />
        </div>
        {useBrandSubject ? (
          <BrandLine value={brandPromoting} />
        ) : (
          <TextInput
            value={subject ?? ''}
            onChange={(e) => onChange({ campaignSubject: e.target.value })}
            placeholder="10mm steel plate, ready to cut this week"
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[15px] font-medium text-app-ink">What should people know?</p>
          <SegmentedControl
            options={SOURCE_OPTIONS}
            value={useBrandMessage ? 'brand' : 'custom'}
            onChange={(v) => onChange({ useBrandMessage: v === 'brand' })}
          />
        </div>
        {useBrandMessage ? (
          <BrandLine value={brandOffer} />
        ) : (
          <TextInput
            value={message ?? ''}
            onChange={(e) => onChange({ campaignMessage: e.target.value })}
            placeholder="Cut to size, same day, no minimum order"
          />
        )}
      </div>

      <Field label="Special offer" htmlFor="campaign-promo" helper="Optional — only for this campaign">
        <TextInput
          id="campaign-promo"
          value={promo ?? ''}
          onChange={(e) => onChange({ promo: e.target.value })}
          placeholder="10% off first order this week"
        />
      </Field>

      <Field label="Anything else we should know?" htmlFor="campaign-notes" helper="Optional">
        <Textarea
          id="campaign-notes"
          rows={3}
          value={notes ?? ''}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Closed Friday. Don't mention pricing."
        />
      </Field>
    </div>
  );
}
