'use client';

type Props = { rendering: boolean; disabled: boolean; onClick: () => void };

/** Download icon under the preview: makes the slideshow's MP4 (about a minute the first time) and saves it. */
export function VideoButton({ rendering, disabled, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || rendering}
      aria-label={rendering ? 'Making video' : 'Download video'}
      title={rendering ? 'Making your video… about a minute' : 'Download as video (MP4)'}
      className={`flex h-10 min-w-10 items-center justify-center gap-2 rounded-full px-2.5 text-white/70 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:active:scale-100 ${rendering ? '' : 'disabled:opacity-30'}`}
    >
      {rendering ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
          <span className="text-xs">Making video…</span>
        </>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
      )}
    </button>
  );
}
