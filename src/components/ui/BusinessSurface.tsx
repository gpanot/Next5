type BusinessSurfaceProps = {
  children: React.ReactNode;
  className?: string;
  /** `fresh` = the neutral + coral marketing palette (globals.css). The studio keeps the default. */
  look?: 'default' | 'fresh';
};

/**
 * Root wrapper for every business-surface page/layout (/, /brand, /shop, /pricing, /app/*).
 * Sets `data-surface="business"` so scoped dark-mode tokens in globals.css apply.
 * The `/photos` and `/studio` routes must NOT use this wrapper.
 */
export const BusinessSurface = ({ children, className = '', look = 'default' }: BusinessSurfaceProps) => (
  <div
    data-surface="business"
    data-look={look === 'fresh' ? 'fresh' : undefined}
    className={['min-h-screen bg-app-bg text-app-ink antialiased', className].join(' ')}
  >
    {children}
  </div>
);
