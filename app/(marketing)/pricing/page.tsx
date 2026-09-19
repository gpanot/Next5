import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PricingExplorer } from '../../../src/components/marketing/pricing/PricingExplorer';
import { TopupsRow } from '../../../src/components/marketing/pricing/TopupsRow';
import { FaqAccordion } from '../../../src/components/marketing/shared/FaqAccordion';
import { Section } from '../../../src/components/marketing/shared/Section';
import { StepsGrid } from '../../../src/components/marketing/shared/StepsGrid';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { PRICING } from '../../../src/content/business/marketing';

export const metadata: Metadata = {
  title: 'Next5 Pricing — Plans from $29 a month',
  description: 'Simple prepaid plans for realtors and TikTok Shop sellers. Photos and UGC videos every month. Pay by bank transfer for 1, 3 or 6 months. No auto-charge.',
};

export default function PricingPage() {
  return (
    <>
      <Section title={PRICING.title} sub={PRICING.sub} align="center" className="pb-10 sm:pb-12">
        <Suspense fallback={<div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>}>
          <PricingExplorer />
        </Suspense>
      </Section>
      <Section className="pt-0 sm:pt-0"><div className="mx-auto max-w-4xl"><TopupsRow /></div></Section>
      <Section tone="sunken" eyebrow="How billing works" title="Pay by QR. Get photos every month."><StepsGrid steps={PRICING.billingSteps} /></Section>
      <Section eyebrow="FAQ" title="Billing questions." align="center"><FaqAccordion items={PRICING.faq} /></Section>
    </>
  );
}
