'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { studioHref } from '../../../lib/studioPaths';
import { AppButton } from '../../ui/AppButton';
import { StepCard } from './StepCard';
import { stepError, type StepProps } from './types';

const TESTIMONIALS = [
  {
    outcome: '41K views on one listing',
    quote: 'I post a video every day now and I never film a thing. My new listing got 41,000 views, and 3 buyers called me that week.',
    name: 'Jessica R.',
    title: 'Solo Realtor · Austin, TX',
    avatar: '/images/business/us/testimonials/realtor-jessica.jpg',
  },
  {
    outcome: '6 listing appointments in month 1',
    quote: 'Our team went from posting twice a month to every day. We booked 6 listing appointments from DMs in the first month.',
    name: 'Marcus W.',
    title: 'Team Lead · Small Agency, Atlanta',
    avatar: '/images/business/us/testimonials/realtor-marcus.jpg',
  },
  {
    outcome: '2 listings won over big brokers',
    quote: 'Every listing gets its own video the day it goes live. Sellers see it in the pitch, and it helped us win 2 listings over bigger brokers.',
    name: 'Elena G.',
    title: 'Agency Owner · Phoenix, AZ',
    avatar: '/images/business/us/testimonials/realtor-elena.jpg',
  },
] as const;

const Stars = () => (
  <div className="flex gap-0.5" aria-label="5 stars">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} aria-hidden className="h-3.5 w-3.5 fill-app-accent text-app-accent" />
    ))}
  </div>
);

type Testimonial = (typeof TESTIMONIALS)[number];

const TestimonialCard = ({ t }: { t: Testimonial }) => (
  <div className="flex flex-col gap-3 rounded-2xl bg-app-sunken p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[15px] font-semibold text-app-ink">{t.outcome}</p>
      <Stars />
    </div>
    <p className="text-[14px] leading-relaxed text-app-ink">“{t.quote}”</p>
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={t.avatar} alt={t.name} width={40} height={40} loading="lazy" className="h-10 w-10 rounded-full object-cover" />
      <div>
        <p className="text-[13px] font-semibold text-app-ink">{t.name}</p>
        <p className="text-[12px] text-app-muted">{t.title}</p>
      </div>
    </div>
  </div>
);

/** Brand (realtor) reviews screen. Last onboarding screen: it finishes onboarding and opens the studio. */
export const RealtorSocialProofStep = ({ product, advance }: StepProps) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      await advance(9, { completed: true });
      router.push(`${studioHref(product)}?welcome=1`);
    } catch (err) {
      setError(stepError(err, 'Could not continue. Try again.'));
      setBusy(false);
    }
  };

  return (
    <StepCard
      title="Realtors like you are getting seen"
      sub="A new video every day, posted for them. Here’s what changed."
      footer={<AppButton size="lg" loading={busy} onClick={finish}>Continue</AppButton>}
    >
      <div className="flex flex-col gap-4">
        {TESTIMONIALS.map((t) => <TestimonialCard key={t.name} t={t} />)}
      </div>
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
    </StepCard>
  );
};
