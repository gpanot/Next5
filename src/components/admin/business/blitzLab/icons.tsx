'use client';

/** Small stroke icons for Blitz Lab (hand-written SVG, 24px grid, currentColor). */

type IconProps = { className?: string };

const Svg = ({ className = 'h-4 w-4', children }: IconProps & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);

export const PencilIcon = (p: IconProps) => <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></Svg>;
export const TrashIcon = (p: IconProps) => <Svg {...p}><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></Svg>;
export const PlayIcon = (p: IconProps) => <Svg {...p}><path d="M8 5v14l11-7z" fill="currentColor" /></Svg>;
export const PauseIcon = (p: IconProps) => <Svg {...p}><path d="M8 5v14M16 5v14" /></Svg>;
export const UploadIcon = (p: IconProps) => <Svg {...p}><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></Svg>;
export const MusicIcon = (p: IconProps) => <Svg {...p}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></Svg>;
export const CloseIcon = (p: IconProps) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const LibraryIcon = (p: IconProps) => <Svg {...p}><rect x="3" y="5" width="13" height="14" rx="2" /><path d="M16 10l5-3v10l-5-3" /></Svg>;
export const CheckIcon = (p: IconProps) => <Svg {...p}><path d="M5 12l5 5L20 7" /></Svg>;
