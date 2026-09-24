'use client';

/** UGC Lab, wired to the admin API. The editor itself lives in src/components/labs/ugcLab. */

import { AdminLabClientProvider } from '../../labs/LabClientProvider';
import { StudioRunProvider } from '../../labs/studio/runs/StudioRunContext';
import { UgcLabEditor } from '../../labs/ugcLab/UgcLabEditor';

export function UgcLabTab({ token }: { token: string }) {
  return (
    <AdminLabClientProvider token={token}>
      {/* Links the lab to Campaign Studio runs: adds the Profile step and IDC niche search. */}
      <StudioRunProvider token={token}>
        <UgcLabEditor />
      </StudioRunProvider>
    </AdminLabClientProvider>
  );
}
