'use client';

import { CampaignsList } from '../../../../src/components/app/automation/CampaignsList';
import { AppPage } from '../../../../src/components/app/shell/AppShell';

export default function AutomationsPage() {
  return (
    <AppPage title="Campaigns">
      <CampaignsList />
    </AppPage>
  );
}
