/** Hand-drawn 18px stroke icons of the workspace menu (sidebar, phone bars). */
const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
    {children}
  </svg>
);

/** A coin: the workspace's credits. */
export function CreditsIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.2c-.5-.8-1.5-1.2-2.8-1.2-1.6 0-2.8.8-2.8 2s1.2 1.7 2.8 2 2.8.8 2.8 2-1.2 2-2.8 2c-1.3 0-2.3-.4-2.8-1.2M12 6.5v1.5M12 16v1.5" />
    </Svg>
  );
}

/** Two stacked cards: the swipe deck of ideas. */
export function IdeasIcon() {
  return (
    <Svg>
      <rect x="7" y="4" width="11" height="16" rx="2" />
      <path d="M4.5 7.5 4 17.6a2 2 0 0 0 1.9 2.1L7 19.8M20 6.5l.5.1" />
    </Svg>
  );
}

export function CalendarIcon() {
  return (
    <Svg>
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Svg>
  );
}

export function ContentIcon() {
  return (
    <Svg>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M2 6v12M22 6v12M10 9.5v5l4-2.5z" />
    </Svg>
  );
}

export function ChartIcon() {
  return (
    <Svg>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Svg>
  );
}

/** A tag: the brand's own material. */
export function BrandIcon() {
  return (
    <Svg>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <circle cx="8" cy="8" r="1.5" />
    </Svg>
  );
}

export function GearIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Svg>
  );
}
