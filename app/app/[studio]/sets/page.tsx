'use client';

import { SetsList } from '../../../../src/components/app/sets/SetsList';
import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../../src/components/app/shell/WorkspaceProvider';

export default function SetsPage() {
  const { product } = useWorkspace();
  return <AppPage title={product === 'shop' ? 'Shop looks' : 'Sets'}><SetsList /></AppPage>;
}
