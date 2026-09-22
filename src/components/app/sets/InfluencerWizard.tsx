'use client';

import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { useApi } from '../../../hooks/useApi';
import type { SetTemplateDto, ThemeDto } from '../../../types/business/catalog';
import { AppButton } from '../../ui/AppButton';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { useAppRouter } from '../shell/AppLink';
import { BaseImageStep, type BaseImageData, type InfluencerTraits } from './steps/BaseImageStep';
import { ConfirmStep } from './steps/ConfirmStep';
import { GenerationSettingsStep, type GenerationSettings } from './steps/GenerationSettingsStep';

const AUTO_STYLE_COUNT = 5;
const AUTO_PHOTOS = 6;

const STEPS = ['Base photo', 'Generation', 'Confirm'] as const;

const defaultSettings = (templates: SetTemplateDto[]): GenerationSettings => ({
  themeId: '',
  mode: 'automatic',
  templateIds: templates.slice(0, AUTO_STYLE_COUNT).map((t) => t.id),
  photosPerStyle: AUTO_PHOTOS,
});

/** Progress bar across the top of the wizard. */
const ProgressBar = ({ step, total }: { step: number; total: number }) => (
  <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${total}`}>
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-app-cta' : 'bg-app-line'}`}
      />
    ))}
  </div>
);

export const InfluencerWizard = () => {
  const { product, me, refresh } = useWorkspace();
  const router = useAppRouter();

  const templates = useApi<{ templates: SetTemplateDto[] }>(
    product ? `/api/app/templates?product=${product}` : null,
  );
  const themes = useApi<{ featured: ThemeDto | null; library: ThemeDto[] }>('/api/app/themes');
  const allTemplates = templates.data?.templates ?? [];
  const allThemes = themes.data?.library ?? [];

  const [step, setStep] = useState(0);
  const [traits, setTraits] = useState<InfluencerTraits>({ name: '', gender: '', age: '', ethnicity: '' });
  const [image, setImage] = useState<BaseImageData | null>(null);
  const [settings, setSettings] = useState<GenerationSettings>(() => defaultSettings(allTemplates));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = me?.balance?.total ?? 0;

  // Initialize settings with templates once they load.
  const onSettingsChange = (v: GenerationSettings) => {
    setSettings(v);
    setError(null);
  };

  // ── Validation per step ───────────────────────────────────────────────────
  const canProceedStep0 = Boolean(traits.name.trim()) && Boolean(image);
  const canProceedStep1 =
    Boolean(settings.themeId) &&
    (settings.mode === 'automatic' || settings.templateIds.length > 0);
  const totalPhotos =
    settings.mode === 'automatic' ? AUTO_STYLE_COUNT * AUTO_PHOTOS : settings.templateIds.length * settings.photosPerStyle;
  const canCreate = canProceedStep0 && canProceedStep1 && balance >= totalPhotos;

  const next = () => {
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const create = async () => {
    if (!image || !traits.name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const templateIds =
        settings.mode === 'automatic'
          ? allTemplates.slice(0, AUTO_STYLE_COUNT).map((t) => t.id)
          : settings.templateIds;
      await apiFetch('/api/app/influencers', {
        method: 'POST',
        json: {
          product,
          name: traits.name.trim(),
          gender: traits.gender || null,
          age: traits.age ? Number(traits.age) : null,
          ethnicity: traits.ethnicity || null,
          source: image.source,
          baseImageKey: image.baseImageKey,
          galleryItemId: image.galleryItemId ?? null,
          templateIds,
          photosPerStyle: settings.mode === 'automatic' ? AUTO_PHOTOS : settings.photosPerStyle,
          themeId: settings.themeId,
        },
      });
      refresh();
      router.push('/app/sets');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the influencer. Please try again.');
      setCreating(false);
    }
  };

  const themeTitle = allThemes.find((t) => t.id === settings.themeId)?.title ?? '';
  const templateNames = allTemplates.filter((t) => settings.templateIds.includes(t.id)).map((t) => t.name);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-bold text-app-ink">
            New influencer{' '}
            <span className="text-[14px] font-normal text-app-muted">
              ({step + 1}/{STEPS.length})
            </span>
          </h1>
          {me?.balance && (
            <span className="rounded-full bg-app-sunken px-3 py-1 text-[12px] font-medium text-app-muted">
              {balance} credits
            </span>
          )}
        </div>
        <ProgressBar step={step} total={STEPS.length} />
        <p className="text-[13px] font-medium text-app-muted">{STEPS[step]}</p>
      </div>

      {/* Step content */}
      {step === 0 && (
        <BaseImageStep
          traits={traits}
          onTraitsChange={setTraits}
          image={image}
          onImageChange={setImage}
        />
      )}
      {step === 1 && (
        <GenerationSettingsStep
          value={settings.themeId ? settings : { ...settings, themeId: allThemes[0]?.id ?? '' }}
          onChange={onSettingsChange}
        />
      )}
      {step === 2 && image && (
        <ConfirmStep
          traits={traits}
          image={image}
          settings={settings}
          themeTitle={themeTitle}
          templateNames={templateNames}
          balance={balance}
          creating={creating}
          error={error}
        />
      )}

      {/* Navigation footer */}
      <div className="flex items-center justify-between gap-3 pt-2">
        {step > 0 ? (
          <AppButton variant="ghost" iconLeft={<ChevronLeft className="h-4 w-4" />} onClick={back} disabled={creating}>
            Back
          </AppButton>
        ) : (
          <span />
        )}

        {step < STEPS.length - 1 ? (
          <AppButton
            onClick={next}
            disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}
          >
            Continue
          </AppButton>
        ) : (
          <AppButton onClick={create} loading={creating} disabled={!canCreate}>
            Create influencer
          </AppButton>
        )}
      </div>
    </div>
  );
};
