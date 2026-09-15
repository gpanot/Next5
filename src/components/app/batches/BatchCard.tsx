import { AppLink as Link } from '../shell/AppLink';
import { formatRelative } from '../../../lib/dates';
import type { BatchSummaryDto } from '../../../types/business/batches';
import { Badge } from '../../ui/Badge';

const statusBadge = (batch: BatchSummaryDto) => {
  if (batch.status === 'queued' || batch.status === 'generating') {
    return <Badge tone="info">{batch.progress.ready} of {batch.progress.total} ready</Badge>;
  }
  if (batch.status === 'failed') return <Badge tone="danger">Failed</Badge>;
  return <Badge tone="success">{batch.progress.ready} photos</Badge>;
};

export const BatchCard = ({ batch }: { batch: BatchSummaryDto }) => (
  <Link href={`/app/batches/${batch.id}`} className="group flex flex-col overflow-hidden rounded-2xl border border-app-line bg-app-panel shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent">
    <div className="relative aspect-[4/3] bg-app-sunken">
      {batch.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
        <img src={batch.coverUrl} alt={`Cover of ${batch.name}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" loading="lazy" />
      )}
      {!batch.coverUrl && (
        <div className="absolute inset-0 flex items-center justify-center text-[13px] text-app-muted">{batch.status === 'failed' ? 'No photos' : 'Creating…'}</div>
      )}
    </div>
    <div className="flex flex-col gap-1.5 p-4">
      <p className="truncate text-[15px] font-semibold text-app-ink">{batch.name}</p>
      <div className="flex items-center justify-between gap-2">
        {statusBadge(batch)}
        <span className="text-[12px] text-app-muted">{formatRelative(batch.createdAt)}</span>
      </div>
    </div>
  </Link>
);
