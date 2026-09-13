type TextInputProps = {
  error?: boolean;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const TextInput = ({ error = false, className = '', ...rest }: TextInputProps) => (
  <input
    {...rest}
    aria-invalid={error || undefined}
    className={[
      'h-10 w-full rounded-xl border bg-app-panel px-3.5 text-[14px] text-app-ink',
      'placeholder:text-app-muted transition-colors duration-200 outline-none',
      'focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-0',
      error
        ? 'border-app-danger focus-visible:ring-app-danger'
        : 'border-app-line hover:border-app-muted',
      className,
    ].join(' ')}
  />
);
