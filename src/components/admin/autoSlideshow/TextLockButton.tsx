'use client';

type Props = { locked: boolean; onToggle: () => void };

/**
 * A content slide's text lock, on its card: closed, its text moves up and down with the other locked content slides;
 * open, it moves alone.
 */
export function TextLockButton({ locked, onToggle }: Props) {
  const label = locked ? 'Text moves with the other content slides. Tap to move it alone.' : 'Text moves alone. Tap to move it with the other content slides.';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={locked}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg backdrop-blur-sm transition active:scale-90 ${
        locked ? 'bg-black/70 text-emerald-300 hover:bg-black/80' : 'bg-black/50 text-white/60 hover:bg-black/70 hover:text-white'
      }`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d={locked ? 'M8 11V7a4 4 0 0 1 8 0v4' : 'M8 11V7a4 4 0 0 1 7.5-2'} />
      </svg>
    </button>
  );
}
