/** Hand-drawn platform marks, in the text color. */
const TikTokMark = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
    <path d="M16.6 2h-3.3v13.2a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9a6.3 6.3 0 1 0 5.3 6.2V8.6a7.6 7.6 0 0 0 4.4 1.4V6.7A4.4 4.4 0 0 1 16.6 2Z" />
  </svg>
);

const InstagramMark = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const YouTubeMark = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
    <path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.2.4-2.5.4-3.8s-.1-2.6-.4-3.8ZM10 15.1V8.9l5.2 3.1L10 15.1Z" />
  </svg>
);

const MusicMark = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const TIKTOK = { name: 'TikTok', Mark: TikTokMark };
const INSTAGRAM = { name: 'Instagram', Mark: InstagramMark };
const YOUTUBE = { name: 'YouTube', Mark: YouTubeMark };

/** The music a slideshow posts with: picked for them. */
const MusicBox = () => (
  <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-app-line px-3 py-2.5 text-app-ink">
    <MusicMark />
    <span className="text-[14px]">Auto selected</span>
  </div>
);

/** Where the post goes out: a video on TikTok, Instagram and YouTube; a slideshow on TikTok and Instagram (YouTube
 *  Shorts takes no photo carousel), with its music. */
export function ScheduledOn({ slideshow }: { slideshow: boolean }) {
  const platforms = slideshow ? [TIKTOK, INSTAGRAM] : [TIKTOK, INSTAGRAM, YOUTUBE];
  return (
    <div className="mt-4">
      <p className="m-0 mb-2 text-[13px] text-app-muted">Scheduled on</p>
      <ul className="m-0 flex list-none gap-2 p-0">
        {platforms.map(({ name, Mark }) => (
          <li key={name} title={name} className="grid h-10 w-10 place-items-center rounded-full border border-app-line text-app-ink">
            <Mark />
            <span className="sr-only">{name}</span>
          </li>
        ))}
      </ul>
      {slideshow && <MusicBox />}
    </div>
  );
}
