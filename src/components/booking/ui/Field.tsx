import type { InputHTMLAttributes } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const Field = ({ label, error, id, className = '', ...props }: FieldProps) => (
  <div className={className}>
    <label htmlFor={id} className="label-caps block text-[9px] font-medium text-muted">
      {label}
    </label>
    <input
      id={id}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={[
        'mt-2 w-full rounded-xl border bg-page px-4 py-3 text-[14px] text-ink transition-colors duration-200',
        'placeholder:text-muted/55 focus:outline-none',
        error ? 'border-accent-strong' : 'border-line focus:border-ink/40',
      ].join(' ')}
      {...props}
    />
    {error && (
      <p id={`${id}-error`} className="mt-1.5 text-[11.5px] text-accent-strong">
        {error}
      </p>
    )}
  </div>
);
