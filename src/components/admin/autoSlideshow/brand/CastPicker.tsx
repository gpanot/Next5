'use client';

import { Check, RefreshCw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ARCHIVE_MAX, CAST_SIZE, type BrandCastMemberDto } from '../../../../types/admin/brandCast';
import { createWorkspaceLabClient } from '../../../labs/labClient';
import { CreateAvatarCard } from './BrandCast';
import { photoBox } from './CastMemberMedia';
import { FaceTimer } from './FaceTimer';
import { NewFaceDialog, type NewFaceRequest } from './NewFaceDialog';
import { useBrandCast } from './useBrandCast';

const grid = 'grid grid-cols-4 gap-2';
const tile = (selected: boolean) =>
  `${photoBox} block w-full transition active:scale-[0.97] ${selected ? 'ring-2 ring-app-cta ring-offset-2 ring-offset-app-panel' : 'hover:opacity-90'}`;
const smallButton = 'inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-full border border-app-line px-1 text-[11px] font-semibold text-app-ink transition hover:bg-app-sunken active:scale-95 disabled:opacity-40 sm:text-xs';

function SelectedMark() {
  return (
    <span aria-hidden className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-app-cta text-app-cta-ink shadow-sm">
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
  );
}

/** "Choose for me": no face picked, each story gets the face that fits it best. */
function AutoTile({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <li className="flex min-w-0 flex-col gap-1.5">
      <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className={`${tile(selected)} flex flex-col items-center justify-center gap-1.5 border border-app-line p-1.5 text-center`}>
        <Sparkles aria-hidden className="h-5 w-5 text-app-accent" />
        <span className="text-[11px] font-semibold leading-tight text-app-ink sm:text-xs">Choose for me</span>
        {selected && <SelectedMark />}
      </button>
      <p className="text-center text-[11px] leading-tight text-app-muted">Pick based on story</p>
    </li>
  );
}

type FaceProps = { member: BrandCastMemberDto; selected: boolean; busy: boolean; onSelect: () => void; onNewFace: () => void; onRetry: () => void };

/** One brand face: tap the photo to pick it; "New face" swaps it (no intro video here). */
function FaceTile({ member, selected, busy, onSelect, onNewFace, onRetry }: FaceProps) {
  const failed = member.status === 'failed';
  const firstName = member.name.split(',')[0];
  let photo;
  if (member.status === 'pending') {
    photo = <div className={`${photoBox} flex items-center justify-center`} aria-label={`Making ${firstName}'s photo`}><FaceTimer startedAt={member.updatedAt} /></div>;
  } else if (!member.imageUrl) {
    photo = <div className={`${photoBox} flex items-center justify-center p-1 text-center`}><p role="alert" className="text-[11px] text-app-danger">Photo failed</p></div>;
  } else {
    photo = (
      <button type="button" role="radio" aria-checked={selected} aria-label={`${firstName} tells the stories`} onClick={onSelect} className={tile(selected)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={member.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        {selected && <SelectedMark />}
      </button>
    );
  }
  return (
    <li className="flex min-w-0 flex-col gap-1.5">
      {photo}
      <p className="truncate text-center text-xs font-semibold text-app-ink">{firstName}</p>
      <button type="button" onClick={failed ? onRetry : onNewFace} disabled={busy || member.status === 'pending'} className={smallButton}>
        <RefreshCw aria-hidden className={`h-3 w-3 shrink-0 ${busy ? 'animate-spin' : ''}`} />
        {failed ? 'Try again' : 'New face'}
      </button>
    </li>
  );
}

type Props = {
  token: string;
  workspaceId: string;
  /** The picked face's id; null: "Choose for me". */
  value: string | null;
  onChange: (castId: string | null) => void;
};

/** Brand Cast step: who tells the stories. The brand's faces (empty slots make one, "New face" swaps one, as on the
 *  Brand page but without intro videos) and "Choose for me". */
export function CastPicker({ token, workspaceId, value, onChange }: Props) {
  const client = useMemo(() => createWorkspaceLabClient(token, workspaceId), [token, workspaceId]);
  const { members, archived, loadError, busy, actionError, build, act, swap, reload } = useBrandCast(client, '/brand-cast');
  const [editing, setEditing] = useState<BrandCastMemberDto | null>(null);
  // A swapped or failed face can no longer be picked: fall back to "Choose for me".
  const picked = members?.some((m) => m.id === value && m.status === 'ready' && m.imageUrl) ? value : null;
  const submitNewFace = async (request: NewFaceRequest) => {
    if (editing && (await swap(editing.id, request))) setEditing(null);
  };
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-app-ink">Who tells the story?</p>
      {loadError ? (
        <div className="flex items-center gap-2 text-sm text-app-danger">
          <p role="alert" className="flex-1">{loadError}</p>
          <button type="button" onClick={reload} className="min-h-11 rounded-full border border-app-line px-4 font-semibold text-app-ink transition active:scale-95">Try again</button>
        </div>
      ) : !members ? (
        <div className={grid} aria-busy="true" aria-label="Loading your brand faces">
          {Array.from({ length: CAST_SIZE + 1 }, (_, i) => <div key={i} className={`${photoBox} animate-pulse`} />)}
        </div>
      ) : (
        <ul role="radiogroup" aria-label="Who tells the story" className={grid}>
          <AutoTile selected={picked === null} onSelect={() => onChange(null)} />
          {members.map((m) => (
            <FaceTile key={m.id} member={m} selected={picked === m.id} busy={busy === m.id} onSelect={() => onChange(m.id)} onNewFace={() => setEditing(m)} onRetry={() => void act(m.id, 'retry')} />
          ))}
          {Array.from({ length: Math.max(0, CAST_SIZE - members.length) }, (_, i) => (
            <CreateAvatarCard key={`empty-${i}`} creating={busy === 'build' && i === 0} disabled={busy !== null} onCreate={() => void build(true)} />
          ))}
        </ul>
      )}
      {actionError && !editing && <p role="alert" className="text-sm text-app-danger">{actionError}</p>}
      <NewFaceDialog key={editing?.id ?? 'closed'} member={editing} archiveFull={archived.length >= ARCHIVE_MAX} busy={editing !== null && busy === editing.id} error={editing ? actionError : null} onClose={() => setEditing(null)} onSubmit={(r) => void submitNewFace(r)} />
    </div>
  );
}
