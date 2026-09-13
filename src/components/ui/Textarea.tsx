type TextareaProps = {
  error?: boolean;
  className?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = ({ error = false, className = '', ...rest }: TextareaProps) => (
  <textarea
    {...rest}
    aria-invalid={error || undefined}
    className={[
      'w-full rounded-xl border bg-app-panel px-3.5 py-2.5 text-[14px] text-app-ink',
      'placeholder:text-app-muted resize-y transition-colors duration-200 outline-none',
      'focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-0',
      error
        ? 'border-app-danger focus-visible:ring-app-danger'
        : 'border-app-line hover:border-app-muted',
      className,
    ].join(' ')}
  />
);
