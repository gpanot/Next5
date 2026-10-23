'use client';

import { Copy } from 'lucide-react';
import { useMemo } from 'react';
import type { BlueprintDto } from '../../../../lib/blueprint/schema';
import { blueprintText } from '../../../../lib/blueprint/text';
import { AppButton } from '../../../ui/AppButton';
import { CopyFallback } from '../CopyFallback';
import { SUMMARY_STEP } from '../planCopy';
import { StepHeading } from '../StepHeading';
import { StepNav } from '../StepNav';
import { useCopy } from '../useCopy';
import type { StepNavProps } from './types';

/** Step 6: the whole blueprint as plain text, with copy and a select-and-copy fallback. */
export const SummaryStep = ({ blueprint, onBack }: StepNavProps & { blueprint: BlueprintDto }) => {
  const text = useMemo(() => blueprintText(blueprint), [blueprint]);
  const { state, copy } = useCopy();
  return (
    <div className="flex flex-col gap-5">
      <StepHeading step={5} title={SUMMARY_STEP.title} accent={SUMMARY_STEP.accent}>{SUMMARY_STEP.body}</StepHeading>
      <div className="flex flex-wrap gap-2">
        <AppButton size="lg" onClick={() => void copy(text)} iconLeft={<Copy className="h-4 w-4" />}>
          {state === 'copied' ? SUMMARY_STEP.copied : SUMMARY_STEP.copy}
        </AppButton>
      </div>
      {state === 'failed' && <CopyFallback text={text} note={SUMMARY_STEP.copyFallback} />}
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-app-sunken p-4 font-sans text-[14px] leading-relaxed text-app-ink">{text}</pre>
      <StepNav onBack={onBack} />
    </div>
  );
};
