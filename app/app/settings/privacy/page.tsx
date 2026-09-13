'use client';

import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { PrivacyView } from '../../../../src/components/app/settings/PrivacyView';

export default function PrivacyPage() {
  return (
    <AppPage title="Privacy">
      <PrivacyView />
    </AppPage>
  );
}
