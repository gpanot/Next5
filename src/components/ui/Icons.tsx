import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const strokeBase = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
} as const;

const Svg = ({ children, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...strokeBase} {...props}>
    {children}
  </svg>
);

export const ArrowRightIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 12h15" />
    <path d="m13 6 6 6-6 6" />
  </Svg>
);

export const SparkleIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 3.5c.6 3.9 1.9 5.3 5.8 5.9-3.9.6-5.2 2-5.8 5.9-.6-3.9-1.9-5.3-5.8-5.9 3.9-.6 5.2-2 5.8-5.9Z" />
    <path d="M18.5 15.5c.3 1.7.9 2.3 2.6 2.6-1.7.3-2.3.9-2.6 2.6-.3-1.7-.9-2.3-2.6-2.6 1.7-.3 2.3-.9 2.6-2.6Z" />
  </Svg>
);

export const WhatsAppIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...strokeBase} {...props}>
    <path d="M20 11.7a8 8 0 0 1-11.9 7L4 20l1.4-4A8 8 0 1 1 20 11.7Z" />
    <path d="M9.3 9c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .6.5l.7 1.6c.1.3 0 .5-.1.7l-.4.5c-.1.2-.2.3 0 .6a6 6 0 0 0 2.6 2.2c.3.1.4 0 .6-.1l.5-.6c.2-.2.4-.2.6-.1l1.5.8c.3.1.4.3.4.5 0 .5-.3 1.3-1.4 1.5-1 .2-2.5-.2-4.2-1.4a8.7 8.7 0 0 1-2.7-3.4c-.4-1-.4-2.1.1-2.8Z" />
  </svg>
);

export const TicketIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M8 5v14" />
    <path d="M12 9.5h5M12 13.5h3" />
  </Svg>
);

export const SunIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="3.8" />
    <path d="M12 2.6v1.9M12 19.5v1.9M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.6 12h1.9M19.5 12h1.9M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </Svg>
);

export const CameraIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M3 8.5A2 2 0 0 1 5 6.5h2.2l1.2-1.8h7.2l1.2 1.8H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    <circle cx="12" cy="12.5" r="3.3" />
  </Svg>
);

export const CloudIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M7.2 18.5a3.9 3.9 0 0 1-.5-7.8 5.1 5.1 0 0 1 9.9-1.2 3.6 3.6 0 0 1 .3 7.2 4 4 0 0 1-.5 0Z" />
  </Svg>
);

export const HeartIcon = ({ filled = false, ...props }: IconProps & { filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    {...strokeBase}
    fill={filled ? 'currentColor' : 'none'}
    {...props}
  >
    <path d="M12 20s-7.3-4.4-8.6-9A4.4 4.4 0 0 1 12 7.3 4.4 4.4 0 0 1 20.6 11c-1.3 4.6-8.6 9-8.6 9Z" />
  </svg>
);

export const MapPinIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 21s6.5-5.6 6.5-10.3a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z" />
    <circle cx="12" cy="10.5" r="2.4" />
  </Svg>
);

export const ClockIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.4V12l3 1.8" />
  </Svg>
);

export const StarIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
    <path d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8Z" />
  </svg>
);

export const GiftIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3.5" y="9" width="17" height="11.5" rx="1.8" />
    <path d="M2.5 9h19v3.2h-19zM12 9v11.5" />
    <path d="M12 9S10.8 4.5 8.6 4.5a2 2 0 0 0 0 4.5M12 9s1.2-4.5 3.4-4.5a2 2 0 0 1 0 4.5" />
  </Svg>
);

export const PhoneCheckIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
    <path d="M10.4 5.2h3.2" />
    <path d="m9.4 12.6 1.9 1.9 3.6-3.8" />
  </Svg>
);

export const CalendarIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2.4" />
    <path d="M3 9.6h18M8 3v4M16 3v4" />
    <path d="M7.6 13.4h2.2M12.2 13.4h2.2M16.8 13.4h.4M7.6 17.2h2.2M12.2 17.2h2.2" />
  </Svg>
);

export const CardIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.4" />
    <path d="M2.5 10h19M6 14.6h3.4" />
  </Svg>
);

export const PhotoIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.4" />
    <circle cx="8.6" cy="9.8" r="1.6" />
    <path d="m3.6 17.4 4.6-4.3 3.5 3.2 3.1-2.9 5.2 4.6" />
  </Svg>
);

export const MenuIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const CloseIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
);

export const ChevronDownIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const ImageIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.4" />
    <path d="M3 15.5l4.5-4.5 3.5 3.5 3-3 5 4" />
    <circle cx="8.5" cy="9.5" r="1.5" />
  </Svg>
);

export const UploadIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 15.5V4M8 8l4-4 4 4" />
    <path d="M4 17v1.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V17" />
  </Svg>
);

export const LockIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
);

export const CheckCircleIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </Svg>
);

export const CheckIcon = ({ strokeWidth, ...props }: IconProps & { strokeWidth?: number }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth ?? 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m4 12 5 5 11-11" />
  </svg>
);

export const CopyIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Svg>
);

export const ExpandIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M15 3h6m0 0v6m0-6-7 7M9 21H3m0 0v-6m0 6 7-7" />
  </Svg>
);

export const TrashIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    <path d="M10 11v5M14 11v5" />
  </Svg>
);

export const DownloadIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 4v11M8 11l4 4 4-4" />
    <path d="M4 17v1.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V17" />
  </Svg>
);
