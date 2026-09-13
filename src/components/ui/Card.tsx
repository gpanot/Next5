type DivProps = React.HTMLAttributes<HTMLDivElement>;

/** Raised card panel with business-surface tokens. */
export const Card = ({ className = '', children, ...rest }: DivProps) => (
  <div
    {...rest}
    className={['rounded-2xl border border-app-line bg-app-panel shadow-sm', className].join(' ')}
  >
    {children}
  </div>
);

export const CardHeader = ({ className = '', children, ...rest }: DivProps) => (
  <div
    {...rest}
    className={['flex items-center justify-between px-5 py-4 border-b border-app-line', className].join(' ')}
  >
    {children}
  </div>
);

export const CardBody = ({ className = '', children, ...rest }: DivProps) => (
  <div {...rest} className={['px-5 py-4', className].join(' ')}>
    {children}
  </div>
);

export const CardFooter = ({ className = '', children, ...rest }: DivProps) => (
  <div
    {...rest}
    className={['px-5 py-4 border-t border-app-line bg-app-sunken rounded-b-2xl', className].join(' ')}
  >
    {children}
  </div>
);
