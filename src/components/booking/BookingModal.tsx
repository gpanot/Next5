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
  const { isOpen, step, close } = flow;

  const showProgress = step !== 'confirmed';

  useLockBodyScroll(isOpen);
  useFocusTrap(panelRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // A shot lightbox sits above the modal and owns Escape while it is open.
      if (event.key !== 'Escape') return;
      if (document.querySelector('[data-lightbox-open]')) return;
      close();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    panelRef.current?.focus();
  }, [step, isOpen]);

  if (!flow.route) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="animate-fade-in absolute inset-0 bg-ink/65 backdrop-blur-[3px]"
        onClick={close}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        tabIndex={-1}
        className="animate-sheet-in relative flex h-[93vh] w-full max-w-[1060px] flex-col overflow-hidden rounded-t-2xl bg-page shadow-[0_-8px_60px_-12px_rgb(34_31_28/0.5)] outline-none sm:h-[min(88vh,860px)] sm:rounded-2xl sm:shadow-[0_30px_80px_-20px_rgb(34_31_28/0.55)]"
      >
        <div className="shrink-0 border-b border-line px-5 pt-3.5 pb-3 sm:px-8 sm:pt-4 lg:px-10">
          <div className="flex items-center gap-2">
            {flow.canGoBack && (
              <button
                type="button"
                onClick={flow.back}
                aria-label="Back to the previous step"
                className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-surface-alt hover:text-ink"
              >
                <ArrowRightIcon className="h-4 w-4 rotate-180" />
              </button>
            )}

            <p
              id="booking-modal-title"
              className="label-caps min-w-0 flex-1 truncate text-[9.5px] font-medium text-muted"
            >
              {flow.route.number} · <span className="text-ink">{flow.route.title}</span>
            </p>

            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-surface-alt hover:text-ink"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          {showProgress && (
            <div className="mt-3">
              <BookingProgress current={step} />
            </div>
          )}
        </div>

        <BookingSteps flow={flow} />
      </div>
    </div>
  );
};
