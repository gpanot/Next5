'use client';

import { Check, UserRound } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { onboardingModelStore } from '../../../lib/localStore';
import { hasManifestImage } from '../../../lib/manifest';
import { AppButton } from '../../ui/AppButton';
import { SkeletonGrid } from '../../ui/Skeleton';
import { StepCard } from './StepCard';
import { SelfieFields } from './SelfieFields';
import type { StepProps } from './types';
import { useSelfieUpload } from './useSelfieUpload';

type StudioModel = { slug: string; name: string; age: number; description: string; faceImage: string; available: boolean };

export const ModelGrid = ({ value, onChange }: { value: string; onChange: (slug: string) => void }) => {
  const { data, loading } = useApi<{ models: StudioModel[] }>('/api/app/studio-models');
  if (loading) return <SkeletonGrid count={6} cols={3} />;
  return (
    <div role="radiogroup" aria-label="Studio models" className="grid grid-cols-3 gap-3">
      {(data?.models ?? []).map((m) => (
        <button key={m.slug} type="button" role="radio" aria-checked={value === m.slug} onClick={() => onChange(m.slug)} className="flex flex-col gap-1.5 text-left focus-visible:outline-none">
          <div className={`relative aspect-square overflow-hidden rounded-xl ring-2 transition-colors duration-200 ${value === m.slug ? 'ring-app-accent' : 'ring-transparent'}`}>
            {hasManifestImage(m.faceImage) && <Image src={m.faceImage} alt={`Studio model ${m.name}`} fill sizes="160px" className="object-cover" />}
            {value === m.slug && <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-app-accent text-app-accent-ink"><Check aria-hidden className="h-4 w-4" /></span>}
          </div>
          <span className="text-[13px] font-semibold text-app-ink">{m.name}, {m.age}</span>
          <span className="text-[12px] text-app-muted">{m.description}</span>
        </button>
      ))}
    </div>
  );
};

export const ShopModelStep = ({ product, me, advance }: StepProps) => {
  const stored = onboardingModelStore.useValue();
  const [mode, setMode] = useState<'me' | 'studio'>(stored && stored !== 'me' ? 'studio' : 'me');
  const [slug, setSlug] = useState(stored && stored !== 'me' ? stored : '');
  const selfies = useSelfieUpload(product, me.user.consents.includes('face_processing'));

  const submit = async () => {
    if (mode === 'studio') {
      onboardingModelStore.set(slug);
      await advance(3);
      return;
    }
    if (await selfies.save()) {
      onboardingModelStore.set('me');
      await advance(3);
    }
  };

  return (
    <StepCard
      title="Who wears your products?"
      sub="Wear them yourself — your customers know your face — or pick a Studio model."
      footer={<AppButton size="lg" loading={selfies.busy} disabled={mode === 'studio' ? !slug : !selfies.ready} onClick={submit}>Continue</AppButton>}
    >
      <div className="grid grid-cols-2 gap-3">
        {([['me', 'Wear it yourself', '2 selfies + 1 full-body photo'], ['studio', 'Studio model', '6 models to choose from']] as const).map(([value, title, sub]) => (
          <button key={value} type="button" onClick={() => setMode(value)} aria-pressed={mode === value} className={`flex flex-col gap-1 rounded-2xl border p-4 text-left transition-colors duration-200 ${mode === value ? 'border-app-accent bg-app-accent-soft' : 'border-app-line hover:bg-app-sunken'}`}>
            <UserRound aria-hidden className="h-5 w-5 text-app-accent" />
            <span className="text-[15px] font-semibold text-app-ink">{title}</span>
            <span className="text-[13px] text-app-muted">{sub}</span>
          </button>
        ))}
      </div>
      {mode === 'studio' ? <ModelGrid value={slug} onChange={setSlug} /> : <SelfieFields upload={selfies} />}
    </StepCard>
  );
};
