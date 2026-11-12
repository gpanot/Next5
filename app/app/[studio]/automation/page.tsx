'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AutomationWizard } from '../../../../src/components/app/automation/AutomationWizard';
import { PlaybookWizard } from '../../../../src/components/app/autopilot/PlaybookWizard';
import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../../src/components/app/shell/WorkspaceProvider';

/** Realtors (brand) get the Autopilot playbooks (their own page frame, steps in the top bar); Shop keeps the original wizard. */
const Wizard = () => {
  const params = useSearchParams();
  const { product } = useWorkspace();
  const id = params.get('id');
  if (!product) return null;
  if (product === 'brand') {
    // A bare visit (sidebar tap) reopens the plan she was in the middle of.
    const resume = !id && ['moment', 'listing', 'date', 'new'].every((k) => !params.has(k));
    return <PlaybookWizard key={id ?? params.toString()} campaignId={id} listingId={params.get('listing')} moment={params.get('moment')} date={params.get('date')} resume={resume} />;
  }
  return (
    <AppPage title="Plan my week">
      <AutomationWizard campaignId={id ?? undefined} />
    </AppPage>
  );
};

export default function AutomationPage() {
  return (
    <Suspense fallback={null}>
      <Wizard />
    </Suspense>
  );
}
