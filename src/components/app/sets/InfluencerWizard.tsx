'use client';

import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { SetTemplateDto, ThemeDto } from '../../../types/business/catalog';
import { AppButton } from '../../ui/AppButton';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonCard } from '../../ui/Skeleton';
import { useAppRouter } from '../shell/AppLink';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { BaseImageStep, EMPTY_TRAITS, type BaseImageData, type InfluencerTraits } from './steps/BaseImageStep';
import { ConfirmStep } from './steps/ConfirmStep';
import { GenerationSettingsStep } from './steps/GenerationSettingsStep';
import { chosenTemplateIds, DEFAULT_SETTINGS, photosPerStyleOf, totalPhotos, type GenerationSettings } from './steps/wizardSettings';

const STEPS = [
  { title: 'Choose a face', sub: 'Make one with AI, use a photo, or pick from our gallery.' },
  { title: 'Make variations', sub: 'New photos of the same face. Use any of them later.' },
  { title: 'Review', sub: 'Check it, then we start making the variations.' },
] as const;

const StepHeader = ({ step }: { step: number }) => (
  <div className="flex flex-col gap-3">
    <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${STEPS.length}`}>
      {STEPS.map((s, i) => <span key={s.title} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-app-accent' : 'bg-app-line'}`} />)}
    </div>
    <div>
      <p className="text-[12px] font-medium text-app-muted">Step {step + 1} of {STEPS.length}</p>
      <h2 className="text-[17px] font-semibold text-app-ink">{STEPS[step].title}</h2>
      <p className="text-[13px] text-app-muted">{STEPS[step].sub}</p>
    </div>
  </div>
);

const bodyOf = (traits: InfluencerTraits, image: BaseImageData, settings: GenerationSettings, templates: readonly SetTemplateDto[]) => ({
  product: 'brand',
  name: traits.name.trim(),
  gender: traits.gender || null,
  age: traits.age ? Number(traits.age) : null,
  ethnicity: traits.ethnicity.trim() || null,
  source: image.source,
  baseImageKey: image.baseImageKey || null,
  galleryItemId: image.galleryItemId ?? null,
  templateIds: chosenTemplateIds(settings, templates),
  photosPerStyle: photosPerStyleOf(settings),
  themeId: settings.themeId,
});

/** New influencer: a face, then variations of it. Brand only. */
export const InfluencerWizard = () => {
  const { me, refresh } = useWorkspace();
  const router = useAppRouter();
  const templatesApi = useApi<{ templates: SetTemplateDto[] }>('/api/app/templates?product=brand');
  const themesApi = useApi<{ featured: ThemeDto | null; library: ThemeDto[] }>('/api/app/themes');

  const [step, setStep] = useState(0);
  const [traits, setTraits] = useState<InfluencerTraits>(EMPTY_TRAITS);
  const [image, setImage] = useState<BaseImageData | null>(null);
  const [rawSettings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templates = templatesApi.data?.templates ?? [];
  const themes = themesApi.data?.library ?? [];
  const [stylesTouched, setStylesTouched] = useState(false);
  // Defaults fill in once the catalog loads: the featured theme and the first style.
  const effective: GenerationSettings = {
    ...rawSettings,
    themeId: rawSettings.themeId || themesApi.data?.featured?.id || themes[0]?.id || '',
    templateIds: stylesTouched ? rawSettings.templateIds : templates.slice(0, 1).map((t) => t.id),
  };

  const balance = me?.balance?.total ?? 0;
  const total = totalPhotos(effective, templates);
  const canContinue = [
    Boolean(traits.name.trim()) && Boolean(image),
    Boolean(effective.themeId) && total > 0,
    balance >= total,
  ][step];

  const go = (next: number) => { setError(null); setStep(next); };
  const onSettings = (v: GenerationSettings) => {
    if (v.templateIds !== effective.templateIds) setStylesTouched(true);
    setSettings(v);
    setError(null);
  };

  const create = async () => {
    if (!image) return;
    setCreating(true);
    setError(null);
    try {
      await apiFetch('/api/app/influencers', { method: 'POST', json: bodyOf(traits, image, effective, templates) });
      refresh();
      router.push('/app/sets');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the influencer. Try again.');
      setCreating(false);
    }
  };

  if (templatesApi.error || themesApi.error) {
    return <ErrorState message={templatesApi.error ?? themesApi.error ?? ''} onRetry={() => { templatesApi.refresh(); themesApi.refresh(); }} />;
  }
  if (!templatesApi.data || !themesApi.data) return <div className="mx-auto w-full max-w-xl"><SkeletonCard /></div>;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <section className="flex flex-col gap-5 rounded-2xl border border-app-line bg-app-panel p-5 shadow-sm sm:p-6">
        <StepHeader step={step} />
        {step === 0 && <BaseImageStep traits={traits} onTraitsChange={setTraits} image={image} onImageChange={setImage} />}
        {step === 1 && <GenerationSettingsStep themes={themes} templates={templates} value={effective} onChange={onSettings} />}
        {step === 2 && image && (
          <ConfirmStep
            traits={traits}
            image={image}
            themeTitle={themes.find((t) => t.id === effective.themeId)?.title ?? ''}
            templateNames={templates.filter((t) => chosenTemplateIds(effective, templates).includes(t.id)).map((t) => t.name)}
            photosPerStyle={photosPerStyleOf(effective)}
            total={total}
            balance={balance}
            error={error}
          />
        )}
      </section>

      <div className="flex items-center justify-between gap-3">
        {step > 0
          ? <AppButton variant="ghost" iconLeft={<ChevronLeft className="h-4 w-4" />} disabled={creating} onClick={() => go(step - 1)}>Back</AppButton>
          : <span />}
        {step < STEPS.length - 1
          ? <AppButton size="lg" disabled={!canContinue} onClick={() => go(step + 1)}>Continue</AppButton>
          : <AppButton size="lg" loading={creating} disabled={!canContinue} onClick={() => void create()}>Create influencer</AppButton>}
      </div>
    </div>
  );
};
