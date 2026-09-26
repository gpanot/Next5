'use client';

import { Camera, UsersRound } from 'lucide-react';
import { ModelGrid } from '../../onboarding/ShopModelStep';
import { ME } from './modelIdentity';

type Props = { value: string; onChange: (ref: string) => void };

const OPTIONS = [
  { id: 'studio', title: 'Studio model', sub: 'Ready to use. 30 models.', icon: UsersRound },
  { id: 'me', title: 'Use my photos', sub: '1 selfie + 1 full-body photo', icon: Camera },
] as const;

/** Who wears the products: a Studio model, or the seller herself. `value` is a model slug, "me", or "" (none yet). */
export const ModelChoice = ({ value, onChange }: Props) => {
  const mode = value === ME ? 'me' : 'studio';
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map(({ id, title, sub, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => onChange(id === 'me' ? ME : '')}
            className={`flex flex-col gap-1 rounded-2xl border p-4 text-left transition-colors duration-200 ${mode === id ? 'border-app-accent bg-app-accent-soft' : 'border-app-line hover:bg-app-sunken'}`}
          >
            <Icon aria-hidden className="h-5 w-5 text-app-accent" />
            <span className="text-[15px] font-semibold text-app-ink">{title}</span>
            <span className="text-[13px] text-app-muted">{sub}</span>
          </button>
        ))}
      </div>
      {mode === 'me' ? (
        <p className="rounded-xl bg-app-sunken p-4 text-[13px] text-app-muted">You wear your products. We use a selfie and a full-body photo of you.</p>
      ) : <ModelGrid value={value} onChange={onChange} />}
    </div>
  );
};
