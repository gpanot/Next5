'use client';

import { useRef, useState, type FormEvent } from 'react';
import type { CopyViralProject } from '../../../types/admin/copyViral';
import { createFromUpload, createFromUrl } from './useCopyViral';

/** Paste a TikTok/Instagram reel link, or upload the video when the link cannot be fetched. */
export function NewProjectForm({ token, onCreated }: { token: string; onCreated: (project: CopyViralProject) => void }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<'url' | 'upload' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const run = async (kind: 'url' | 'upload', create: () => Promise<CopyViralProject>) => {
    setBusy(kind);
    setError(null);
    try {
      onCreated(await create());
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (url.trim()) void run('url', async () => (await createFromUrl(token, url.trim())).project);
  };

  const upload = (file: File | undefined) => {
    if (file) void run('upload', () => createFromUpload(token, file));
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <div className="space-y-2 rounded-xl border border-app-line bg-app-panel p-4 shadow-sm">
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.instagram.com/reel/… or https://www.tiktok.com/@…/video/…"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-app-line bg-app-sunken px-3 text-sm text-app-ink outline-none transition focus:border-app-ink"
        />
        <button type="submit" disabled={!url.trim() || busy !== null} className="min-h-11 rounded-xl bg-app-cta px-5 text-sm font-bold text-app-cta-ink shadow-sm transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40">
          {busy === 'url' ? 'Getting the reel…' : 'Copy this reel'}
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} disabled={busy !== null} className="min-h-11 rounded-xl border border-app-line px-4 text-sm font-semibold text-app-ink transition hover:bg-app-sunken disabled:opacity-40">
          {busy === 'upload' ? 'Uploading…' : 'Upload video'}
        </button>
        <input ref={fileInput} type="file" accept="video/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      </form>
      <p className="text-xs text-app-muted">Link via treg (about $0.0015). If the link fails, save the reel and upload it.</p>
      {error && <p className="text-sm text-app-danger">{error}</p>}
    </div>
  );
}
