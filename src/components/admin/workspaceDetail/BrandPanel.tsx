'use client';

import type { WorkspaceBrandDto } from '../../../types/admin/workspaceDetail';
import { useAdminApi } from '../business/useAdminApi';
import { JsonTree } from './JsonTree';
import { PanelEmpty, PanelError, PanelSkeleton, Section } from './PanelStates';

const day = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const hasData = (v: unknown) => v !== null && v !== undefined && !(typeof v === 'object' && Object.keys(v).length === 0);

/** Every brand extraction of the workspace, in full: company profiles (with source and confidence), signup extract, run profile. */
export function BrandPanel({ token, workspaceId }: { token: string; workspaceId: string }) {
  const { data, error, refresh } = useAdminApi<WorkspaceBrandDto>(token, `/api/admin/workspaces/${workspaceId}/brand`);
  if (error) return <PanelError message={error} onRetry={refresh} />;
  if (!data) return <PanelSkeleton />;
  const empty = data.profiles.length === 0 && !hasData(data.brandExtract) && !data.runProfile;
  if (empty) return <PanelEmpty>No brand extraction yet. It runs when the user adds their website.</PanelEmpty>;

  return (
    <div className="space-y-4">
      {data.profiles.map((p) => (
        <Section key={p.id} title={`Company profile · ${p.sourceUrl}`} meta={`v${p.version} · ${day(p.createdAt)}`}>
          <JsonTree data={p.data} />
          {hasData(p.crawl) && (
            <details className="mt-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
              <summary className="cursor-pointer text-xs font-semibold text-muted">Crawl telemetry</summary>
              <div className="mt-2"><JsonTree data={p.crawl} /></div>
            </details>
          )}
        </Section>
      ))}
      {data.runProfile && (
        <Section title="Latest run profile" meta={`run ${data.runProfile.runId}`}>
          <JsonTree data={data.runProfile.profile} />
        </Section>
      )}
      {hasData(data.brandExtract) && (
        <Section title="Signup brand extract" meta={data.brandExtractAt ? day(data.brandExtractAt) : undefined}>
          <JsonTree data={data.brandExtract} />
        </Section>
      )}
    </div>
  );
}
