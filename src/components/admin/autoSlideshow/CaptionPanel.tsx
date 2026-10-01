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
