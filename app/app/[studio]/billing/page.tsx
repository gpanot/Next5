'use client';

import { BillingView } from '../../../../src/components/app/billing/BillingView';
import { AppPage } from '../../../../src/components/app/shell/AppShell';

export default function BillingPage() {
  return (
    <AppPage title="Billing">
      <BillingView />
    </AppPage>
  );
}
