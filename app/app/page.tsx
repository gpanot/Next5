'use client';

import { DashboardView } from '../../src/components/app/dashboard/DashboardView';
import { AppPage } from '../../src/components/app/shell/AppShell';

export default function AppHomePage() {
  return (
    <AppPage title="Home">
      <DashboardView />
    </AppPage>
  );
}
