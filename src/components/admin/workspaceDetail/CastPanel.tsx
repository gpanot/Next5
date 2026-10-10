'use client';

import { useMemo } from 'react';
import { createAdminLabClient } from '../../labs/labClient';
import { BrandCast } from '../autoSlideshow/brand/BrandCast';

/** The workspace's Brand Cast as the user sees it on the Brand page, with each person's full look and use count. */
export function CastPanel({ token, workspaceId }: { token: string; workspaceId: string }) {
  const client = useMemo(() => createAdminLabClient(token), [token]);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">The people slideshow photos use as references (least used first). “New face” swaps one, like the user can.</p>
      <BrandCast client={client} path={`/workspaces/${workspaceId}/cast`} detailed />
    </div>
  );
}
