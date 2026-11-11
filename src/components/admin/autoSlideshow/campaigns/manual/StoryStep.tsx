'use client';

import { useState } from 'react';
import type { ManualDraftDto } from '../../../../../types/admin/autoSlideshow';
import { ChatBox } from './ChatBox';
import type { ManualBusy } from './useManualDraft';

const STORY_IDEAS = ['Make the hook stronger', 'Shorter text', 'More personal', 'Make it funnier'];

const ROLE_LABEL: Record<string, string> = { hook: 'Hook', cta: 'Last slide' };

const field = 'w-full rounded-xl border border-app-line bg-app-panel px-3 py-2 text-base text-app-ink focus:border-app-cta focus:outline-none sm:text-sm';

type Slide = ManualDraftDto['slides'][number];

type SlideProps = { slide: Slide; index: number; disabled: boolean; onSave: (index: number, title: string, body: string) => Promise<boolean> };

/** One slide of the story: its text, and a pencil that opens it for typing. */
function StorySlide({ slide, index, disabled, onSave }: SlideProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(slide.title);
  const [body, setBody] = useState(slide.body);
  const open = () => {
    setTitle(slide.title);
    setBody(slide.body);
    setEditing(true);
  };
  const save = async () => {
    if (await onSave(index, title, body)) setEditing(false);
  };
  return (
    <li className="flex flex-col rounded-xl border border-app-line bg-app-panel p-3 shadow-sm lg:min-h-56">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">{index + 1} · {ROLE_LABEL[slide.role] ?? 'Slide'}</span>
        {!editing && (
          <button type="button" onClick={open} disabled={disabled} aria-label={`Edit slide ${index + 1}`}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-app-muted transition hover:bg-app-sunken hover:text-app-ink active:scale-95 disabled:opacity-40">
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" /></svg>
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex flex-1 flex-col gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} aria-label="Headline" className={`${field} font-semibold`} />
          {slide.role !== 'hook' && <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 220))} rows={4} aria-label="Text" className={`${field} flex-1 resize-none`} />}
          <div className="mt-auto flex gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={disabled} className="min-h-10 flex-1 rounded-full border border-app-line text-sm font-semibold text-app-ink transition hover:bg-app-sunken active:scale-95">Cancel</button>
            <button type="button" onClick={() => void save()} disabled={disabled || !title.trim()} className="min-h-10 flex-1 rounded-full bg-app-cta text-sm font-semibold text-app-cta-ink transition active:scale-95 disabled:opacity-40">Save</button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-base font-semibold text-app-ink">{slide.title}</p>
          {slide.body && <p className="mt-0.5 text-sm text-app-muted">{slide.body}</p>}
        </>
      )}
    </li>
  );
}

const actionButton = 'min-h-12 flex-1 rounded-full px-5 text-sm font-semibold transition active:scale-95 disabled:opacity-40 sm:flex-none';

type Props = {
  draft: ManualDraftDto;
  busy: ManualBusy;
  onRequest: (request: string) => Promise<boolean>;
  onText: (index: number, title: string, body: string) => Promise<boolean>;
};

/** Step 2: the story, slide by slide. Change it by chat or by typing (the buttons are in the wizard's footer). */
export function StoryStep({ draft, busy, onRequest, onText }: Props) {
  const working = busy !== null;
  const rewriting = busy === 'request' || busy === 'another';
  return (
    <div className="space-y-4">
      <p className="text-sm text-app-muted">
        Read your story{draft.castName ? <>, told by <span className="font-semibold text-app-ink">{draft.castName}</span></> : null}. Change anything, then approve it.
      </p>
      {/* Phones: one column. Tablets: two. Desktops: every slide side by side, in reading order, scrolling past ~7. */}
      <ol className={`grid gap-2 sm:grid-cols-2 lg:auto-cols-[minmax(10.5rem,1fr)] lg:grid-flow-col lg:grid-cols-none lg:overflow-x-auto lg:pb-2 transition-opacity ${rewriting ? 'animate-pulse opacity-60' : ''}`} aria-busy={rewriting}>
        {draft.slides.map((slide, i) => (
          <StorySlide key={`${draft.id}-${i}-${slide.title}`} slide={slide} index={i} disabled={working} onSave={onText} />
        ))}
      </ol>
      <ChatBox label="Ask for a change" placeholder="e.g. Talk about busy moms" ideas={STORY_IDEAS} disabled={working} busy={busy === 'request'} onSend={onRequest} />
    </div>
  );
}

type ActionProps = { busy: ManualBusy; onAnother: () => void; onApprove: () => void };

/** The story step's footer buttons: another story from the bank, or approve this one. */
export function StoryActions({ busy, onAnother, onApprove }: ActionProps) {
  const working = busy !== null;
  return (
    <>
      <button type="button" onClick={onAnother} disabled={working} className={`${actionButton} border border-app-line text-app-ink hover:bg-app-sunken`}>
        {busy === 'another' ? 'Finding one…' : 'Try another story'}
      </button>
      <button type="button" onClick={onApprove} disabled={working} className={`${actionButton} bg-app-cta text-app-cta-ink shadow-sm`}>
        {busy === 'approve' ? 'Making the first photo… (~1 min)' : 'Approve story'}
      </button>
    </>
  );
}
