'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AutomationWizard } from '../../../../src/components/app/automation/AutomationWizard';
import { AppPage } from '../../../../src/components/app/shell/AppShell';

const Wizard = () => {
  const id = useSearchParams().get('id') ?? undefined;
  return <AutomationWizard campaignId={id} />;
};

export default function AutomationPage() {
  return (
    <AppPage title="Plan my week">
      <Suspense fallback={null}>
        <Wizard />
      </Suspense>
    </AppPage>
  );
}
