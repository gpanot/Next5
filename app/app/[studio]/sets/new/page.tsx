'use client';

import { SetEditor } from '../../../../../src/components/app/sets/SetEditor';
import { AppPage } from '../../../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../../../src/components/app/shell/WorkspaceProvider';

export default function NewSetPage() {
  const { product } = useWorkspace();
  return <AppPage title={product === 'shop' ? 'Add shop look' : 'Add style'}><SetEditor /></AppPage>;
}
