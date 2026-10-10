'use client';

import { ImagePlus, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { BrandCastMemberDto } from '../../../../types/admin/brandCast';
import { Dialog } from '../../../ui/Dialog';

const MAX_NOTE = 300;

export type NewFaceRequest = { note: string; file: File | null };

type Props = {
  member: BrandCastMemberDto | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (request: NewFaceRequest) => void;
};

/** The photo picked as a reference, shown small with ✕ to remove it. */
function PhotoPick({ file, onPick, onClear }: { file: File | null; onPick: (f: File) => void; onClear: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (picked) onPick(picked);
  };
  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept="image/*" hidden onChange={onFiles} />
      {file && preview ? (
        <div className="relative h-32 w-24 overflow-hidden rounded-xl bg-app-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Your reference photo" className="h-full w-full object-cover" />
          <button type="button" onClick={onClear} aria-label="Remove the photo" className="absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 active:scale-90">
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => input.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-app-line px-4 text-sm font-semibold text-app-ink transition hover:bg-app-sunken active:scale-95">
          <ImagePlus aria-hidden className="h-4 w-4" /> Upload a photo
        </button>
      )}
      <p className="text-xs text-app-muted">We’ll make a new person from your photo. Only use a photo of yourself, or of someone who said yes.</p>
    </div>
  );
}

/** "New face": what to change (face or outfit), or a reference photo; "Surprise me" for a different person. Mount it
 *  with `key={member.id}` so each opening starts empty. */
export function NewFaceDialog({ member, busy, error, onClose, onSubmit }: Props) {
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const firstName = member?.name.split(',')[0] ?? '';
  const ready = note.trim().length > 0 || file !== null;
  const close = () => {
    if (!busy) onClose();
  };
  return (
    <Dialog open={member !== null} onClose={close} title={`Change ${firstName}`} description="Tell us what’s off, or show us a photo. We’ll make a new look.">
      <div className="space-y-5">
        <label className="block space-y-1.5">
          <span className="block text-sm font-semibold text-app-ink">What would you like to change? Describe the face or the outfit.</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE))}
            rows={3}
            placeholder="e.g. Same face, but wearing our red leggings and sports bra"
            className="w-full rounded-xl border border-app-line bg-app-panel px-3 py-2 text-base text-app-ink transition focus:border-app-ink focus:outline-none sm:text-sm"
          />
        </label>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-app-ink">Or upload a photo reference</p>
          <PhotoPick file={file} onPick={setFile} onClear={() => setFile(null)} />
        </div>
        {error && <p role="alert" className="text-sm text-app-danger">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => onSubmit({ note: '', file: null })} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold text-app-muted transition hover:bg-app-sunken hover:text-app-ink active:scale-95 disabled:opacity-40">
            <Sparkles aria-hidden className="h-4 w-4" /> Surprise me
          </button>
          <button type="button" onClick={() => onSubmit({ note, file })} disabled={busy || !ready} className="inline-flex min-h-11 items-center justify-center rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95 disabled:opacity-40">
            {busy ? 'Starting…' : 'Make new look'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
