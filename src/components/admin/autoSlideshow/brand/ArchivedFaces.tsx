'use client';

import { ArchiveRestore, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ARCHIVE_DAYS, ARCHIVE_MAX, CAST_SIZE, type BrandCastMemberDto } from '../../../../types/admin/brandCast';
import { Dialog } from '../../../ui/Dialog';
import { CastMemberMedia } from './CastMemberMedia';
import type { ArchiveRequest } from './useBrandCast';

const DAY_MS = 86_400_000;
const button = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-app-line px-3 text-xs font-semibold text-app-ink transition hover:bg-app-sunken active:scale-95 disabled:opacity-40 sm:text-sm';

const firstName = (m: BrandCastMemberDto) => m.name.split(',')[0]!.trim();

const daysLeft = (m: BrandCastMemberDto) => (m.expiresAt ? Math.max(1, Math.ceil((new Date(m.expiresAt).getTime() - Date.now()) / DAY_MS)) : ARCHIVE_DAYS);

type CardProps = { member: BrandCastMemberDto; busy: boolean; onRestore: () => void; onDelete: () => void };

function ArchivedCard({ member, busy, onRestore, onDelete }: CardProps) {
  const days = daysLeft(member);
  return (
    <li className="flex min-w-0 flex-col gap-2">
      <div className="opacity-80 transition hover:opacity-100">
        <CastMemberMedia member={member} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-app-ink">{member.name}</p>
        <p className="text-xs text-app-muted">Deleted in {days} {days === 1 ? 'day' : 'days'}</p>
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={onRestore} disabled={busy} className={`${button} flex-1`}>
          <ArchiveRestore aria-hidden className="h-3.5 w-3.5" /> Use again
        </button>
        <button type="button" onClick={onDelete} disabled={busy} aria-label={`Delete ${member.name}`} className={`${button} w-11 shrink-0 px-0 text-app-danger`}>
          <Trash2 aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

type PickProps = { back: BrandCastMemberDto | null; active: BrandCastMemberDto[]; busy: boolean; error: string | null; onClose: () => void; onPick: (id: string) => void };

/** The cast is full: who goes to the archive so the face can come back? */
function ReplacePicker({ back, active, busy, error, onClose, onPick }: PickProps) {
  const name = back ? firstName(back) : '';
  return (
    <Dialog open={back !== null} onClose={() => !busy && onClose()} title={`Bring back ${name}`} description={`Your cast has ${CAST_SIZE} people. Pick who goes to the archive. You can bring them back too.`}>
      <ul className="space-y-2">
        {active.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => onPick(m.id)} disabled={busy || m.status === 'pending'} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-app-line p-2 text-left transition hover:bg-app-sunken active:scale-[0.98] disabled:opacity-40">
              <span className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-app-sunken">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.imageUrl && <img src={m.imageUrl} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="flex-1 text-sm font-semibold text-app-ink">{m.name}</span>
              <span className="pr-2 text-xs text-app-muted">{m.status === 'pending' ? 'Being made' : 'Swap'}</span>
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-app-danger">{error}</p>}
    </Dialog>
  );
}

type ConfirmProps = { member: BrandCastMemberDto | null; busy: boolean; error: string | null; onClose: () => void; onConfirm: () => void };

function DeleteConfirm({ member, busy, error, onClose, onConfirm }: ConfirmProps) {
  return (
    <Dialog open={member !== null} onClose={() => !busy && onClose()} title={`Delete ${member ? firstName(member) : ''}?`} description="Their photo and intro video are gone for good. You can't undo this.">
      {error && <p role="alert" className="mb-3 text-sm text-app-danger">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-full px-4 text-sm font-semibold text-app-muted transition hover:bg-app-sunken hover:text-app-ink active:scale-95 disabled:opacity-40">Keep</button>
        <button type="button" onClick={onConfirm} disabled={busy} className="min-h-11 rounded-full bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-95 disabled:opacity-40 dark:bg-red-500 dark:hover:bg-red-600">
          {busy ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Dialog>
  );
}

type Props = {
  archived: BrandCastMemberDto[];
  active: BrandCastMemberDto[];
  busy: string | null;
  error: string | null;
  /** True when it worked. */
  onManage: (id: string, request: ArchiveRequest) => Promise<boolean>;
  onClearError: () => void;
};

/** Faces parked by "New face": kept 14 days, 7 at most. "Use again" brings one back (asks who leaves when the cast is
 *  full); the bin deletes one for good. */
export function ArchivedFaces({ archived, active, busy, error, onManage, onClearError }: Props) {
  const [restoring, setRestoring] = useState<BrandCastMemberDto | null>(null);
  const [deleting, setDeleting] = useState<BrandCastMemberDto | null>(null);
  if (archived.length === 0) return null;
  const full = active.length >= CAST_SIZE;
  const close = () => {
    setRestoring(null);
    setDeleting(null);
    onClearError();
  };
  const restore = async (member: BrandCastMemberDto, replace?: string) => {
    if (await onManage(member.id, { action: 'restore', replace })) setRestoring(null);
  };
  const remove = async (member: BrandCastMemberDto) => {
    if (await onManage(member.id, { action: 'delete' })) setDeleting(null);
  };
  return (
    <section aria-labelledby="cast-archive-title" className="space-y-3 border-t border-app-line pt-4">
      <div className="space-y-0.5">
        <h3 id="cast-archive-title" className="text-sm font-bold text-app-ink">Archive <span className="font-normal text-app-muted">({archived.length}/{ARCHIVE_MAX})</span></h3>
        <p className="text-sm text-app-muted">
          Old faces wait here for {ARCHIVE_DAYS} days.{archived.length >= ARCHIVE_MAX ? ' The archive is full: the next new face deletes the oldest one.' : ''}
        </p>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
        {archived.map((m) => (
          <ArchivedCard key={m.id} member={m} busy={busy === m.id} onRestore={() => (full ? setRestoring(m) : void restore(m))} onDelete={() => setDeleting(m)} />
        ))}
      </ul>
      <ReplacePicker back={restoring} active={active} busy={restoring !== null && busy === restoring.id} error={restoring ? error : null} onClose={close} onPick={(id) => restoring && void restore(restoring, id)} />
      <DeleteConfirm member={deleting} busy={deleting !== null && busy === deleting.id} error={deleting ? error : null} onClose={close} onConfirm={() => deleting && void remove(deleting)} />
    </section>
  );
}
