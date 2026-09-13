'use client';

import { AppPage } from '../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../src/components/app/shell/WorkspaceProvider';
import { SettingsForm } from '../../../src/components/app/settings/SettingsForm';

export default function SettingsPage() {
  const { me, refresh } = useWorkspace();
  const workspace = me?.workspace;
  return (
    <AppPage title="Settings">
      {me && workspace && <SettingsForm key={workspace.id} me={{ ...me, workspace }} onSaved={refresh} />}
    </AppPage>
  );
}
