'use client';

import { useState } from 'react';
import type { WorkspaceMatrixDto } from '../../../types/admin/workspaceDetail';
import { MatrixBody } from '../autoSlideshow/matrix/MatrixDialog';
import { useAdminApi } from '../business/useAdminApi';
import { BlitzCardGrid } from './BlitzCardGrid';
import { PanelEmpty, PanelError, PanelSkeleton, Section } from './PanelStates';

type Props = { token: string; workspaceId: string; onOpenRun: (runId: string) => void };

const domainOf = (url: string) => url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');

/** The Slideshow Bank of each website (meats × hooks × CTAs) and the Blitz card grid. */
export function MatrixPanel({ token, workspaceId, onOpenRun }: Props) {
  const { data, error, refresh } = useAdminApi<WorkspaceMatrixDto>(token, `/api/admin/workspaces/${workspaceId}/matrix`);
  const [site, setSite] = useState(0);
  if (error) return <PanelError message={error} onRetry={refresh} />;
  if (!data) return <PanelSkeleton />;
  const bank = data.banks[Math.min(site, data.banks.length - 1)];

  return (
    <div className="space-y-4">
      <Section title="Slideshow matrix" meta={bank?.matrix.builtAt ? `built ${new Date(bank.matrix.builtAt).toLocaleDateString()}` : undefined}>
        {data.banks.length > 1 && (
          <div role="tablist" aria-label="Website" className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {data.banks.map((b, i) => (
              <button key={b.runId} role="tab" aria-selected={b === bank} onClick={() => setSite(i)} className="min-h-10 shrink-0 rounded-full bg-zinc-100 px-4 text-xs font-semibold text-muted transition aria-selected:bg-ink aria-selected:text-white dark:bg-zinc-800 dark:aria-selected:bg-zinc-100 dark:aria-selected:text-zinc-900">
                {domainOf(b.url)}
              </button>
            ))}
          </div>
        )}
        {bank ? <MatrixBody matrix={bank.matrix} runId={bank.runId} onOpen={(use) => onOpenRun(use.runId)} /> : <PanelEmpty>No slideshow run yet, so no matrix.</PanelEmpty>}
      </Section>
      <Section title="Blitz cards" meta={`${data.blitz.total} cards`}>
        <BlitzCardGrid matrix={data.blitz} />
      </Section>
    </div>
  );
}
