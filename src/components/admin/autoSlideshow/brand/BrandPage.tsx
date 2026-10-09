'use client';

import { ImagePlus, X } from 'lucide-react';
import { useMemo, useRef, type ChangeEvent } from 'react';
import type { BrandPhotoDto } from '../../../../types/admin/brandContent';
import { createWorkspaceLabClient } from '../../../labs/labClient';
import { BrandWebsite } from './BrandWebsite';
import { useBrandPhotos, type PendingPhoto } from './useBrandPhotos';

const errorClass = 'rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300';
const grid = 'grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6';
const tile = 'relative aspect-square overflow-hidden rounded-xl bg-app-sunken';
const removeClass = 'absolute top-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 active:scale-90';

function GridSkeleton() {
  return (
    <div className={grid} aria-busy="true" aria-label="Loading your photos">
      {Array.from({ length: 6 }, (_, i) => <div key={i} className={`${tile} animate-pulse`} />)}
    </div>
  );
}

function PhotoTile({ photo, onRemove }: { photo: BrandPhotoDto; onRemove: () => void }) {
  return (
    <li className={tile}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photo.url && <img src={photo.url} alt={photo.description ?? photo.filename} loading="lazy" className="h-full w-full object-cover" />}
      <button type="button" onClick={onRemove} aria-label={`Delete ${photo.filename}`} className={removeClass}>
        <X aria-hidden className="h-4 w-4" />
      </button>
    </li>
  );
}

/** A photo on its way up: its preview dimmed with a spinner, or the reason it failed and ✕ to clear it. */
function PendingTile({ item, onDismiss }: { item: PendingPhoto; onDismiss: () => void }) {
  return (
    <li className={tile}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.preview} alt="" className="h-full w-full object-cover opacity-50" />
      {item.error ? (
        <>
          <p role="alert" className="absolute inset-x-1 bottom-1 rounded-lg bg-red-600/90 p-1.5 text-[11px] leading-tight font-semibold text-white">{item.error}</p>
          <button type="button" onClick={onDismiss} aria-label={`Clear ${item.name}`} className={removeClass}>
            <X aria-hidden className="h-4 w-4" />
          </button>
        </>
      ) : (
        <span aria-label={`Uploading ${item.name}`} className="absolute inset-0 flex items-center justify-center">
          <span aria-hidden className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        </span>
      )}
    </li>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-app-line p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-sunken text-app-ink"><ImagePlus aria-hidden className="h-6 w-6" /></span>
      <p className="mt-3 text-base font-semibold text-app-ink">Add your own photos</p>
      <p className="mx-auto mt-1 max-w-[36ch] text-sm text-app-muted">Your shop, your products, your team. We keep them here so your posts can use them later.</p>
      <button type="button" onClick={onAdd} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95">
        <ImagePlus aria-hidden className="h-4 w-4" /> Add photos
      </button>
    </div>
  );
}

/** The Brand page's photo grid: the user's own photos, uploaded to reuse later. Nothing uses them yet. */
function BrandPhotos({ token, workspaceId }: { token: string; workspaceId: string }) {
  const client = useMemo(() => createWorkspaceLabClient(token, workspaceId), [token, workspaceId]);
  const { photos, loadError, pending, load, upload, dismiss, remove } = useBrandPhotos(client);
  const input = useRef<HTMLInputElement>(null);
  const pick = () => input.current?.click();
  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // the same photo can be picked again
    if (files.length > 0) void upload(files);
  };

  const fileInput = <input ref={input} type="file" accept="image/*" multiple hidden onChange={onFiles} />;
  if (loadError) {
    return (
      <div className={`${errorClass} flex flex-wrap items-center gap-3`}>
        <p className="flex-1">{loadError}</p>
        <button type="button" onClick={() => void load()} className="min-h-11 rounded-full bg-red-600 px-5 font-semibold text-white transition active:scale-95">Try again</button>
      </div>
    );
  }
  if (!photos) return <GridSkeleton />;
  if (photos.length === 0 && pending.length === 0) return <>{fileInput}<EmptyState onAdd={pick} /></>;
  return (
    <div className="space-y-4">
      {fileInput}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold text-app-ink">
          Your photos <span className="font-normal text-app-muted">· {photos.length}</span>
        </h2>
        <button type="button" onClick={pick} className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full bg-app-cta px-4 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95">
          <ImagePlus aria-hidden className="h-4 w-4" /> Add photos
        </button>
      </div>
      <ul className={grid}>
        {pending.map((item) => <PendingTile key={item.key} item={item} onDismiss={() => dismiss(item.key)} />)}
        {photos.map((photo) => <PhotoTile key={photo.id} photo={photo} onRemove={() => void remove(photo)} />)}
      </ul>
    </div>
  );
}

/** /slideshow/[workspaceId]/brand: the brand card read from the website, and the brand's own photos. */
export function BrandPage({ token, workspaceId }: { token: string; workspaceId: string }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="space-y-1">
        <h1 className="text-xl font-extrabold text-app-ink sm:text-2xl">Your brand</h1>
        <p className="text-sm text-app-muted">What we read from your website, and your own photos.</p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section aria-label="Your website" className="space-y-3">
          <h2 className="text-sm font-bold text-app-ink">From your website</h2>
          <BrandWebsite token={token} workspaceId={workspaceId} />
        </section>
        <section aria-label="Your photos">
          <BrandPhotos token={token} workspaceId={workspaceId} />
        </section>
      </div>
    </div>
  );
}
