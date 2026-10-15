'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** A box in the editor: the slide panel, the Post and Schedule aside. */
export const editorCard = 'rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-sm';

/** A top-bar button with an icon and a label that hides on phones (Preview, Send). */
export const topBarButton =
  'flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-white/15 px-3 text-sm font-semibold text-white/85 transition hover:bg-white/5 active:scale-95 disabled:opacity-40 sm:px-4';

type FrameProps = {
  /** The dialog's name for screen readers. */
  label: string;
  backLabel: string;
  onBack: () => void;
  /** Left of the actions: the campaign name or the slideshow's topic. */
  title: ReactNode;
  /** Right of the title: save state, safe zone, Preview, Schedule or Send. */
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Every slideshow editor's full screen frame, phone first: a top bar (Back, title, actions) over the editor. On <body>:
 * the workspace page's own layers must never cover the editor or its top bar.
 */
export function EditorFrame({ label, backLabel, onBack, title, actions, children }: FrameProps) {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950 text-white" role="dialog" aria-modal="true" aria-label={label}>
      <header className="flex min-h-16 shrink-0 items-center gap-2 border-b border-white/10 px-2 sm:px-4">
        <button onClick={onBack} aria-label={backLabel} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1">{title}</div>
        {actions}
      </header>
      {children}
    </div>,
    document.body,
  );
}

type BodyProps = {
  /** The player: left on wide screens, on top on phones. */
  player: ReactNode;
  /** Every slide as a card, above the panels. */
  strip: ReactNode;
  /** The selected slide's panel (and what goes under it). */
  main: ReactNode;
  /** Right of the panel on wide screens, below it on phones. */
  aside?: ReactNode;
};

/** The editor's body: the player, then the slide strip over the slide panel and its aside. */
export function EditorBody({ player, strip, main, aside }: BodyProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
      <div className="shrink-0 p-4 md:flex md:w-[30%] md:flex-col md:justify-center md:overflow-y-auto lg:w-[27%]">{player}</div>
      <div className="min-w-0 md:flex-1 md:overflow-y-auto md:border-l md:border-white/10">
        <div className="border-b border-white/10 bg-black/20 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:16px_16px]">{strip}</div>
        <div className={`mx-auto grid max-w-7xl gap-4 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] ${aside ? 'xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] xl:items-start' : ''}`}>
          <div className="min-w-0 space-y-4">{main}</div>
          {aside}
        </div>
      </div>
    </div>
  );
}

/** The aside box with its title: sticky beside the panel on wide screens. */
export function EditorAside({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside aria-label={title} className={`${editorCard} xl:sticky xl:top-4`}>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <div className="mt-3">{children}</div>
    </aside>
  );
}

/** Loading or failed, before the editor has its data. */
export function EditorPlaceholder({ error }: { error: string | null }) {
  return error ? <p className="m-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{error}</p> : <div className="m-4 h-72 animate-pulse rounded-xl bg-white/5" />;
}

type AlertProps = { message: string; onDismiss?: () => void; action?: ReactNode };

/** A failed action, over the slide panel: its message, an optional action (Add Credit), and a dismiss. */
export function EditorAlert({ message, onDismiss, action }: AlertProps) {
  return (
    <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-red-500/15 p-3 text-sm text-red-300">
      <span className="flex-1 self-center">{message}</span>
      {action}
      {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-red-200">✕</button>}
    </p>
  );
}
