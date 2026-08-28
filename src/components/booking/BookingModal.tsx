'use client';

import { useEffect, useRef } from 'react';
import type { BookingFlow } from '../../hooks/useBookingFlow';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { ArrowRightIcon, CloseIcon } from '../ui/Icons';
import { BookingProgress } from './BookingProgress';
import { BookingSteps } from './BookingSteps';

type BookingModalProps = {
  flow: BookingFlow;
};

export const BookingModal = ({ flow }: BookingModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { isOpen, step, close } = flow;

  const dismissable = step !== 'payment';

  useLockBodyScroll(isOpen);
  useFocusTrap(panelRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissable) close();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, dismissable, close]);

  useEffect(() => {
    panelRef.current?.focus();
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step, isOpen]);

  if (!flow.route) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="animate-fade-in absolute inset-0 bg-ink/65 backdrop-blur-[3px]"
        onClick={() => dismissable && close()}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        tabIndex={-1}
        className="animate-sheet-in relative flex h-[93vh] w-full max-w-[1060px] flex-col overflow-hidden rounded-t-2xl bg-page shadow-[0_-8px_60px_-12px_rgb(34_31_28/0.5)] outline-none sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:shadow-[0_30px_80px_-20px_rgb(34_31_28/0.55)]"
      >
        <div className="shrink-0 border-b border-line bg-page/95 px-5 pt-4 pb-3 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            {flow.canGoBack ? (
              <button
                type="button"
                onClick={flow.back}
                className="-ml-1 flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[12px] text-muted transition-colors duration-200 hover:text-ink"
              >
                <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" />
                Back
              </button>
            ) : (
              <span id="booking-modal-title" className="label-caps text-[9.5px] font-medium text-muted">
                {flow.route.number} · {flow.route.title}
              </span>
            )}

            {dismissable && (
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-surface-alt hover:text-ink"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="mt-3">
            <BookingProgress current={step} />
          </div>
        </div>

        <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 pt-6 sm:px-8 lg:px-10">
          <BookingSteps flow={flow} />
        </div>
      </div>
    </div>
  );
};
