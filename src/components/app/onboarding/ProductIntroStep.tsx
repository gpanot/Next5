'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, PenLine } from 'lucide-react';
import { AppButton } from '../../ui/AppButton';
import { studioHref } from '../../../lib/studioPaths';
import { StepCard } from './StepCard';
import { stepError, type StepProps } from './types';

const MODES = [
  {
    icon: Zap,
    title: 'Blitz Mode',
    sub: 'Generate a full batch of on-brand photos in one click. Pick a theme, your style is applied automatically.',
    accent: true,
  },
  {
    icon: PenLine,
    title: 'Manual Creation',
    sub: 'Control every detail — swap assets, adjust looks, and produce exactly the content you have in mind.',
    accent: false,
  },
] as const;

export const ProductIntroStep = ({ product, advance }: StepProps) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      await advance(9, { completed: true });
      router.push(`${studioHref(product)}?welcome=1`);
    } catch (err) {
      setError(stepError(err, 'Could not continue. Try again.'));
      setBusy(false);
    }
  };

  return (
    <StepCard
      title="Two ways to create content"
      sub="Start with what fits your workflow — you can switch anytime inside your workspace."
      footer={<AppButton size="lg" loading={busy} onClick={finish}>Continue to Dashboard</AppButton>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {MODES.map(({ icon: Icon, title, sub, accent }) => (
          <div
            key={title}
            className={[
              'flex flex-col gap-3 rounded-2xl border p-5',
              accent ? 'border-app-accent bg-app-accent-soft' : 'border-app-line bg-app-panel',
            ].join(' ')}
          >
            <div className={['flex h-10 w-10 items-center justify-center rounded-xl', accent ? 'bg-app-accent text-white' : 'bg-app-sunken text-app-muted'].join(' ')}>
              <Icon aria-hidden className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[16px] font-semibold text-app-ink">{title}</p>
              <p className="text-[13px] leading-relaxed text-app-muted">{sub}</p>
            </div>
          </div>
        ))}
      </div>
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
    </StepCard>
  );
};
