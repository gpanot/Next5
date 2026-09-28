/** Demo-only site header for the standalone Perfect Ads page. Pricing and Log in are plain text, not links. */
function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" rx="8" className="fill-blue-600" />
      <path d="M9 19V9h5.5a3.5 3.5 0 0 1 0 7H9" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="19.5" cy="19.5" r="1.8" fill="white" />
    </svg>
  );
}

export function SiteTopBar() {
  return (
    <header className="border-b border-line/60 bg-white/80 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <span className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[17px] font-bold tracking-tight text-ink dark:text-zinc-100">Perfect Ads</span>
        </span>
        <nav className="flex items-center gap-2 text-sm font-medium">
          <span className="cursor-default px-3 py-2 text-muted transition-colors hover:text-ink dark:text-zinc-400 dark:hover:text-zinc-100">Pricing</span>
          <span className="cursor-default rounded-full border border-line px-4 py-2 text-ink transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900">Log in</span>
        </nav>
      </div>
    </header>
  );
}
