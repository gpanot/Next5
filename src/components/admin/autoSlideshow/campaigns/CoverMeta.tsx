'use client';

/**
 * The lines under a 9:16 cover, the same on Hooks Volume and Brand Cast: the name, then when it posts. Nothing on the
 * calendar yet: a small "Add to Calendar" that opens the editor, where Schedule is.
 */
export function CoverMeta({ title, when, onOpen }: { title: string; when: string | null; onOpen: () => void }) {
  return (
    <div className="mt-2">
      <button type="button" tabIndex={-1} aria-hidden onClick={onOpen} className="block w-full text-left">
        <span className="block truncate text-sm font-semibold text-app-ink">{title}</span>
      </button>
      {when ? (
        <span className="block truncate text-xs text-app-muted">{when}</span>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="mt-1 inline-flex min-h-7 items-center gap-1 rounded-full border border-app-line bg-app-panel px-2.5 text-xs font-semibold text-app-ink shadow-sm transition hover:border-app-muted active:scale-95"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4.5" width="14" height="12" rx="2" />
            <path d="M3 8.5h14M7 3v3M13 3v3M10 11v3M8.5 12.5h3" />
          </svg>
          Add to Calendar
        </button>
      )}
    </div>
  );
}
