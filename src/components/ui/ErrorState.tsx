import { AppButton } from './AppButton';
import { AlertCircle } from 'lucide-react';

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
  supportHref?: string;
  className?: string;
};

export const ErrorState = ({
  message = 'Something went wrong.',
  onRetry,
  supportHref,
  className = '',
}: ErrorStateProps) => (
  <div
    role="alert"
    className={[
      'flex flex-col items-center gap-4 rounded-2xl border border-app-danger/30 bg-app-panel px-8 py-10 text-center',
      className,
    ].join(' ')}
  >
    <AlertCircle className="h-8 w-8 text-app-danger" aria-hidden="true" />
    <p className="text-[14px] text-app-ink">{message}</p>
    <div className="flex gap-2">
      {onRetry && (
        <AppButton variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </AppButton>
      )}
      {supportHref && (
        <a
          href={supportHref}
          className="inline-flex h-8 items-center rounded-lg px-3 text-[12px] text-app-muted underline underline-offset-4 hover:text-app-ink"
        >
          Contact support
        </a>
      )}
    </div>
  </div>
);
