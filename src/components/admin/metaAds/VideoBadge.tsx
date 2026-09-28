/** Small play icon on thumbnails of video ads. Other formats get nothing. */
export function VideoBadge({ format, size = 'md' }: { format: string; size?: 'sm' | 'md' }) {
  if (format !== 'VIDEO') return null;
  const box = size === 'sm' ? 'h-4 w-4' : 'h-7 w-7';
  const icon = size === 'sm' ? 8 : 12;
  return (
    <span aria-label="Video ad" className={`pointer-events-none absolute right-1.5 bottom-1.5 flex items-center justify-center rounded-full bg-black/60 text-white backdrop-blur ${box}`}>
      <svg width={icon} height={icon} viewBox="0 0 12 12" aria-hidden>
        <path d="M3 1.8v8.4a.6.6 0 0 0 .9.5l6.9-4.2a.6.6 0 0 0 0-1L3.9 1.3a.6.6 0 0 0-.9.5z" fill="currentColor" />
      </svg>
    </span>
  );
}
