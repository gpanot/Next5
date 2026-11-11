'use client';

import { useState, type CSSProperties } from 'react';

export const scriptWords = (line: string) => line.split(/\s+/).filter(Boolean);

/** The line's words grouped by the lines typed in "My line" (a return starts a new teleprompter line). */
const scriptLines = (text: string) => text.split('\n').map(scriptWords).filter((l) => l.length);

type Props = {
  /** Shot number, from 0. */
  index: number;
  /** What I say in this shot (my line, else the original transcript). */
  text: string;
  onScreenText: string;
  /** The next shot's line, dimmed under this one. */
  next: string | null;
  read: number;
  follow: boolean;
  /** 1 = default size. */
  scale: number;
  /** False while recording or reviewing a take: the line can't be edited then. */
  editable: boolean;
  onSave: (text: string) => Promise<void>;
};

/** Line size in rem at scale 1: long lines (a 15 s shot) are smaller so most of the line fits on screen. */
const lineRem = (words: number) => (words > 45 ? 1.8 : words > 25 ? 2.4 : 3);

/** Column width in rem at scale 1: smaller text gets a narrower column, so the eyes stay near the camera. */
const COLUMN_REM = 40;

/** The line in a textarea: a return is a new line, ⌘↵ saves, Esc cancels. */
function LineEditor({ text, scale, onSave, onDone }: { text: string; scale: number; onSave: (text: string) => Promise<void>; onDone: () => void }) {
  const [draft, setDraft] = useState(text);
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');
  const save = async () => {
    if (draft === text) return onDone();
    setState('saving');
    try {
      await onSave(draft);
      onDone();
    } catch {
      setState('error');
    }
  };
  return (
    <div className="space-y-3 text-left">
      <textarea
        autoFocus
        value={draft}
        rows={Math.max(3, draft.split('\n').length + 1)}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void save();
          else if (e.key === 'Escape') onDone();
        }}
        className="w-full resize-y rounded-xl border border-white/20 bg-black/40 px-4 py-3 leading-snug font-bold text-white outline-none transition focus:border-white/50"
        style={{ fontSize: `${1.5 * scale}rem` }}
      />
      <div className="flex items-center justify-end gap-2 text-sm">
        <span className={`mr-auto ${state === 'error' ? 'text-red-400' : 'text-white/40'}`}>
          {state === 'error' ? 'Not saved: try again' : 'Return: new line · ⌘↵ save · Esc cancel'}
        </span>
        <button type="button" onClick={onDone} className="rounded-lg border border-white/15 px-3 py-1.5 transition hover:bg-white/10">Cancel</button>
        <button type="button" onClick={save} disabled={state === 'saving'} className="rounded-lg bg-white px-4 py-1.5 font-bold text-black transition hover:bg-white/85 disabled:opacity-60">
          {state === 'saving' ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

/** The line's words, one paragraph per typed line; word numbers run across lines for voice follow. */
function Lines({ text, read, follow, scale }: { text: string; read: number; follow: boolean; scale: number }) {
  const lines = scriptLines(text);
  const total = lines.reduce((n, l) => n + l.length, 0);
  const starts = lines.map((_, li) => lines.slice(0, li).reduce((n, l) => n + l.length, 0));
  return (
    <div className="leading-[1.12] font-bold tracking-tight" style={{ fontSize: `${lineRem(total) * scale}rem` }}>
      {lines.length === 0 && <p className="text-white/50">(no speech: act it out)</p>}
      {lines.map((words, li) => (
        <p key={li}>
          {words.map((w, i) => (
            <span key={i} className={`transition-colors duration-150 ${!follow || starts[li] + i < read ? 'text-white' : 'text-white/45'}`}>
              {w}{' '}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

/**
 * The shot's line near the top of the screen (close to the camera, so the eyes don't read down), the next shot dimmed
 * under it. Each line typed in "My line" stays its own line. `scale` sizes the text (right panel). With voice follow on,
 * the words already said turn white; the text never scrolls. "Edit" changes the line here and saves it to the shot.
 */
export function Teleprompter({ index, text, onScreenText, next, read, follow, scale, editable, onSave }: Props) {
  const [editing, setEditing] = useState(false);

  return (
    // Centered on the screen (where the webcam is), not on this area: on lg the 20rem settings panel sits on the right,
    // so the column moves 10rem right and is never wider than the room left of the panel. It starts right under the
    // top bar.
    <div
      className="mx-auto w-full max-w-[var(--col)] space-y-10 px-6 pt-2 pb-8 text-center lg:max-w-[min(var(--col),calc(100vw-43rem))] lg:translate-x-40"
      style={{ '--col': `${COLUMN_REM * scale}rem` } as CSSProperties}
    >
      <div className="space-y-2 rounded-2xl border border-red-500/40 bg-white/[0.03] p-6">
        <div className="relative">
          <p className="font-mono text-sm text-red-400">{String(index + 1).padStart(2, '0')}</p>
          {editable && !editing && (
            <button type="button" onClick={() => setEditing(true)} className="absolute top-0 right-0 rounded-lg border border-white/15 px-2.5 py-0.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white">
              ✎ Edit
            </button>
          )}
        </div>
        {editing && editable
          ? <LineEditor key={index} text={text} scale={scale} onSave={onSave} onDone={() => setEditing(false)} />
          : <Lines text={text} read={read} follow={follow} scale={scale} />}
      </div>
      {onScreenText && <p className="text-sm text-white/40">On screen: {onScreenText.replace(/\n/g, ' · ')}</p>}
      {next !== null && (
        <div className="space-y-2 opacity-30">
          <p className="font-mono text-sm text-white/60">{String(index + 2).padStart(2, '0')}</p>
          <p className="leading-tight font-bold whitespace-pre-line text-white/70" style={{ fontSize: `${1.8 * scale}rem` }}>{next || '(no speech)'}</p>
        </div>
      )}
    </div>
  );
}
