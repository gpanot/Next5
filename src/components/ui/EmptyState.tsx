import { AppButton, type AppButtonProps } from './AppButton';

type EmptyStateProps = {
  illustration?: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  action?: { label: string } & Omit<AppButtonProps, 'children'>;
  className?: string;
};

export const EmptyState = ({
  illustration,
  title,
  body,
  action,
  className = '',
}: EmptyStateProps) => (
  <div
    className={[
      'flex flex-col items-center gap-4 rounded-2xl border border-app-line bg-app-panel px-8 py-12 text-center',
      className,
    ].join(' ')}
  >
    {illustration && (
      <div className="text-app-muted" aria-hidden="true">
        {illustration}
      </div>
    )}
    <div className="space-y-1">
      <p className="text-[15px] font-medium text-app-ink">{title}</p>
      {body && <p className="text-[13px] text-app-muted">{body}</p>}
    </div>
    {action && (
      <AppButton variant="primary" {...action}>
        {action.label}
      </AppButton>
    )}
  </div>
);
