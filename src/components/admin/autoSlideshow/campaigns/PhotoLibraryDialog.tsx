'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import type { PhotoOptionDto, PhotoTab } from '../../../../types/admin/slideshowCampaign';
import { createWorkspaceLabClient, errorOf } from '../../../labs/labClient';
import { MAX_RAW_BYTES, shrinkPhoto } from '../brand/shrinkPhoto';
import { AppShotPanel } from './appShot/AppShotPanel';
import { PhotoOptionGrid } from './PhotoOptionGrid';
import { useChooseForMe, type ChooseForMe } from './useChooseForMe';
import { usePhotoOptions } from './usePhotoOptions';

type Props = {
  token: string;
  workspaceId: string;
  campaignId: string;
  /** Hook: many photos (they rotate). A card: one. */
  multiple: boolean;
  title: string;
  /** The tab it opens on (App shot for the CTA). */
  startTab?: PickerTab;
  /** Photos still missing for one per hook: a warning counts down as photos are picked. */
  recommended?: number;
  /** Hook photos only: the stock search to open on (already run), and "Choose for me". */
  chooseForMe?: ChooseForMe;
  onDone: (picks: PhotoOptionDto[]) => void;
  onClose: () => void;
};

/** The photo tabs, plus App shot (a builder, not a list). */
export type PickerTab = PhotoTab | 'appshot';

const TABS: { id: PickerTab; label: string }[] = [
  { id: 'search', label: 'Search' },
  { id: 'generated', label: 'Generated' },
  { id: 'brand', label: 'Your photos' },
  { id: 'shared', label: 'Library' },
  { id: 'appshot', label: 'App shot' },
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

/** `initial`: the search it opens with (remounted with a new one when "Choose for me" sets it). */
function SearchBar({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [text, setText] = useState(initial);
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

const SparkIcon = () => (
  <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
  </svg>
);

function ChooseButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/60 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/15 active:scale-[0.98] disabled:opacity-60 sm:w-auto">
      {busy ? <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300/30 border-t-emerald-300" /> : <SparkIcon />}
      {busy ? 'Choosing photos…' : 'Choose for me'}
    </button>
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
 * The photo library: stock photos (Unsplash), the workspace's generated photos, its own photos (with upload), the
 * shared library and the App shot builder (the app on a hand-held phone), as tabs. Picks keep their order across tabs; Done hands them over for import.
 */
export function PhotoLibraryDialog({ token, workspaceId, campaignId, multiple, title, startTab = 'search', recommended = 0, chooseForMe, onDone, onClose }: Props) {
  const [tab, setTab] = useState<PickerTab>(startTab);
  // The hook photos' search runs as soon as the picker opens.
  const [query, setQuery] = useState(chooseForMe?.query ?? '');
  const [picked, setPicked] = useState<PhotoOptionDto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // App shot lists nothing: an idle search tab.
  const list = usePhotoOptions(token, campaignId, tab === 'appshot' ? 'search' : tab, tab === 'appshot' ? '' : query);
  const keys = useMemo(() => picked.map((p) => p.key), [picked]);
  const missing = Math.max(0, recommended - picked.length);
  const choose = useChooseForMe(chooseForMe, { query, setQuery, setTab, list, picked, setPicked, missing });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A lightbox opened from inside (the App shot pose preview) closes first.
      if (e.key !== 'Escape' || document.querySelector('[data-lightbox-open]')) return;
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
            {tab === 'search' && <SearchBar key={query} initial={query} onSearch={setQuery} />}
            {tab === 'search' && chooseForMe && <ChooseButton busy={choose.busy} onClick={() => void choose.run()} />}
            {choose.error && <p role="alert" className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{choose.error}</p>}
            {tab === 'search' && <p className="text-xs text-white/40">Free photos from <a href="https://unsplash.com/?utm_source=next5&utm_medium=referral" target="_blank" rel="noreferrer" className="underline">Unsplash</a>.</p>}
            {tab === 'brand' && <UploadButton onFiles={(f) => void upload(f)} busy={uploading} />}
            {tab === 'appshot' && <AppShotPanel token={token} campaignId={campaignId} onBuilt={(o) => setPicked((p) => (multiple ? [...p, o] : [o]))} selected={keys} onToggle={toggle} />}
            {(list.error ?? uploadError) && <p role="alert" className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{list.error ?? uploadError}</p>}
            {tab !== 'appshot' && <PhotoOptionGrid options={list.options} loading={list.loading} selected={keys} onToggle={toggle} empty={EMPTY[tab]} />}
            {list.hasMore && (
              <button type="button" onClick={() => void list.more()} disabled={list.loading} className="min-h-11 w-full rounded-xl border border-white/15 text-sm font-semibold text-white/80 transition active:scale-[0.98] disabled:opacity-50">
                {list.loading ? 'Loading…' : 'More photos'}
              </button>
            )}
          </div>
        </div>
        {missing > 0 && (
          <p role="status" className="flex shrink-0 items-center gap-2 border-t border-amber-300/30 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-300">
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
            Add {missing} more {missing === 1 ? 'picture' : 'pictures'}. Recommended
          </p>
        )}
        <footer className="flex shrink-0 items-center gap-3 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto" aria-label="Picked photos">
            {picked.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <li key={p.key} className="h-12 w-[27px] shrink-0 overflow-hidden rounded-md bg-white/10"><img src={p.thumbUrl} alt="" className="h-full w-full object-cover" /></li>
            ))}
            {picked.length === 0 && <li className="self-center text-sm text-white/40">{multiple ? 'Pick one or more photos' : 'Pick a photo'}</li>}
          </ul>
          <button type="button" onClick={() => onDone(picked)} disabled={picked.length === 0} className="min-h-11 shrink-0 rounded-full bg-emerald-400 px-5 text-sm font-semibold text-zinc-950 shadow-sm transition active:scale-95 disabled:opacity-40">
            {picked.length > 1 ? `Add ${picked.length}` : 'Done'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
