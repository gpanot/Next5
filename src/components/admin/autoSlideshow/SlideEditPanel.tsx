'use client';

import { useState, type ReactNode } from 'react';
import type { AutoSlideDto } from '../../../types/admin/autoSlideshow';
import { roleGroup } from './SlideStrip';

type Tool = 'photo' | 'style';

type Props = {
  slide: AutoSlideDto;
  index: number;
  title: string;
  body: string;
  onTitle: (value: string) => void;
  onBody: (value: string) => void;
  /** Hook · Content · CTA, at the start of the top row. */
  tabs: ReactNode;
  /** Rendered at the end of the top row. */
  menu?: ReactNode;
  /** Opened by the "Photo" and "Text style" buttons, under the text. */
  photoPicker: ReactNode;
  stylePicker: ReactNode;
};

const fieldClass = 'w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-white/40 transition focus:border-white/50 focus:outline-none';

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L7 22" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7V5h16v2M9 19h6M12 5v14" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ToolButton({ label, icon, open, onClick }: { label: string; icon: ReactNode; open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition active:scale-95 ${open ? 'border-emerald-400/70 bg-emerald-400/10 text-emerald-300' : 'border-white/15 text-white/80 hover:border-white/30 hover:text-white'}`}
    >
      {icon}
      {label}
      <Chevron open={open} />
    </button>
  );
}

/**
 * The on-screen slide: Hook · Content · CTA tabs, its text, and the "Photo" and "Text style" pickers behind their
 * buttons. Text is saved by the editor's Save button and re-renders that slide only.
 */
export function SlideEditPanel({ slide, index, title, body, onTitle, onBody, tabs, menu, photoPicker, stylePicker }: Props) {
  const [tool, setTool] = useState<Tool | null>(null);
  const toggle = (next: Tool) => setTool((t) => (t === next ? null : next));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {tabs}
        <div className="ml-auto flex items-center gap-2">
          <ToolButton label="Photo" icon={<ImageIcon />} open={tool === 'photo'} onClick={() => toggle('photo')} />
          <ToolButton label="Text style" icon={<TextIcon />} open={tool === 'style'} onClick={() => toggle('style')} />
          {menu}
        </div>
      </div>

      {tool && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          {tool === 'photo' ? photoPicker : stylePicker}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">Slide {index + 1} · {roleGroup(slide.role)}</p>
        <input value={title} onChange={(e) => onTitle(e.target.value)} aria-label="Headline" placeholder="Headline" className={`${fieldClass} font-semibold`} />
        {slide.role !== 'hook' && (
          <textarea value={body} onChange={(e) => onBody(e.target.value)} aria-label="Text under the headline" placeholder="One short line" rows={3} className={fieldClass} />
        )}
      </div>
    </div>
  );
}
