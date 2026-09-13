type SelectProps = {
  error?: boolean;
  className?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = ({ error = false, className = '', children, ...rest }: SelectProps) => (
  <div className="relative">
    <select
      {...rest}
      aria-invalid={error || undefined}
      className={[
        'h-10 w-full appearance-none rounded-xl border bg-app-panel pl-3.5 pr-9 text-[14px] text-app-ink',
        'transition-colors duration-200 outline-none cursor-pointer',
        'focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-0',
        error
          ? 'border-app-danger focus-visible:ring-app-danger'
          : 'border-app-line hover:border-app-muted',
        className,
      ].join(' ')}
    >
      {children}
    </select>
    {/* Chevron */}
    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-app-muted" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </span>
  </div>
);
