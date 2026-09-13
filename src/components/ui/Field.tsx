type FieldProps = {
  label: string;
  htmlFor?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Wrapper that provides label (above), helper (below), and error (below, red). */
export const Field = ({
  label,
  htmlFor,
  helper,
  error,
  required = false,
  className = '',
  children,
}: FieldProps) => (
  <div className={['flex flex-col gap-1.5', className].join(' ')}>
    <label
      htmlFor={htmlFor}
      className="text-[13px] font-medium text-app-ink"
    >
      {label}
      {required && <span className="ml-1 text-app-danger" aria-hidden="true">*</span>}
    </label>

    {children}

    {error && (
      <p role="alert" className="text-[12px] text-app-danger" id={htmlFor ? `${htmlFor}-error` : undefined}>
        {error}
      </p>
    )}
    {!error && helper && (
      <p className="text-[12px] text-app-muted" id={htmlFor ? `${htmlFor}-helper` : undefined}>
        {helper}
      </p>
    )}
  </div>
);
