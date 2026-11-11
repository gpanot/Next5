'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '../business/useAdminApi';

type CastOption = { id: string; name: string; look: string; imageUrl: string };
type Options = { prompt: string; castId: string | null; cast: CastOption[] };
export type NewPhotoChoice = { prompt: string; castId: string | null };

type Props = {
  token: string;
  /** The slide's photo route: /api/admin/auto-slideshow/runs/[runId]/slideshows/[id]/slides/[index]/photo. */
  path: string;
  slideNumber: number;
  onClose: () => void;
  onGenerate: (choice: NewPhotoChoice) => void;
};

/** The look as a slideshow prompt carries it: the member's everyday style is for their anchor photo only (photoPlan.ts). */
const promptLook = (look: string) => look.replace(/\s*(Everyday style|Outfit):.*$/, '');

/** The prompt with `from`'s description swapped for `to`'s (or dropped for nobody), so text and reference agree. */
export const swapPerson = (prompt: string, from: CastOption | undefined, to: CastOption | undefined): string => {
  const said = from ? `The main person: ${promptLook(from.look)}` : null;
  const next = to ? `The main person: ${promptLook(to.look)}` : '';
  if (said && prompt.includes(said)) return prompt.replace(said, next).replace(/\s{2,}/g, ' ').trim();
  return next ? `${prompt.trim()} ${next}` : prompt;
};

function PersonButton({ on, label, imageUrl, onClick }: { on: boolean; label: string; imageUrl: string | null; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center transition active:scale-95">
      <span className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 bg-white/5 ${on ? 'border-emerald-400' : 'border-white/10'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover object-top" /> : <span className="text-xs text-white/50">None</span>}
      </span>
      <span className={`line-clamp-2 text-[11px] leading-tight ${on ? 'font-semibold text-white' : 'text-white/60'}`}>{label}</span>
    </button>
  );
}

/** "Generate New": pick the avatar (the slide's own is selected) and read or fix the prompt before the photo is made. */
export function NewPhotoDialog({ token, path, slideNumber, onClose, onGenerate }: Props) {
  const [options, setOptions] = useState<Options | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [castId, setCastId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    let live = true;
    adminFetch<Options>(token, path)
      .then((o) => live && (setOptions(o), setCastId(o.castId), setPrompt(o.prompt)))
      .catch((err) => live && setError(err instanceof Error ? err.message : 'Could not load the prompt.'));
    return () => void (live = false);
  }, [token, path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pick = (id: string | null) => {
    if (!options || id === castId) return;
    const byId = (x: string | null) => options.cast.find((m) => m.id === x);
    setPrompt((p) => swapPerson(p, byId(castId), byId(id)));
    setCastId(id);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="new-photo-title" onClick={(e) => e.stopPropagation()} className="max-h-[90dvh] w-full max-w-md space-y-5 overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white shadow-xl sm:rounded-2xl">
        <div className="relative pr-10">
          <h2 id="new-photo-title" className="text-lg font-bold">New photo for slide {slideNumber}</h2>
          <p className="mt-1 text-sm text-white/60">Pick who is in it and fix the description if the last photos came out wrong.</p>
          <button type="button" onClick={onClose} aria-label="Close" className="absolute -top-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95">✕</button>
        </div>
        {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        {!options && !error && <div className="space-y-3" aria-busy><div className="h-20 animate-pulse rounded-xl bg-white/10" /><div className="h-36 animate-pulse rounded-xl bg-white/10" /></div>}
        {options && (
          <>
            <fieldset>
              <legend className="text-sm font-semibold">Avatar</legend>
              <div role="radiogroup" aria-label="Avatar" className="-mx-1 mt-2 flex gap-3 overflow-x-auto px-1 pb-1">
                {options.cast.map((m) => <PersonButton key={m.id} on={castId === m.id} label={m.name} imageUrl={m.imageUrl} onClick={() => pick(m.id)} />)}
                <PersonButton on={castId === null} label="No avatar" imageUrl={null} onClick={() => pick(null)} />
              </div>
            </fieldset>
            <label className="block">
              <span className="text-sm font-semibold">Prompt</span>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={8} maxLength={2000} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm leading-relaxed text-white outline-none focus:border-emerald-400" />
              <span className="mt-1 block text-xs text-white/40">Describe the scene, the pose and what the person is doing. The avatar&apos;s face comes from their photo.</span>
            </label>
            <button
              type="button"
              disabled={!prompt.trim()}
              onClick={() => onGenerate({ prompt, castId })}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 shadow-sm transition active:scale-95 disabled:opacity-60"
            >
              Generate photo
            </button>
          </>
        )}
        {!options && error && <button type="button" onClick={onClose} className="flex min-h-12 w-full items-center justify-center rounded-full border border-white/15 text-sm font-semibold">Close</button>}
      </div>
    </div>
  );
}
