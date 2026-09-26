'use client';

import { InfluencerWizard } from '../../../../../src/components/app/sets/InfluencerWizard';
import { ShopModelEditor } from '../../../../../src/components/app/sets/models/ShopModelEditor';
import { AppPage } from '../../../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../../../src/components/app/shell/WorkspaceProvider';

export default function NewSetPage() {
  const { product } = useWorkspace();
  if (product === 'brand') {
    return <AppPage title="New influencer"><InfluencerWizard /></AppPage>;
  }
  return <AppPage title="Add a model"><ShopModelEditor /></AppPage>;
}
