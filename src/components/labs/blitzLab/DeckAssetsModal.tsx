'use client';

// "Assets" modal of the deck: the still images the cards use, each with its description
// (same descriptor the Assets Library shows), Regenerate (AI images, same prompt) and Delete.

import { ChevronDown, Loader2, RefreshCw, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDeckImages, type DeckImageDto } from './useDeckImages';

type Props = {
  keys: string[];
  /** How many shots use each image, by R2 key. */
  usage: Record<string, number>;
  onReplaced: (oldKey: string, next: { r2Key: string; url: string }) => void;
  onRemoved: (r2Key: string) => void;
  onClose: () => void;
};

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--mute,#7c7d82)]">{label}</dt>
      <dd className="text-[12.5px] leading-snug text-[var(--ink,#000)] dark:text-neutral-200">{value}</dd>
    </div>
  );
}

function Description({ image }: { image: DeckImageDto }) {
  const empty = !image.subject && !image.meaning && !image.prompt && !image.retrievalText;
  if (empty) return <p className="text-[12px] italic text-[var(--mute,#7c7d82)]">No description yet.</p>;
  return (
    <dl className="flex flex-col gap-1.5">
      <Field label="Subject" value={image.subject} />
      <Field label="Meaning" value={image.meaning} />
      <Field label="Best use" value={image.bestUse} />
      <Field label="Setting" value={image.setting} />
      <Field label="Industries" value={image.categories.length ? image.categories.join(', ') : null} />
      <Field label="Prompt" value={image.prompt} />
      <Field label="Search text" value={image.retrievalText} />
    </dl>
  );
}

type TileProps = {
  image: DeckImageDto;
  uses: number;
  busy?: 'regenerate' | 'delete';
  error?: string;
  onRegenerate: () => void;
  onDelete: () => void;
};

const action = 'inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold transition-all active:scale-[.97] disabled:opacity-50';

function ImageTile({ image, uses, busy, error, onRegenerate, onDelete }: TileProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="relative aspect-[9/16] bg-neutral-200 dark:bg-neutral-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.url} alt={image.subject ?? image.name} className={`h-full w-full object-cover transition-opacity ${busy ? 'opacity-40' : ''}`} />
        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
          {image.isAi ? 'AI' : 'Library'} · {uses} shot{uses === 1 ? '' : 's'}
        </span>
        {busy && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[12px] font-semibold text-white">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> {busy === 'regenerate' ? 'Regenerating…' : 'Deleting…'}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-[var(--ink,#000)] dark:text-neutral-100">{image.subject ?? image.name}</p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center justify-between text-[12px] font-medium text-[var(--mute,#7c7d82)] transition-colors hover:text-[var(--ink,#000)]"
        >
          Description <ChevronDown aria-hidden className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && <Description image={image} />}
        {error && <p role="alert" className="text-[11.5px] text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-auto flex gap-1.5 pt-1">
          {image.isAi && image.prompt && (
            <button type="button" onClick={onRegenerate} disabled={Boolean(busy)} className={`${action} border-[var(--line,#e8e5e1)] text-[var(--ink,#000)] hover:bg-[var(--soft-2,#e6e1db)] dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800`}>
              <RefreshCw aria-hidden className="h-3.5 w-3.5" /> Regenerate
            </button>
          )}
          <button
            type="button"
            onClick={() => (confirming ? onDelete() : setConfirming(true))}
            onBlur={() => setConfirming(false)}
            disabled={Boolean(busy)}
            className={`${action} ${confirming ? 'border-red-600 bg-red-600 text-white' : 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40'}`}
          >
            <Trash2 aria-hidden className="h-3.5 w-3.5" /> {confirming ? 'Sure?' : 'Delete'}
          </button>
        </div>
      </div>
    </li>
  );
}

function Skeleton() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="aspect-[9/16] animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
      ))}
    </ul>
  );
}

export function DeckAssetsModal({ keys, usage, onReplaced, onRemoved, onClose }: Props) {
  const { images, status, busy, errors, regenerate, remove } = useDeckImages({ keys, onReplaced, onRemoved });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Portal to <body>: inside the deck's sticky column the modal would sit under the cards and the app bar.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label="Deck images">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-[var(--page,#f7f6f4)] shadow-xl sm:h-[85vh] sm:rounded-2xl dark:bg-neutral-950" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between gap-3 border-b border-[var(--line,#e8e5e1)] px-4 py-3 sm:px-6 dark:border-neutral-800">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold text-[var(--ink,#000)] dark:text-neutral-100">Images in this deck</h2>
            <p className="text-[12.5px] text-[var(--mute,#7c7d82)]">Delete moves the shot to its next best match. Regenerate keeps the same prompt.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 flex-none place-items-center rounded-full transition-colors hover:bg-[var(--soft-2,#e6e1db)] dark:hover:bg-neutral-800">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {status === 'loading' && <Skeleton />}
          {status === 'error' && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">Could not load the images. Close and try again.</p>
          )}
          {status === 'ready' && images.length === 0 && (
            <p className="rounded-xl border border-dashed border-[var(--line,#e8e5e1)] p-6 text-center text-[13.5px] text-[var(--mute,#7c7d82)] dark:border-neutral-700">This deck uses video clips only. No images to manage.</p>
          )}
          {status === 'ready' && images.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((image) => (
                <ImageTile
                  key={image.id}
                  image={image}
                  uses={usage[image.r2Key] ?? 0}
                  busy={busy[image.id]}
                  error={errors[image.id]}
                  onRegenerate={() => void regenerate(image)}
                  onDelete={() => void remove(image)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
