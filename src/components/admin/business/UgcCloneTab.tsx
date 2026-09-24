'use client';

/** UGC Clone, wired to the admin API. The editor itself lives in src/components/labs/ugcClone. */

import { AdminLabClientProvider } from '../../labs/LabClientProvider';
import { UgcCloneEditor } from '../../labs/ugcClone/UgcCloneEditor';

export function UgcCloneTab({ token }: { token: string }) {
  return (
    <AdminLabClientProvider token={token}>
      <UgcCloneEditor />
    </AdminLabClientProvider>
  );
}
