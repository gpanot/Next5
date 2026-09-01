'use client';

import { useEffect, useRef } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import type { FeelingChoice, GoalChoice, ShootIntention } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { ChoiceChip } from '../ui/ChoiceChip';
import { StepActions, StepLayout } from '../ui/StepLayout';
import { StepHeading } from '../ui/StepHeading';

type IntentionStepProps = {
  route: PhotoRoute;
  intention: ShootIntention;
  onToggleFeeling: (f: FeelingChoice) => void;
  onToggleGoal: (g: GoalChoice) => void;
  onNext: () => void;
};

const feelings: readonly { id: FeelingChoice; emoji: string; label: string }[] = [
  { id: 'beautiful', emoji: '✨', label: 'Beautiful & confident' },
  { id: 'soft', emoji: '🌸', label: 'Soft & feminine' },
  { id: 'elegant', emoji: '💎', label: 'Elegant & expensive' },
  { id: 'bold', emoji: '🔥', label: 'Bold & irresistible' },
  { id: 'fashion', emoji: '👗', label: 'Like a fashion girl' },
  { id: 'noticed', emoji: '📸', label: 'Like everyone noticed me' },
];

const goals: readonly { id: GoalChoice; label: string }[] = [
  { id: 'instagram', label: 'Refresh my Instagram' },
  { id: 'attention', label: 'Get more attention' },
  { id: 'style', label: 'Show my style' },
  { id: 'confident', label: 'Feel more confident' },
  { id: 'content', label: 'Create content' },
  { id: 'fun', label: 'Just have fun' },
  { id: 'jealous', label: 'Make someone jealous 😏' },
];

const Counter = ({ count }: { count: number }) => (
  <span
    className={`label-caps text-[9px] font-medium ${count > 0 ? 'text-accent-strong' : 'text-muted/70'}`}
  >
    {count} of 2 selected
  </span>
);

export const IntentionStep = ({
  route,
  intention,
  onToggleFeeling,
  onToggleGoal,
  onNext,
}: IntentionStepProps) => {
  const canContinue = intention.feelings.length > 0;
  const goalSectionRef = useRef<HTMLDivElement>(null);
  const prevFeelingsCount = useRef(intention.feelings.length);

  useEffect(() => {
    const prev = prevFeelingsCount.current;
    prevFeelingsCount.current = intention.feelings.length;
    // Scroll to the goal section only when the second feeling is just selected.
    if (prev < 2 && intention.feelings.length === 2) {
      setTimeout(() => {
        goalSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  }, [intention.feelings.length]);

  return (
    <StepLayout
      footer={
        <StepActions
          hint={
            <p className="text-[12px] text-muted">
              {canContinue
                ? 'We’ll shape your creative direction around this.'
                : 'Pick at least one feeling to continue.'}
            </p>
          }
        >
          <Button
            onClick={onNext}
            size="lg"
            withArrow
            fullWidth
            className="sm:w-auto"
            disabled={!canContinue}
          >
            Continue
          </Button>
        </StepActions>
      }
    >
      <StepHeading
        eyebrow={route.title}
        title="How do you want to feel?"
      />

      <div className="mt-4 flex items-center justify-between border-b border-line pb-2">
        <span className="label-caps text-[9px] font-medium text-muted">The feeling</span>
        <Counter count={intention.feelings.length} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {feelings.map(({ id, emoji, label }) => (
          <ChoiceChip
            key={id}
            emoji={emoji}
            selected={intention.feelings.includes(id)}
            onClick={() => onToggleFeeling(id)}
          >
            {label}
          </ChoiceChip>
        ))}
      </div>

      {intention.feelings.length === 2 && (
        <p className="mt-2.5 text-[11.5px] text-muted invisible" aria-hidden="true" />
      )}

      <div ref={goalSectionRef} className="my-7 border-t border-line" />

      <h3 className="font-serif text-[20px] tracking-[0.04em] text-ink sm:text-[22px]">
        What do you want these photos to do for you?
      </h3>

      <div className="mt-4 flex items-center justify-between border-b border-line pb-2">
        <span className="label-caps text-[9px] font-medium text-muted">The goal</span>
        <Counter count={intention.goals.length} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map(({ id, label }) => (
          <ChoiceChip
            key={id}
            selected={intention.goals.includes(id)}
            onClick={() => onToggleGoal(id)}
          >
            {label}
          </ChoiceChip>
        ))}
      </div>
    </StepLayout>
  );
};
