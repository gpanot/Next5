'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import type { CampaignPhotoRef, PhotoOptionDto, PhotoTab } from '../../../../types/admin/slideshowCampaign';
import { createWorkspaceLabClient, errorOf } from '../../../labs/labClient';
import { MAX_RAW_BYTES, shrinkPhoto } from '../brand/shrinkPhoto';
import { PhotoOptionGrid } from './PhotoOptionGrid';
import { usePhotoOptions } from './usePhotoOptions';

type Props = {
  token: string;
  workspaceId: string;
  campaignId: string;
  /** Hook: many photos (they rotate). A card: one. */
  multiple: boolean;
  title: string;
  onDone: (refs: CampaignPhotoRef[]) => void;
  onClose: () => void;
};

const TABS: { id: PhotoTab; label: string }[] = [
  { id: 'search', label: 'Search' },
  { id: 'generated', label: 'Generated' },
  { id: 'brand', label: 'Your photos' },
  { id: 'shared', label: 'Library' },
];

const EMPTY: Record<PhotoTab, string> = {
  search: 'Search free stock photos, like "golf course".',
  generated: 'No generated photos yet.',
  brand: 'Upload your own photos to use them here.',
  shared: 'The shared library is empty.',
};

const tabClass = (on: boolean) =>
  `min-h-11 shrink-0 rounded-xl px-4 text-left text-sm font-medium transition active:scale-95 ${on ? 'border border-emerald-400/70 bg-emerald-400/10 text-white' : 'border border-white/10 text-white/70 hover:bg-white/5'}`;

/** Uploads to the workspace's brand photos (same route as Brand), one at a time. Resolves the first error, or null. */
const uploadFiles = async (token: string, workspaceId: string, files: File[]): Promise<string | null> => {
  const client = createWorkspaceLabClient(token, workspaceId);
  for (const file of files) {
    const small = await shrinkPhoto(file);
    if (small.size > MAX_RAW_BYTES) return `${file.name} is too big. Try a JPG or PNG.`;
    const form = new FormData();
    form.append('file', small);
    const res = await client.request('/brand-content', { form }).catch(() => null);
    if (!res) return 'Could not reach the server. Check your connection.';
    if (!res.ok) return errorOf(res);
  }
  return null;
};

function SearchBar({ onSearch }: { onSearch: (q: string) => void }) {
  const [text, setText] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(text.trim());
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input value={text} onChange={(e) => setText(e.target.value)} autoFocus placeholder="golf course, coffee shop…" className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-base text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none" />
      <button type="submit" disabled={!text.trim()} className="min-h-11 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 transition active:scale-95 disabled:opacity-40">Search</button>
    </form>
  );
}

function UploadButton({ onFiles, busy }: { onFiles: (files: File[]) => void; busy: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles([...(e.target.files ?? [])]); e.target.value = ''; }} />
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className="min-h-11 w-full rounded-xl border border-dashed border-white/30 text-sm font-semibold text-white/80 transition active:scale-[0.98] disabled:opacity-50">
        {busy ? 'Uploading…' : '+ Upload photos'}
      </button>
    </>
  );
}

/**
 * The photo library: stock photos (Unsplash), the workspace's generated photos, its own photos (with upload) and the
 * shared library, as tabs. Picks keep their order across tabs; Done hands them over for import.
 */
export function PhotoLibraryDialog({ token, workspaceId, campaignId, multiple, title, onDone, onClose }: Props) {
  const [tab, setTab] = useState<PhotoTab>('search');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<PhotoOptionDto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const list = usePhotoOptions(token, campaignId, tab, query);
  const keys = useMemo(() => picked.map((p) => p.key), [picked]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const toggle = (o: PhotoOptionDto) =>
    setPicked((p) => (p.some((x) => x.key === o.key) ? p.filter((x) => x.key !== o.key) : multiple ? [...p, o] : [o]));

  const upload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadError(await uploadFiles(token, workspaceId, files));
    setUploading(false);
    list.reload();
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-zinc-950 text-white shadow-xl sm:h-[85dvh] sm:rounded-2xl">
        <header className="flex min-h-14 shrink-0 items-center gap-2 border-b border-white/10 px-4">
          <h3 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10">✕</button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav aria-label="Photo sources" className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 p-3 md:w-52 md:flex-col md:border-r md:border-b-0">
            {TABS.map((t) => <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)} className={tabClass(tab === t.id)}>{t.label}</button>)}
          </nav>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
            {tab === 'search' && <SearchBar onSearch={setQuery} />}
            {tab === 'search' && <p className="text-xs text-white/40">Free photos from <a href="https://unsplash.com/?utm_source=next5&utm_medium=referral" target="_blank" rel="noreferrer" className="underline">Unsplash</a>.</p>}
            {tab === 'brand' && <UploadButton onFiles={(f) => void upload(f)} busy={uploading} />}
            {(list.error ?? uploadError) && <p role="alert" className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{list.error ?? uploadError}</p>}
            <PhotoOptionGrid options={list.options} loading={list.loading} selected={keys} onToggle={toggle} empty={EMPTY[tab]} />
            {list.hasMore && (
              <button type="button" onClick={() => void list.more()} disabled={list.loading} className="min-h-11 w-full rounded-xl border border-white/15 text-sm font-semibold text-white/80 transition active:scale-[0.98] disabled:opacity-50">
                {list.loading ? 'Loading…' : 'More photos'}
              </button>
            )}
          </div>
        </div>
        <footer className="flex shrink-0 items-center gap-3 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto" aria-label="Picked photos">
            {picked.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <li key={p.key} className="h-12 w-[27px] shrink-0 overflow-hidden rounded-md bg-white/10"><img src={p.thumbUrl} alt="" className="h-full w-full object-cover" /></li>
            ))}
            {picked.length === 0 && <li className="self-center text-sm text-white/40">{multiple ? 'Pick one or more photos' : 'Pick a photo'}</li>}
          </ul>
          <button type="button" onClick={() => onDone(picked.map((p) => p.ref))} disabled={picked.length === 0} className="min-h-11 shrink-0 rounded-full bg-emerald-400 px-5 text-sm font-semibold text-zinc-950 shadow-sm transition active:scale-95 disabled:opacity-40">
            {picked.length > 1 ? `Add ${picked.length}` : 'Done'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
