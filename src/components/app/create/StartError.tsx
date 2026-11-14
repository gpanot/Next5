import Link from 'next/link';

/** The error under a "make" grid; an out-of-credits error links to Billing to top up. */
export const StartError = ({ message, noCredits }: { message: string; noCredits: boolean }) => (
  <p className="text-[13px] text-app-danger" role="alert">
    {message}
    {noCredits && (
      <>
        {' '}
        <Link href="/app/billing" className="font-medium text-app-accent underline transition-colors duration-200 hover:text-app-ink">Top up</Link>
      </>
    )}
  </p>
);
