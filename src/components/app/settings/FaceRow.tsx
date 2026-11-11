'use client';

import { Archive, ArchiveRestore, ChevronDown, Loader2, Sparkles, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import type { InfluencerDto } from '../../../types/business/influencers';
import { AppLink } from '../shell/AppLink';

export const ROW_BUTTON = 'inline-flex h-9 items-center gap-1.5 rounded-xl border border-app-line px-3 text-[13px] font-medium text-app-ink transition-colors duration-200 hover:bg-app-sunken disabled:opacity-50';

/** The base portrait first, then every ready variation (newest first). `id` null = the base portrait. */
const thumbsOf = (i: InfluencerDto): { id: string | null; url: string }[] => [
  ...(i.portraitUrl ? [{ id: null, url: i.portraitUrl }] : []),
  ...i.variations.map((v) => ({ id: v.id, url: v.url })),
];

const meta = (i: InfluencerDto): string =>
  [i.gender, i.ethnicity, i.pendingCount > 0 ? `${i.pendingCount} photo${i.pendingCount === 1 ? '' : 's'} on the way` : null].filter(Boolean).join(' · ');

const Portrait = ({ influencer }: { influencer: InfluencerDto }) => (
  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-app-sunken">
    {influencer.portraitUrl
      // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
      ? <img src={influencer.portraitUrl} alt="" className="h-full w-full object-cover object-top" />
      : <UserRound aria-hidden className="h-6 w-6 text-app-muted/60" />}
  </span>
);

const RestoreButton = ({ influencer, onDone }: { influencer: InfluencerDto; onDone: () => void }) => {
  const [busy, setBusy] = useState(false);
  const restore = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/app/influencers/${influencer.id}?product=brand`, { method: 'PATCH', json: { status: 'active' } });
      onDone();
    } catch { /* the row stays; the user can retry */ } finally { setBusy(false); }
  };
  return (
    <button type="button" onClick={() => void restore()} disabled={busy} className={ROW_BUTTON}>
      {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <ArchiveRestore aria-hidden className="h-4 w-4" />}
      <span className="hidden sm:inline">Restore</span>
    </button>
  );
};

/** Expanded panel: every thumbnail of this face; pick one, then create with it. */
const FaceThumbs = ({ influencer }: { influencer: InfluencerDto }) => {
  const thumbs = thumbsOf(influencer);
  const [picked, setPicked] = useState<string | null>(null);
  const href = `/app/create?influencerId=${influencer.id}${picked ? `&photo=${picked}` : ''}`;
  if (thumbs.length === 0) return <p className="pb-3 text-[13px] text-app-muted">No photos yet. They show up here when ready.</p>;
  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {thumbs.map((t) => (
          <button
            key={t.id ?? 'base'}
            type="button"
            onClick={() => setPicked(t.id)}
            aria-pressed={picked === t.id}
            className={`relative aspect-[4/5] overflow-hidden rounded-xl bg-app-sunken ring-offset-2 ring-offset-app-panel transition duration-200 ${picked === t.id ? 'ring-2 ring-app-accent' : 'hover:opacity-90'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
            <img src={t.url} alt={t.id ? 'Generated photo' : 'Base portrait'} className="h-full w-full object-cover object-top" />
          </button>
        ))}
      </div>
      <AppLink href={href} className="inline-flex h-10 w-fit items-center gap-2 rounded-xl bg-app-cta px-4 text-[14px] font-semibold text-app-cta-ink shadow-sm transition-colors duration-200 hover:bg-app-cta/90">
        <Sparkles aria-hidden className="h-4 w-4" /> Create with this photo
      </AppLink>
    </div>
  );
};

type Props = { influencer: InfluencerDto; archived: boolean; onArchive: () => void; onDelete: () => void; onChanged: () => void };

/** One face: tap to expand its thumbnails; archive/restore and delete on the right. */
export const FaceRow = ({ influencer, archived, onArchive, onDelete, onChanged }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <div className="flex items-center gap-3 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition-opacity duration-200 hover:opacity-80">
          <Portrait influencer={influencer} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-app-ink">{influencer.name}</span>
            {meta(influencer) && <span className="block truncate text-[13px] text-app-muted">{meta(influencer)}</span>}
          </span>
          <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-app-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
        {archived ? <RestoreButton influencer={influencer} onDone={onChanged} /> : (
          <button type="button" onClick={onArchive} aria-label={`Archive ${influencer.name}`} className={ROW_BUTTON}>
            <Archive aria-hidden className="h-4 w-4" />
            <span className="hidden sm:inline">Archive</span>
          </button>
        )}
        <button type="button" onClick={onDelete} aria-label={`Delete ${influencer.name}`} className={`${ROW_BUTTON} text-app-danger`}>
          <Trash2 aria-hidden className="h-4 w-4" />
        </button>
      </div>
      {open && <FaceThumbs influencer={influencer} />}
    </li>
  );
};
