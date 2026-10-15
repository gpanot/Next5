'use client';

type Props = { caption: string; tags: string; onCaption: (value: string) => void; onTags: (value: string) => void };

const fieldClass = 'w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-base text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none';

/** Caption and hashtags. Saved by the editor's Save button. */
export function CaptionPanel({ caption, tags, onCaption, onTags }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">Caption</p>
      <textarea value={caption} onChange={(e) => onCaption(e.target.value)} rows={2} aria-label="Caption" className={fieldClass} />
      <input value={tags} onChange={(e) => onTags(e.target.value)} aria-label="Hashtags" placeholder="#golf #golftips" className={fieldClass} />
    </div>
  );
}

/** Under the caption while it has unsaved edits: stores them, so the post goes out with them. */
export function SaveCaptionButton({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 text-sm font-semibold text-white transition hover:bg-emerald-400 active:scale-95 disabled:opacity-50"
    >
      {saving && <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {saving ? 'Saving…' : 'Save caption'}
    </button>
  );
}
