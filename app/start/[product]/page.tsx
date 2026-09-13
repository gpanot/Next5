import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { OnboardingWizard } from '../../../src/components/app/onboarding/OnboardingWizard';
import { BusinessSurface } from '../../../src/components/ui/BusinessSurface';
import { SkeletonText } from '../../../src/components/ui/Skeleton';
import { assertBusinessEnabled } from '../../../src/server/guards';

export const metadata: Metadata = { title: 'Get started — Next5', robots: { index: false } };

export default async function StartPage({ params }: PageProps<'/start/[product]'>) {
  assertBusinessEnabled();
  const { product } = await params;
  if (product !== 'brand' && product !== 'shop') notFound();
  return (
    <BusinessSurface>
      <Suspense fallback={<div className="mx-auto max-w-3xl px-5 py-24"><SkeletonText lines={6} /></div>}>
        <OnboardingWizard product={product} />
      </Suspense>
    </BusinessSurface>
  );
}
