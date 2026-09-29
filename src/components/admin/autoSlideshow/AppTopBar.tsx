import { BusinessLogo } from '../../marketing/shared/MarketingHeader';

/**
 * Top bar for the standalone Auto Slideshow page, styled like the app shell (/app) so a screen recording reads as the
 * Next5 app: the "NEXT5 for business" logo, then the page name.
 */
export function AppTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-app-line bg-app-bg/90 px-5 backdrop-blur-md sm:px-8">
      <BusinessLogo />
      <span aria-hidden className="h-7 w-px bg-app-line" />
      <span className="text-[15px] font-semibold text-app-ink">Auto Slideshow</span>
    </header>
  );
}
