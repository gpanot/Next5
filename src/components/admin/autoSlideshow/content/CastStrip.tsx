'use client';

import { useCallback, useMemo } from 'react';
import type { AutoSlideshowDto } from '../../../../types/admin/autoSlideshow';
import type { BrandCastMemberDto } from '../../../../types/admin/brandCast';
import { createWorkspaceLabClient } from '../../../labs/labClient';
import { useBrandCast } from '../brand/useBrandCast';

/** A brand face as the slideshow lists show it. */
export type Face = { id: string; firstName: string; imageUrl: string | null };

const toFace = (m: BrandCastMemberDto): Face => ({ id: m.id, firstName: m.name.split(',')[0]?.trim() || m.name, imageUrl: m.imageUrl });

/** The face that tells a slideshow's story: the cast member on its slides (first one found). */
export const castIdOf = (show: AutoSlideshowDto): string | null => show.slides.find((s) => s.castId)?.castId ?? null;

/** The brand's faces (active cast, then parked ones, so older stories keep their face) and a lookup by slideshow. */
export function useCastFaces(token: string, workspaceId: string) {
  const client = useMemo(() => createWorkspaceLabClient(token, workspaceId), [token, workspaceId]);
  const { members, archived } = useBrandCast(client, '/brand-cast');
  const active = useMemo(() => (members ?? []).filter((m) => m.status === 'ready').map((m) => ({ ...toFace(m), uses: m.uses })), [members]);
  const byId = useMemo(() => new Map([...archived, ...(members ?? [])].map((m) => [m.id, toFace(m)])), [members, archived]);
  const faceOf = useCallback((show: AutoSlideshowDto): Face | null => {
    const id = castIdOf(show);
    return id ? (byId.get(id) ?? null) : null;
  }, [byId]);
  return { loaded: members !== null, active, faceOf };
}

/** A small round face, on a cover's corner or a row's thumb. */
export function FaceBadge({ face, className = '' }: { face: Face; className?: string }) {
  return (
    <span title={face.firstName} className={`block h-7 w-7 overflow-hidden rounded-full border-2 border-white bg-app-sunken shadow-sm dark:border-zinc-900 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {face.imageUrl && <img src={face.imageUrl} alt={face.firstName} loading="lazy" className="h-full w-full object-cover" />}
    </span>
  );
}

const pill = (on: boolean) =>
  `flex min-h-11 shrink-0 items-center gap-2 rounded-full border py-1 pr-4 pl-1 text-sm font-medium transition active:scale-95 disabled:opacity-40 ${
    on ? 'border-app-cta bg-app-cta text-app-cta-ink shadow-sm' : 'border-app-line bg-app-panel text-app-ink hover:border-app-muted'
  }`;

type StripProps = {
  faces: (Face & { uses: number })[];
  /** The face whose stories are shown; null: everyone. */
  value: string | null;
  onChange: (castId: string | null) => void;
};

/** Brand Cast › "Your cast": everyone, then each face with its post count. A tap shows only that face's stories. */
export function CastStrip({ faces, value, onChange }: StripProps) {
  if (faces.length === 0) return null;
  return (
    <div role="radiogroup" aria-label="Show stories of" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <button type="button" role="radio" aria-checked={value === null} onClick={() => onChange(null)} className={`${pill(value === null)} pl-4`}>
        Everyone
      </button>
      {faces.map((f) => (
        <button key={f.id} type="button" role="radio" aria-checked={value === f.id} disabled={f.uses === 0} onClick={() => onChange(value === f.id ? null : f.id)} className={pill(value === f.id)}>
          <FaceBadge face={f} className="h-9 w-9 border-0" />
          <span>{f.firstName}</span>
          <span className={value === f.id ? 'text-app-cta-ink/70' : 'text-app-muted'}>{f.uses} {f.uses === 1 ? 'post' : 'posts'}</span>
        </button>
      ))}
    </div>
  );
}
