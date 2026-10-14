'use client';

/** Small line icons for the App shot builder (hand-drawn SVG, 24 grid). */
const props = { 'aria-hidden': true, width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const PhoneIcon = ({ className = '' }: { className?: string }) => (
  <svg {...props} className={className}><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
);
export const UploadIcon = () => (
  <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-8 8" /></svg>
);
export const SparkIcon = () => (
  <svg {...props}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5" /></svg>
);
export const SearchIcon = () => (
  <svg {...props}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
export const CheckIcon = () => (
  <svg {...props} width={14} height={14} strokeWidth={3}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const CloseIcon = () => (
  <svg {...props} width={14} height={14} strokeWidth={2.4}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
