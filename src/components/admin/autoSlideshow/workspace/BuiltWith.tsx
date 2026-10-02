import type { ReactNode } from 'react';
import { InstagramGlyph, TikTokGlyph } from './PlatformBadges';

/** Treg's official bee mark, copied from treg.dev. */
const TregLogo = () => (
  <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
    <defs>
      <linearGradient id="builtWithTregHex" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffc107" />
        <stop offset="1" stopColor="#c77800" />
      </linearGradient>
    </defs>
    <path d="M16 1.5 28.6 8.75v14.5L16 30.5 3.4 23.25V8.75z" fill="url(#builtWithTregHex)" stroke="#3e2723" strokeWidth="1.2" strokeLinejoin="round" />
    <ellipse cx="12.2" cy="11.6" rx="3" ry="2" fill="#fff8e1" opacity=".9" transform="rotate(-22 12.2 11.6)" />
    <ellipse cx="19.8" cy="11.6" rx="3" ry="2" fill="#fff8e1" opacity=".9" transform="rotate(22 19.8 11.6)" />
    <ellipse cx="16" cy="18" rx="5.4" ry="6.6" fill="#3e2723" />
    <path d="M11.1 15.2h9.8M10.9 19h10.2m-8.8 3.7h7.4" stroke="#ffc107" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M14 12.2c-1-1.4-1.8-1.8-3-1.9m7 1.9c1-1.4 1.8-1.8 3-1.9" stroke="#3e2723" strokeWidth="1.1" strokeLinecap="round" fill="none" />
  </svg>
);

/** Jev's official mark (TypeSafe AI), from public/images/brand-logos/jev.png. */
const JevLogo = () => <img src="/images/brand-logos/jev.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full" />;

const GrokLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
    <path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815" />
  </svg>
);

const ChatGptLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
  </svg>
);

type Tool = { name: string; logo: ReactNode; tile: string };

const TOOLS: readonly Tool[] = [
  { name: 'Treg', logo: <TregLogo />, tile: 'bg-white ring-1 ring-line dark:bg-zinc-900 dark:ring-zinc-800' },
  { name: 'Jev', logo: <JevLogo />, tile: 'bg-white ring-1 ring-line dark:bg-zinc-900 dark:ring-zinc-800' },
  { name: 'Grok', logo: <GrokLogo />, tile: 'bg-black text-white ring-1 ring-white/10' },
  { name: 'ChatGPT', logo: <ChatGptLogo />, tile: 'bg-black text-white ring-1 ring-white/10' },
  { name: 'TikTok', logo: <TikTokGlyph className="h-5 w-5" />, tile: 'bg-black text-white ring-1 ring-white/10' },
  { name: 'Instagram', logo: <InstagramGlyph className="h-5 w-5" />, tile: 'bg-[linear-gradient(45deg,#feda75_0%,#fa7e1e_25%,#d62976_50%,#962fbf_75%,#4f5bd5_100%)] text-white' },
];

/** "Build with" logo row at the bottom of the /slideshow home: the tools and platforms behind Auto Slideshow. */
export function BuiltWith() {
  return (
    <section aria-labelledby="slideshow-built-with" className="relative mx-auto w-full max-w-4xl pb-12 md:pb-16">
      <div data-reveal="" className="flex flex-col items-center gap-5 text-center">
        <h2 id="slideshow-built-with" className="text-sm font-semibold tracking-wide text-muted uppercase dark:text-zinc-400">Build with</h2>
        <ul className="flex flex-wrap items-start justify-center gap-x-5 gap-y-4 md:gap-x-8">
          {TOOLS.map(({ name, logo, tile }) => (
            <li key={name} className="flex w-16 flex-col items-center gap-2">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 hover:-translate-y-0.5 ${tile}`}>{logo}</span>
              <span className="text-xs font-medium text-ink dark:text-zinc-200">{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
