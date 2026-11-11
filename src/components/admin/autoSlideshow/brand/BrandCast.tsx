'use client';

import { Plus, RefreshCw, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { ARCHIVE_MAX, CAST_SIZE, type BrandCastMemberDto } from '../../../../types/admin/brandCast';
import type { LabClient } from '../../../labs/labClient';
import { useState } from 'react';
import { ArchivedFaces } from './ArchivedFaces';
import { CastMemberMedia, photoBox } from './CastMemberMedia';
import { CastMemberMenu } from './CastMemberMenu';
import { EditMemberDialog, type MemberEdit } from './EditMemberDialog';
import { CreateAvatarDialog } from './CreateAvatarDialog';
import { NewFaceDialog, type NewFaceRequest } from './NewFaceDialog';
import { VoiceDialog } from './VoiceDialog';
import { useBrandCast, type CastAction } from './useBrandCast';

const errorClass = 'rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300';
const grid = 'grid grid-cols-3 gap-2 sm:gap-3';
const smallButton = 'inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-app-line px-3 text-xs font-semibold text-app-ink transition hover:bg-app-sunken active:scale-95 disabled:opacity-40 sm:text-sm';

function CastSkeleton() {
  return (
    <div className={grid} aria-busy="true" aria-label="Loading your brand cast">
      {Array.from({ length: CAST_SIZE }, (_, i) => (
        <div key={i} className="space-y-2">
          <div className={`${photoBox} animate-pulse`} />
          <div className="h-4 w-2/3 animate-pulse rounded bg-app-sunken" />
        </div>
      ))}
    </div>
  );
}

type CardProps = {
  member: BrandCastMemberDto;
  busy: boolean;
  detailed: boolean;
  /** "Create campaign" with this face; left out: no button. */
  campaignHref?: string;
  onAct: (action: CastAction) => void;
  onNewFace: () => void;
  onVoice: () => void;
  onEdit: () => void;
  onArchive: () => void;
  /** Intro videos are free (the admin view). */
  freeIntro: boolean;
};

/** A failed photo: "Try again". A ready one: "Create campaign" told by this person. */
function CardAction({ member, busy, campaignHref, onAct }: Pick<CardProps, 'member' | 'busy' | 'campaignHref' | 'onAct'>) {
  if (member.status === 'failed') {
    return (
      <button type="button" onClick={() => onAct('retry')} disabled={busy} className={smallButton}>
        <RefreshCw aria-hidden className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Try again
      </button>
    );
  }
  if (!campaignHref) return null;
  if (member.status !== 'ready' || busy) {
    return (
      <button type="button" disabled className={smallButton}>
        <Sparkles aria-hidden className="h-3.5 w-3.5" /> Create campaign
      </button>
    );
  }
  return (
    <Link href={campaignHref} className={smallButton}>
      <Sparkles aria-hidden className="h-3.5 w-3.5" /> Create campaign
    </Link>
  );
}

function MemberCard({ member, busy, detailed, campaignHref, onAct, onNewFace, onVoice, onEdit, onArchive, freeIntro }: CardProps) {
  const introLabel = `${member.introStatus === 'failed' ? 'Retry intro video' : 'Make intro video'}${freeIntro ? '' : ' · 1 credit'}`;
  return (
    <li className="flex min-w-0 flex-col gap-2">
      <CastMemberMedia member={member} />
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-app-ink">{member.name}</p>
          <CastMemberMenu
            name={member.name}
            busy={busy}
            onEdit={onEdit}
            onNewFace={onNewFace}
            newFaceDisabled={busy || member.status !== 'ready'}
            onVoice={member.status === 'ready' ? onVoice : undefined}
            onIntro={needsIntro(member) ? () => onAct('intro') : undefined}
            introLabel={introLabel}
            onArchive={onArchive}
          />
        </div>
        {detailed && <p className="mt-0.5 text-xs text-app-muted">{member.look} · used {member.uses}×{member.ttsVoice ? ` · voice ${member.ttsVoice}` : ''}</p>}
        {detailed && member.introScript && <p className="mt-1 text-xs text-app-ink">Intro: “{member.introScript}”</p>}
        {detailed && member.introStatus === 'failed' && member.introError && <p className="mt-1 text-xs text-app-danger">{member.introError}</p>}
      </div>
      <CardAction member={member} busy={busy} campaignHref={campaignHref} onAct={onAct} />
    </li>
  );
}

/** An empty slot: makes one new avatar in it. `creating`: this card's avatar is being written. */
export function CreateAvatarCard({ creating, disabled, onCreate }: { creating: boolean; disabled: boolean; onCreate: () => void }) {
  return (
    <li className="flex min-w-0 flex-col">
      <button type="button" onClick={onCreate} disabled={disabled} aria-busy={creating} className={`${photoBox} flex flex-col items-center justify-center gap-2 border-2 border-dashed border-app-line bg-transparent p-2 text-center text-app-ink transition hover:bg-app-sunken active:scale-[0.98] disabled:opacity-50`}>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-app-sunken"><Plus aria-hidden className={`h-5 w-5 ${creating ? 'animate-spin' : ''}`} /></span>
        <span className="text-xs font-semibold sm:text-sm">{creating ? 'Creating…' : 'Create Avatar'}</span>
      </button>
    </li>
  );
}

/** The intro video can be made now: photo ready, no video yet (or it failed). */
const needsIntro = (m: BrandCastMemberDto) => m.status === 'ready' && (m.introStatus === 'none' || m.introStatus === 'failed');

type BrandCastProps = {
  client: LabClient;
  /** '/brand-cast' for the user; '/workspaces/[id]/cast' for the admin. */
  path: string;
  /** Admin view: each person's full look and how often they were used. */
  detailed?: boolean;
  /** "Create campaign" link told by this face (the Brand page); left out: no button. */
  campaignHref?: (castId: string) => string;
};

/** The Brand Cast: the recurring people (avatars) of the brand's slideshows, each with "Create campaign" told by them and
 *  ⋮ for "Make intro video" (this person only, 1 credit), "New face" (the old face goes to the archive), "Change voice", editing their
 *  name and age, and "Move to archive" (frees the slot).
 *  Each empty slot shows a "+ Create Avatar" card. */
export function BrandCast({ client, path, detailed = false, campaignHref }: BrandCastProps) {
  const { members, archived, loadError, busy, actionError, act, manage, swap, create, draft, reload, clearError } = useBrandCast(client, path);
  const [adding, setAdding] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const openAdd = () => {
    clearError();
    setAdding((n) => n + 1);
    setAddOpen(true);
  };
  const submitCreate = async (request: NewFaceRequest) => {
    if (await create(request)) setAddOpen(false);
  };
  const [editing, setEditing] = useState<BrandCastMemberDto | null>(null);
  const [renaming, setRenaming] = useState<BrandCastMemberDto | null>(null);
  const [voicing, setVoicing] = useState<BrandCastMemberDto | null>(null);
  const submitNewFace = async (request: NewFaceRequest) => {
    if (editing && (await swap(editing.id, request))) setEditing(null);
  };
  const submitEdit = async (edit: MemberEdit) => {
    if (renaming && (await manage(renaming.id, { action: 'edit', ...edit }))) setRenaming(null);
  };
  const closeRename = () => {
    setRenaming(null);
    clearError();
  };
  if (loadError) {
    return (
      <div className={`${errorClass} flex flex-wrap items-center gap-3`}>
        <p className="flex-1">{loadError}</p>
        <button type="button" onClick={reload} className="min-h-11 rounded-full bg-red-600 px-5 font-semibold text-white transition active:scale-95">Try again</button>
      </div>
    );
  }
  if (!members) return <CastSkeleton />;
  const empty = CAST_SIZE - members.length;
  return (
    <div className="max-w-2xl space-y-3">
      <ul className={grid}>
        {members.map((m) => <MemberCard key={m.id} member={m} busy={busy === m.id} detailed={detailed} campaignHref={campaignHref?.(m.id)} onAct={(a) => void act(m.id, a)} onNewFace={() => setEditing(m)} onVoice={() => setVoicing(m)} onEdit={() => setRenaming(m)} onArchive={() => void manage(m.id, { action: 'archive' })} freeIntro={detailed} />)}
        {Array.from({ length: empty }, (_, i) => (
          <CreateAvatarCard key={`empty-${i}`} creating={busy === 'build' && i === 0} disabled={busy !== null} onCreate={openAdd} />
        ))}
      </ul>
      {actionError && !editing && !addOpen && !renaming && <p role="alert" className="text-sm text-app-danger">{actionError}</p>}
      <ArchivedFaces archived={archived} active={members} busy={busy} error={actionError} onManage={manage} onClearError={clearError} />
      <NewFaceDialog key={editing?.id ?? 'closed'} member={editing} archiveFull={archived.length >= ARCHIVE_MAX} busy={editing !== null && busy === editing.id} error={editing ? actionError : null} onClose={() => setEditing(null)} onSubmit={(r) => void submitNewFace(r)} />
      <CreateAvatarDialog key={`add-${adding}`} open={addOpen} busy={addOpen && busy === 'build'} error={addOpen ? actionError : null} onClose={() => setAddOpen(false)} onSubmit={(r) => void submitCreate(r)} onDraft={draft} />
      <VoiceDialog key={voicing?.id ?? 'closed-voice'} client={client} path={path} member={voicing} onClose={() => setVoicing(null)} onPicked={reload} />
      <EditMemberDialog key={renaming?.id ?? 'closed-edit'} member={renaming} busy={renaming !== null && busy === renaming.id} error={renaming ? actionError : null} onClose={closeRename} onSubmit={(e) => void submitEdit(e)} />
    </div>
  );
}
