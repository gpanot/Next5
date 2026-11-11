'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { InfluencerDto } from '../../../types/business/influencers';
import { Card, CardBody } from '../../ui/Card';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonText } from '../../ui/Skeleton';
import { ArchiveInfluencerDialog } from '../sets/influencers/ArchiveInfluencerDialog';
import { useInfluencers } from '../sets/influencers/useInfluencers';
import { AppLink } from '../shell/AppLink';
import { DeleteFaceDialog } from './DeleteFaceDialog';
import { FaceRow, ROW_BUTTON } from './FaceRow';

/** Compact "Me" for realtors: the faces that sign off posts, with add, expand, archive, restore and delete. */
export const FacesSection = () => {
  const [archived, setArchived] = useState(false);
  const { data, loading, error, refresh } = useInfluencers(archived ? 'archived' : 'active');
  const [archiving, setArchiving] = useState<InfluencerDto | null>(null);
  const [deleting, setDeleting] = useState<InfluencerDto | null>(null);
  const faces = data?.influencers ?? [];

  return (
    <Card>
      <CardBody className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[16px] font-semibold text-app-ink">Your face</p>
            <p className="text-[13px] text-app-muted">Signs off your posts so viewers know who to call.</p>
          </div>
          <button type="button" onClick={() => setArchived((v) => !v)} className="shrink-0 text-[13px] font-medium text-app-accent transition-colors duration-200 hover:text-app-ink">
            {archived ? 'Show active' : 'Show archived'}
          </button>
        </div>
        {loading && !data ? <SkeletonText lines={2} /> : error && !data ? <ErrorState message={error} onRetry={refresh} /> : (
          <ul className="divide-y divide-app-line">
            {faces.map((f) => (
              <FaceRow key={f.id} influencer={f} archived={archived} onArchive={() => setArchiving(f)} onDelete={() => setDeleting(f)} onChanged={refresh} />
            ))}
            {faces.length === 0 && <li className="py-3 text-[14px] text-app-muted">{archived ? 'No archived faces.' : 'No face yet. Use your own photo, or an AI face.'}</li>}
          </ul>
        )}
        {!archived && (
          <AppLink href="/app/sets/new" className={`${ROW_BUTTON} w-fit`}>
            <Plus aria-hidden className="h-4 w-4" /> Add a face
          </AppLink>
        )}
      </CardBody>
      {archiving && (
        <ArchiveInfluencerDialog influencer={archiving} onClose={() => setArchiving(null)} onArchived={() => { setArchiving(null); refresh(); }} />
      )}
      {deleting && (
        <DeleteFaceDialog influencer={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); refresh(); }} />
      )}
    </Card>
  );
};
