'use client';

import { CreditsSection } from './CreditsSection';

/** Wide screens' Credits page (the sidebar's Credits): the same section as Settings › Credits on phones. */
export function CreditsPage({ token, workspaceId }: { token: string; workspaceId: string }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <h1 className="font-heading text-3xl font-normal text-app-ink">Credits</h1>
      <CreditsSection token={token} workspaceId={workspaceId} />
    </div>
  );
}
