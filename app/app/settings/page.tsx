'use client';

import { AppPage } from '../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../src/components/app/shell/WorkspaceProvider';
import { SettingsForm } from '../../../src/components/app/settings/SettingsForm';
import { AppButton } from '../../../src/components/ui/AppButton';
import { sessionTokenStore } from '../../../src/lib/localStore';

export default function SettingsPage() {
  const { me, refresh } = useWorkspace();
  const workspace = me?.workspace;
  return (
    <AppPage title="Settings">
      {me && workspace && <SettingsForm key={workspace.id} me={{ ...me, workspace }} onSaved={refresh} />}
      <div className="flex justify-center border-t border-app-line pt-6">
        <AppButton variant="ghost" onClick={() => sessionTokenStore.set(null)}>Sign out</AppButton>
      </div>
    </AppPage>
  );
}
