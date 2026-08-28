'use client';

import type { PhotoRoute } from '../../../data/routes';
import type { FeelingChoice, GoalChoice, ShootIntention } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { StepFooter } from '../ui/StepFooter';
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

type ChipProps = {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

const Chip = ({ selected, onClick, children }: ChipProps) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      'rounded-full border px-4 py-2.5 text-left text-[13px] leading-tight transition-all duration-200',
      selected
        ? 'border-accent bg-accent/10 text-ink font-medium shadow-sm'
        : 'border-line bg-surface text-muted hover:border-accent/50 hover:text-ink',
    ].join(' ')}
  >
    {children}
  </button>
);

export const IntentionStep = ({
  route,
  intention,
  onToggleFeeling,
  onToggleGoal,
  onNext,
}: IntentionStepProps) => {
  const canContinue = intention.feelings.length > 0;

  return (
    <section>
      <StepHeading
        eyebrow={route.title}
        title="How do you want to feel?"
        subtitle="Choose up to 2 that feel right for you."
      />

      <div className="mt-6 flex flex-wrap gap-2.5">
        {feelings.map(({ id, emoji, label }) => (
          <Chip
            key={id}
            selected={intention.feelings.includes(id)}
            onClick={() => onToggleFeeling(id)}
          >
            {emoji} {label}
          </Chip>
        ))}
      </div>

      {/* Divider */}
      <hr className="my-8 border-line" />

      <h3 className="font-serif text-[20px] tracking-[0.04em] text-ink sm:text-[22px]">
        What do you want these photos to do for you?
      </h3>
      <p className="mt-1.5 text-[12.5px] text-muted">Choose one or two.</p>

      <div className="mt-5 flex flex-wrap gap-2.5">
        {goals.map(({ id, label }) => (
          <Chip
            key={id}
            selected={intention.goals.includes(id)}
            onClick={() => onToggleGoal(id)}
          >
            {label}
          </Chip>
        ))}
      </div>

      <StepFooter>
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
      </StepFooter>
    </section>
  );
};
