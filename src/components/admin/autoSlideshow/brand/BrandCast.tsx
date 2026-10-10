'use client';

import { Clapperboard, RefreshCw, UserRound, Users } from 'lucide-react';
import { CAST_SIZE, type BrandCastMemberDto } from '../../../../types/admin/brandCast';
import type { LabClient } from '../../../labs/labClient';
import { CastMemberMedia, photoBox } from './CastMemberMedia';
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

type CardProps = { member: BrandCastMemberDto; busy: boolean; detailed: boolean; onAct: (action: CastAction) => void };

function MemberCard({ member, busy, detailed, onAct }: CardProps) {
  const failed = member.status === 'failed';
  // A made (or failed) intro can be made again; a first one comes from the "Make intro videos" button.
  const canRedo = member.status === 'ready' && (member.introStatus === 'ready' || member.introStatus === 'failed');
  return (
    <li className="flex min-w-0 flex-col gap-2">
      <CastMemberMedia member={member} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-app-ink">{member.name}</p>
        {detailed && <p className="mt-0.5 text-xs text-app-muted">{member.look} · used {member.uses}×</p>}
        {detailed && member.introScript && <p className="mt-1 text-xs text-app-ink">Intro: “{member.introScript}”</p>}
        {detailed && member.introStatus === 'failed' && member.introError && <p className="mt-1 text-xs text-app-danger">{member.introError}</p>}
      </div>
      <div className="mt-auto flex flex-col gap-1.5">
        <button type="button" onClick={() => onAct(failed ? 'retry' : 'swap')} disabled={busy || member.status === 'pending'} className={smallButton}>
          <RefreshCw aria-hidden className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
          {failed ? 'Try again' : 'New face'}
        </button>
        {canRedo && (
          <button type="button" onClick={() => onAct('intro')} disabled={busy} className={smallButton}>
            <Clapperboard aria-hidden className="h-3.5 w-3.5" /> Redo intro
          </button>
        )}
      </div>
    </li>
  );
}

function EmptyCast({ busy, onBuild }: { busy: boolean; onBuild: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-app-line p-6 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-sunken text-app-ink"><Users aria-hidden className="h-6 w-6" /></span>
      <p className="mt-3 text-base font-semibold text-app-ink">Meet your brand cast</p>
      <p className="mx-auto mt-1 max-w-[36ch] text-sm text-app-muted">3 people who look like your customers. The same faces come back in your slideshows.</p>
      <button type="button" onClick={onBuild} disabled={busy} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95 disabled:opacity-50">
        <UserRound aria-hidden className="h-4 w-4" /> {busy ? 'Casting…' : 'Make my cast'}
      </button>
    </div>
  );
}

/** Members whose intro video can be made now: photo ready, no video yet (or it failed). */
const needIntro = (members: BrandCastMemberDto[]) => members.filter((m) => m.status === 'ready' && (m.introStatus === 'none' || m.introStatus === 'failed'));

function IntroCta({ count, busy, onMake }: { count: number; busy: boolean; onMake: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-app-line bg-app-panel p-3 shadow-sm">
      <p className="min-w-[12rem] flex-1 text-sm text-app-muted">A 6-second hello from {count === 1 ? 'this person' : 'each person'}, talking to your followers. About a minute.</p>
      <button type="button" onClick={onMake} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95 disabled:opacity-50">
        <Clapperboard aria-hidden className="h-4 w-4" /> {busy ? 'Starting…' : count === 1 ? 'Make intro video' : 'Make intro videos'}
      </button>
    </div>
  );
}

type BrandCastProps = {
  client: LabClient;
  /** '/brand-cast' for the user; '/workspaces/[id]/cast' for the admin. */
  path: string;
  /** Admin view: each person's full look and how often they were used. */
  detailed?: boolean;
};

/** The Brand Cast: the recurring people of the brand's slideshows, each with "New face" to swap them and an intro video. */
export function BrandCast({ client, path, detailed = false }: BrandCastProps) {
  const { members, loadError, busy, actionError, build, act, makeIntros, reload } = useBrandCast(client, path);
  if (loadError) {
    return (
      <div className={`${errorClass} flex flex-wrap items-center gap-3`}>
        <p className="flex-1">{loadError}</p>
        <button type="button" onClick={reload} className="min-h-11 rounded-full bg-red-600 px-5 font-semibold text-white transition active:scale-95">Try again</button>
      </div>
    );
  }
  if (!members) return <CastSkeleton />;
  const missing = members.length < CAST_SIZE;
  return (
    <div className={`space-y-3 ${detailed ? 'max-w-3xl' : ''}`}>
      {members.length === 0 ? (
        <EmptyCast busy={busy === 'build'} onBuild={() => void build()} />
      ) : (
        <ul className={grid}>
          {members.map((m) => <MemberCard key={m.id} member={m} busy={busy === m.id} detailed={detailed} onAct={(a) => void act(m.id, a)} />)}
        </ul>
      )}
      {needIntro(members).length > 0 && <IntroCta count={needIntro(members).length} busy={busy === 'intros'} onMake={() => void makeIntros(needIntro(members).map((m) => m.id))} />}
      {members.length > 0 && missing && (
        <button type="button" onClick={() => void build()} disabled={busy !== null} className="min-h-11 rounded-full border border-app-line px-4 text-sm font-semibold text-app-ink transition hover:bg-app-sunken active:scale-95 disabled:opacity-40">
          Add {CAST_SIZE - members.length} more
        </button>
      )}
      {actionError && <p role="alert" className="text-sm text-app-danger">{actionError}</p>}
    </div>
  );
}
