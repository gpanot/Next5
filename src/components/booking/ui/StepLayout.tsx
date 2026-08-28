'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type StepLayoutProps = {
  children: ReactNode;
  /** Persistent action bar. Rendered outside the scroll area so it never covers content. */
  footer?: ReactNode;
  /** Centres short steps vertically instead of pinning them to the top. */
  centered?: boolean;
};

/**
 * Every booking step renders through this shell.
 *
 * The scroll area and the action bar are siblings in a flex column, so the bar
 * is always visible and can never overlap the last field of a step — which is
 * what a `sticky bottom-0` footer inside the scroller used to do.
 */
export const StepLayout = ({ children, footer, centered = false }: StepLayoutProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className={[
          'flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8 sm:py-7 lg:px-10',
          centered ? 'flex flex-col justify-center' : '',
        ].join(' ')}
      >
        {children}
      </div>

      {footer && (
        <div className="shrink-0 border-t border-line bg-page px-5 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-8 sm:pt-4 sm:pb-4 lg:px-10">
          {footer}
        </div>
      )}
    </div>
  );
};

type StepActionsProps = {
  /** Left-hand context: price, reassurance, selection count. */
  hint?: ReactNode;
  children: ReactNode;
};

export const StepActions = ({ hint, children }: StepActionsProps) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
    {hint ? <div className="min-w-0">{hint}</div> : <span className="hidden sm:block" />}
    <div className="w-full sm:w-auto sm:shrink-0">{children}</div>
  </div>
);
