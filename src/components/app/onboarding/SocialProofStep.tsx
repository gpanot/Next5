'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { AppButton } from '../../ui/AppButton';
import { StepCard } from './StepCard';
import { stepError, type StepProps } from './types';

const TESTIMONIALS = [
  {
    quote: 'Next5 cut our content production time by 80%. We went from spending days on photos to having a full month of posts ready in under an hour.',
    name: 'Sarah M.',
    handle: '@sarahm.realty',
    title: 'Real Estate Agent',
  },
  {
    quote: 'The quality is incredible — clients actually ask me which photographer I use. The answer is "AI + 5 minutes of my time."',
    name: 'James T.',
    handle: '@jamestcreative',
    title: 'Brand Founder',
  },
  {
    quote: 'I was skeptical at first, but my engagement doubled in the first month. The photos look exactly like me, just in perfect lighting every time.',
    name: 'Linh N.',
    handle: '@linhn.boutique',
    title: 'Shop Owner',
  },
] as const;

const Stars = () => (
  <div className="flex gap-0.5" aria-label="5 stars">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} aria-hidden className="h-4 w-4 fill-app-accent text-app-accent" />
    ))}
  </div>
);

export const SocialProofStep = ({ me, advance }: StepProps) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await advance(8);
    } catch (err) {
      setError(stepError(err, 'Could not continue. Try again.'));
      setBusy(false);
    }
  };

  return (
    <StepCard
      title={`Loved by ${me.workspace?.industry ? 'businesses' : 'creators'} like you`}
      sub="Here's what our members say."
      footer={<AppButton size="lg" loading={busy} onClick={submit}>Continue</AppButton>}
    >
      <div className="flex flex-col gap-4">
        {TESTIMONIALS.map((t) => (
          <div key={t.handle} className="flex flex-col gap-3 rounded-2xl bg-app-sunken p-4 sm:p-5">
            <Stars />
            <p className="text-[14px] leading-relaxed text-app-ink">"{t.quote}"</p>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-app-line text-[12px] font-semibold text-app-ink">
                {t.name[0]}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-app-ink">{t.name}</p>
                <p className="text-[12px] text-app-muted">{t.handle} · {t.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
    </StepCard>
  );
};
