type DividerProps = {
  label?: string;
  className?: string;
};

export const Divider = ({ label, className = '' }: DividerProps) => {
  if (label) {
    return (
      <div className={['flex items-center gap-4', className].join(' ')}>
        <div className="h-px flex-1 bg-app-line" aria-hidden="true" />
        <span className="shrink-0 text-[11px] text-app-muted">{label}</span>
        <div className="h-px flex-1 bg-app-line" aria-hidden="true" />
      </div>
    );
  }
  return <hr className={['border-0 border-t border-app-line', className].join(' ')} />;
};
