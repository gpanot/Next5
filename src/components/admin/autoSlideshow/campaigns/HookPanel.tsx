'use client';

import { useState, type FormEvent } from 'react';
import { MAX_CAMPAIGN_HOOK_PHOTOS, MAX_CAMPAIGN_HOOKS, MAX_HOOK_CHARS, type CampaignDraft, type CampaignPhotoDto } from '../../../../types/admin/slideshowCampaign';
import { PhotoThumb } from './PhotoThumb';

type Props = {
  draft: CampaignDraft;
  photos: CampaignPhotoDto[];
  importing: boolean;
  onChange: (update: (d: CampaignDraft) => CampaignDraft) => void;
  onAddPhotos: () => void;
};

const chip = 'inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/5 pr-1 pl-3 text-sm text-white/90';

/** What the person sees about the rotation: how many slideshows, and how photos pair with hooks. */
const rotationNote = (hooks: number, photos: number): string => {
  if (hooks === 0) return 'Every post opens with a hook line. Add more to rotate: one slideshow per hook.';
  const posts = `${hooks} ${hooks === 1 ? 'hook' : 'hooks'}, ${hooks === 1 ? 'one slideshow' : `${hooks} slideshows`}`;
  if (photos === 0) return `${posts}. Add photos for the hook slide.`;
  if (photos < hooks) return `${posts}. ${photos} ${photos === 1 ? 'photo' : 'photos'} repeat in turn.`;
  if (photos > hooks) return `${posts}. Only the first ${hooks} photos are used.`;
  return `${posts}, each on its own photo.`;
};

function HookInput({ disabled, onAdd }: { disabled: boolean; onAdd: (line: string) => void }) {
  const [text, setText] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText('');
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_HOOK_CHARS}
        disabled={disabled}
        placeholder="Type a hook, press Enter to add"
        className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-base text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none disabled:opacity-50"
      />
      <button type="submit" disabled={disabled || !text.trim()} aria-label="Add hook" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 text-xl text-white/80 transition active:scale-95 disabled:opacity-40">+</button>
    </form>
  );
}

/** The hook slide: hook lines (one slideshow each) and the photos they rotate on. */
export function HookPanel({ draft, photos, importing, onChange, onAddPhotos }: Props) {
  const fullHooks = draft.hooks.length >= MAX_CAMPAIGN_HOOKS;
  const fullPhotos = draft.hookPhotos.length >= MAX_CAMPAIGN_HOOK_PHOTOS;
  const addHook = (line: string) => onChange((d) => (d.hooks.includes(line) ? d : { ...d, hooks: [...d.hooks, line] }));
  const removeHook = (i: number) => onChange((d) => ({ ...d, hooks: d.hooks.filter((_, j) => j !== i) }));
  const removePhoto = (i: number) => onChange((d) => ({ ...d, hookPhotos: d.hookPhotos.filter((_, j) => j !== i) }));

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <HookInput disabled={fullHooks} onAdd={addHook} />
        <p className="text-sm text-white/55">{rotationNote(draft.hooks.length, draft.hookPhotos.length)}</p>
        {draft.hooks.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {draft.hooks.map((h, i) => (
              <li key={h} className={chip}>
                <span className="text-xs font-bold text-white/40">{i + 1}</span>
                <span className="truncate">{h}</span>
                <button type="button" onClick={() => removeHook(i)} aria-label={`Remove hook ${i + 1}`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white">✕</button>
              </li>
            ))}
          </ul>
        )}
        {draft.hooks.length === 0 && <p className="text-sm text-amber-300">The hook slide needs at least one line. Type one above.</p>}
      </section>

      <section className="space-y-2">
        <p className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">Hook photos · rotate in order</p>
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <li>
            <button type="button" onClick={onAddPhotos} disabled={importing || fullPhotos} className="flex h-28 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/30 text-[11px] font-semibold text-white/80 transition active:scale-95 disabled:opacity-40">
              {importing ? <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <span className="text-lg leading-none">+</span>}
              {importing ? 'Adding…' : 'Add'}
            </button>
          </li>
          {draft.hookPhotos.map((p, i) => (
            <li key={`${p}-${i}`}>
              <PhotoThumb url={photos[p]?.url ?? null} number={i + 1} credit={photos[p]?.credit ?? null} onRemove={() => removePhoto(i)} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
