'use client';

import { use } from 'react';
import { BatchView } from '../../../../../src/components/app/batches/BatchView';
import { AppPage } from '../../../../../src/components/app/shell/AppShell';

export default function BatchPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = use(params);
  return (
    <AppPage title="Photos">
      <BatchView batchId={batchId} />
    </AppPage>
  );
}
