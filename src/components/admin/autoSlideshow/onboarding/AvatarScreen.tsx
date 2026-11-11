'use client';

import { Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { AVATAR_CHOICES, type BrandCastMemberDto } from '../../../../types/admin/brandCast';
import { CreateAvatarDialog } from '../brand/CreateAvatarDialog';
import { FaceTimer } from '../brand/FaceTimer';
import type { NewFaceRequest } from '../brand/NewFaceDialog';
import { Screen } from './OnboardingChrome';

const photoBox = 'relative aspect-[9/16] overflow-hidden rounded-xl bg-app-sunken';

type Props = {
  /** The candidates made so far (at most AVATAR_CHOICES); null while the list loads. */
  members: BrandCastMemberDto[] | null;
  chosenId: string | null;
  /** An action is running (its member id, or 'build' for a new candidate). */
  busy: string | null;
  saving: boolean;
  error: string | null;
  onChoose: (id: string) => void;
  onCreate: (request: NewFaceRequest) => void;
  onRetry: (id: string) => void;
  onConfirm: () => void;
  /** The person "Surprise me" would make, for the dialog's "Use your own prompt". */
  onDraft: () => Promise<string | null>;
};

function Loading() {
  return (
    <div className="grid grid-cols-3 gap-2" aria-busy="true" aria-label="Drawing your avatar">
      {Array.from({ length: AVATAR_CHOICES }, (_, i) => <div key={i} className={`${photoBox} animate-pulse`} />)}
    </div>
  );
}

/** One candidate: its photo, the countdown while it is made, or its reason and a Try again. */
function Candidate({ member, chosen, busy, onChoose, onRetry }: { member: BrandCastMemberDto; chosen: boolean; busy: boolean; onChoose: () => void; onRetry: () => void }) {
  const ring = chosen ? 'ring-2 ring-app-ink' : 'ring-1 ring-app-line';
  if (member.status === 'pending') {
    return (
      <li className={`${photoBox} flex flex-col items-center justify-center ${ring}`} aria-label={`Making ${member.name}'s photo`}>
        <FaceTimer startedAt={member.updatedAt} />
      </li>
    );
  }
  if (member.status === 'failed' || !member.imageUrl) {
    return (
      <li className={`${photoBox} flex flex-col items-center justify-center gap-2 p-2 text-center ${ring}`}>
        <p role="alert" className="text-[11px] text-app-danger">{member.error ?? 'The photo failed.'}</p>
        <button type="button" onClick={onRetry} disabled={busy} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-app-line px-3 text-xs font-semibold text-app-ink transition active:scale-95 disabled:opacity-40">
          <RefreshCw aria-hidden className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} /> Try again
        </button>
      </li>
    );
  }
  return (
    <li>
      <button type="button" onClick={onChoose} aria-pressed={chosen} aria-label={`Pick ${member.name}`} className={`${photoBox} block w-full transition active:scale-[0.98] ${ring}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={member.imageUrl} alt={`${member.name}, your brand avatar`} className="h-full w-full object-cover" />
        {chosen && <span aria-hidden className="absolute inset-x-1 bottom-1 rounded-full bg-app-ink px-2 py-0.5 text-center text-[10px] font-bold text-app-panel">Picked</span>}
      </button>
      <p className="mt-1 truncate text-[11px] font-semibold text-app-ink">{member.name}</p>
    </li>
  );
}

/**
 * The second onboarding gate: the owner validates the brand avatar read from their website before any slideshow is
 * made. They keep the first one or make up to AVATAR_CHOICES candidates with the same "Create avatar" dialog as the
 * Brand page, then pick one. The pick starts the avatar's first slideshow (src/server/brandCast/gate.ts).
 */
export function AvatarScreen({ members, chosenId, busy, saving, error, onChoose, onCreate, onRetry, onConfirm, onDraft }: Props) {
  const [creating, setCreating] = useState(0);
  const made = members ?? [];
  const left = AVATAR_CHOICES - made.length;
  const making = made.some((m) => m.status === 'pending');
  const canCreate = left > 0 && !making && busy === null && !saving;
  const ready = chosenId !== null && !saving && busy === null;
  return (
    <Screen
      kicker="Your brand avatar"
      title="Meet the face of your posts"
      subtitle="This person shows up in your photos. Keep them, or make another and pick the one you like."
      cta={{ label: saving ? 'Starting your slideshow…' : 'Use this avatar', onClick: onConfirm, disabled: !ready }}
      ctaNote="You can change the face later on your Brand page."
    >
      {members === null ? (
        <Loading />
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {made.map((m) => (
            <Candidate
              key={m.id}
              member={m}
              chosen={m.id === chosenId}
              busy={busy === m.id}
              onChoose={() => onChoose(m.id)}
              onRetry={() => onRetry(m.id)}
            />
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setCreating((n) => n + 1)}
        disabled={!canCreate}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-app-line px-4 text-sm font-semibold text-app-ink transition hover:bg-app-sunken active:scale-95 disabled:opacity-40"
      >
        <Plus aria-hidden className="h-4 w-4" /> {left > 0 ? `Make another (${left} left)` : 'That’s all 3'}
      </button>
      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {creating > 0 && (
        <CreateAvatarDialog
          key={creating}
          open
          busy={busy === 'build'}
          error={null}
          onClose={() => setCreating(0)}
          onSubmit={(request) => {
            setCreating(0);
            onCreate(request);
          }}
          onDraft={onDraft}
        />
      )}
    </Screen>
  );
}
