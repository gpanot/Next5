'use client';

/** Blitz Slideshow, wired to the admin API. The editor lives in src/components/labs/blitzLab. */

import { AdminLabClientProvider } from '../../labs/LabClientProvider';
import { StudioRunProvider } from '../../labs/studio/runs/StudioRunContext';
import { BlitzSlideshowEditor } from '../../labs/blitzLab/BlitzSlideshowEditor';

export function BlitzSlideshowTab({ token }: { token: string }) {
  return (
    <AdminLabClientProvider token={token}>
      {/* Links the lab to Campaign Studio runs: adds the Profile step and IDC niche search. */}
      <StudioRunProvider token={token}>
        <BlitzSlideshowEditor />
      </StudioRunProvider>
    </AdminLabClientProvider>
  );
}
