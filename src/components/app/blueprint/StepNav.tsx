'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AppButton } from '../../ui/AppButton';
import { SHELL } from './copy';

type StepNavProps = { onBack?: () => void; onNext?: () => void; nextLabel?: string };

/** Back and next buttons at the end of a step. Full width on phones so they are easy to tap. */
export const StepNav = ({ onBack, onNext, nextLabel }: StepNavProps) => (
  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
    {onBack ? (
      <AppButton variant="ghost" size="lg" onClick={onBack} iconLeft={<ArrowLeft className="h-4 w-4" />}>
        {SHELL.back}
      </AppButton>
    ) : (
      <span />
    )}
    {onNext && nextLabel && (
      <AppButton size="lg" onClick={onNext} iconRight={<ArrowRight className="h-4 w-4" />}>
        {nextLabel}
      </AppButton>
    )}
  </div>
);
