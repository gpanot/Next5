'use client';

/** UGC Lab, wired to the admin API. The editor itself lives in src/components/labs/ugcLab. */

import { AdminLabClientProvider } from '../../labs/LabClientProvider';
import { UgcLabEditor } from '../../labs/ugcLab/UgcLabEditor';

export function UgcLabTab({ token }: { token: string }) {
  return (
    <AdminLabClientProvider token={token}>
      <UgcLabEditor />
    </AdminLabClientProvider>
  );
}
