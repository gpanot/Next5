type BusinessSurfaceProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Root wrapper for every business-surface page/layout (/, /brand, /shop, /pricing, /app/*).
 * Sets `data-surface="business"` so scoped dark-mode tokens in globals.css apply.
 * The `/photos` and `/studio` routes must NOT use this wrapper.
 */
export const BusinessSurface = ({ children, className = '' }: BusinessSurfaceProps) => (
  <div
    data-surface="business"
    className={['min-h-screen bg-app-bg text-app-ink antialiased', className].join(' ')}
  >
    {children}
  </div>
);
