import type { PhotoRoute } from '../../../data/routes';
import { formatVnd } from '../../../lib/format';
import type { CreativeDirector, FeelingChoice, GoalChoice, ShootIntention } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { CheckCircleIcon } from '../../ui/Icons';
import { ShotFrame } from '../ui/ShotFrame';
import { StepHeading } from '../ui/StepHeading';

type PurchaseStepProps = {
  route: PhotoRoute;
  director: CreativeDirector;
  intention: ShootIntention;
  onBuy: () => void;
};

const feelingLabels: Record<FeelingChoice, string> = {
  beautiful: '✨ Beautiful & confident',
  soft: '🌸 Soft & feminine',
  elegant: '💎 Elegant & expensive',
  bold: '🔥 Bold & irresistible',
  fashion: '👗 Like a fashion girl',
  noticed: '📸 Like everyone noticed me',
};

const goalLabels: Record<GoalChoice, string> = {
  instagram: 'Refresh my Instagram',
  attention: 'Get more attention',
  style: 'Show my style',
  confident: 'Feel more confident',
  content: 'Create content',
  fun: 'Just have fun',
  jealous: 'Make someone jealous 😏',
};

const deliverables = [
  '5 different scenes',
  'Your chosen creative direction',
  'Your look & your style',
  'High-resolution files',
  'Delivered within 4 hours',
];

export const PurchaseStep = ({ route, director, intention, onBuy }: PurchaseStepProps) => (
  <section className="pb-8">
    <StepHeading
      eyebrow="Love what you see?"
      title="Get the complete shoot"
    />

    {/* Shoot recap */}
    <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
      <p className="label-caps text-[9.5px] font-medium text-muted">Your shoot</p>

      <div className="mt-3 flex items-start gap-4">
        <div className="flex-1">
          <p className="font-serif text-[18px] tracking-[0.06em] text-ink uppercase">{route.title}</p>
          <p className="mt-0.5 text-[12px] text-accent-strong">{director.name} · {director.specialty}</p>
        </div>
        <div className="text-right">
          <p className="font-serif text-[20px]">
            <span className="text-gold">{formatVnd(route.priceVnd)}</span>
          </p>
          <p className="text-[10px] text-muted">VND</p>
        </div>
      </div>

      {intention.feelings.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="label-caps text-[9px] font-medium text-muted">Your intention</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {intention.feelings.map((f) => (
              <span key={f} className="rounded-full bg-accent/10 px-3 py-1 text-[11.5px] text-ink">
                {feelingLabels[f]}
              </span>
            ))}
            {intention.goals.map((g) => (
              <span key={g} className="rounded-full bg-surface-alt px-3 py-1 text-[11.5px] text-muted">
                {goalLabels[g]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* What you'll receive */}
    <div className="mt-6">
      <p className="label-caps text-[9.5px] font-medium text-muted">You&apos;ll receive</p>
      <ul className="mt-3 space-y-2">
        {deliverables.map((item) => (
          <li key={item} className="flex items-center gap-3 text-[13px] text-ink">
            <CheckCircleIcon className="h-4.5 w-4.5 shrink-0 text-accent" />
            {item}
          </li>
        ))}
      </ul>
    </div>

    {/* 5-shot strip */}
    <div className="mt-6 grid grid-cols-5 gap-1.5">
      {route.shots.map((shot, index) => (
        <div key={shot.src} className="aspect-[3/4] overflow-hidden rounded-lg">
          <ShotFrame
            shot={shot}
            alt={`${route.title} — shot ${index + 1}`}
            loading={index < 2 ? 'eager' : 'lazy'}
            className="h-full w-full"
          />
        </div>
      ))}
    </div>

    {/* CTA */}
    <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl bg-ink-block px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-serif text-[24px] text-on-dark">
          {formatVnd(route.priceVnd)}{' '}
          <span className="text-[14px] text-on-dark-muted">VND</span>
        </p>
        <p className="text-[11.5px] text-on-dark-muted">5 photos · 4-hour delivery</p>
      </div>
      <Button
        onClick={onBuy}
        variant="accent"
        size="lg"
        withArrow
        fullWidth
        className="sm:w-auto"
      >
        Get all 5
      </Button>
    </div>
  </section>
);
