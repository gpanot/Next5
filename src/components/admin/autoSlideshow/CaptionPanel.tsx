'use client';

import { useState } from 'react';
import type { AutoSlideshowDto } from '../../../types/admin/autoSlideshow';

type Props = { show: AutoSlideshowDto; busy: string | null; onSave: (caption: string, hashtags: string[]) => void };

const fieldClass = 'w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-base text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none';

const parseTags = (text: string) => text.split(/[\s,]+/).map((t) => t.replace(/^#+/, '')).filter(Boolean);

/** Caption and hashtags: edit, save, copy for TikTok. */
export function CaptionPanel({ show, busy, onSave }: Props) {
  const [caption, setCaption] = useState(show.caption);
  const [tags, setTags] = useState(show.hashtags.map((h) => `#${h}`).join(' '));
  const [copied, setCopied] = useState(false);
  const dirty = caption.trim() !== show.caption || parseTags(tags).join(' ') !== show.hashtags.join(' ');

  const copy = async () => {
    await navigator.clipboard.writeText([caption.trim(), parseTags(tags).map((t) => `#${t}`).join(' ')].filter(Boolean).join('\n\n')).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">Caption</p>
      <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} aria-label="Caption" className={fieldClass} />
      <input value={tags} onChange={(e) => setTags(e.target.value)} aria-label="Hashtags" placeholder="#golf #golftips" className={fieldClass} />
      <div className="flex gap-2">
        <button
          disabled={busy !== null || !dirty}
          onClick={() => onSave(caption, parseTags(tags))}
          className="min-h-11 flex-1 rounded-full border border-white/30 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-30"
        >
          {busy === 'caption' ? 'Saving…' : 'Save caption'}
        </button>
        <button onClick={() => void copy()} className="min-h-11 flex-1 rounded-full bg-white text-sm font-semibold text-black transition active:scale-95">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
