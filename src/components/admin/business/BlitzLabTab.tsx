'use client';

/** Blitz Lab, wired to the admin API. The editor itself lives in src/components/labs/blitzLab. */

import { AdminLabClientProvider } from '../../labs/LabClientProvider';
import { BlitzLabEditor } from '../../labs/blitzLab/BlitzLabEditor';

export function BlitzLabTab({ token }: { token: string }) {
  return (
    <AdminLabClientProvider token={token}>
      <BlitzLabEditor />
    </AdminLabClientProvider>
  );
}
