type KbdProps = {
  children: React.ReactNode;
  className?: string;
};

/** Keyboard key label (e.g. `⌘K`, `Esc`, `Enter`). */
export const Kbd = ({ children, className = '' }: KbdProps) => (
  <kbd
    className={[
      'inline-flex items-center rounded-md border border-app-line bg-app-sunken px-1.5 py-0.5 font-mono text-[11px] text-app-muted',
      className,
    ].join(' ')}
  >
    {children}
  </kbd>
);
