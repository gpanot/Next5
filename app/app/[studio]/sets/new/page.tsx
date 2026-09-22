'use client';

import { InfluencerWizard } from '../../../../../src/components/app/sets/InfluencerWizard';
import { SetEditor } from '../../../../../src/components/app/sets/SetEditor';
import { AppPage } from '../../../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../../../src/components/app/shell/WorkspaceProvider';

export default function NewSetPage() {
  const { product } = useWorkspace();
  if (product === 'brand') {
    return <AppPage title="New influencer"><InfluencerWizard /></AppPage>;
  }
  return <AppPage title="Add shop look"><SetEditor /></AppPage>;
}
