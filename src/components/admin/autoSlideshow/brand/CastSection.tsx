'use client';

import { useMemo } from 'react';
import { createWorkspaceLabClient } from '../../../labs/labClient';
import { BrandCast } from './BrandCast';

/** The Brand page's cast section: the people who appear in the brand's slideshows. */
export function CastSection({ token, workspaceId }: { token: string; workspaceId: string }) {
  const client = useMemo(() => createWorkspaceLabClient(token, workspaceId), [token, workspaceId]);
  return (
    <section aria-labelledby="brand-cast-title" className="space-y-3">
      <div className="space-y-0.5">
        <h2 id="brand-cast-title" className="text-sm font-bold text-app-ink">Your brand cast</h2>
        <p className="text-sm text-app-muted">The people in your slideshows. Don’t like a face? Swap it.</p>
      </div>
      <BrandCast client={client} path="/brand-cast" />
    </section>
  );
}
