'use client';

import { RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../../../lib/apiClient';
import { AppButton } from '../../../ui/AppButton';
import { Field } from '../../../ui/Field';
import { Select } from '../../../ui/Select';
import { TextInput } from '../../../ui/TextInput';
import { Textarea } from '../../../ui/Textarea';
import type { BaseImageData, InfluencerTraits } from './BaseImageStep';
import { PortraitPreview } from './PortraitPreview';

const GENDERS = ['Female', 'Male', 'Non-binary'] as const;

type Props = {
  traits: InfluencerTraits;
  setTrait: <K extends keyof InfluencerTraits>(key: K, val: InfluencerTraits[K]) => void;
  image: BaseImageData | null;
  onImageChange: (img: BaseImageData) => void;
};

/** "Describe": a few traits and free text, then an AI portrait to accept or redo. */
export const GeneratePanel = ({ traits, setTrait, image, onImageChange }: Props) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const described = Boolean(traits.gender || traits.ethnicity || traits.details.trim());

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ r2Key: string; url: string; promptJson?: Record<string, unknown> }>('/api/app/influencers/generate-portrait', {
        method: 'POST',
        json: { gender: traits.gender || null, age: traits.age ? Number(traits.age) : null, ethnicity: traits.ethnicity || null, additionalDetails: traits.details.trim() || null },
      });
      onImageChange({ source: 'generated', baseImageKey: res.r2Key, previewUrl: res.url, promptJson: res.promptJson });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not make the portrait. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {image && (
        <PortraitPreview
          url={image.previewUrl}
          alt="AI portrait"
          badge="AI generated"
          actions={<AppButton variant="secondary" size="sm" loading={busy} iconLeft={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void generate()}>Try another</AppButton>}
        />
      )}
      <Field label="Describe them" htmlFor="inf-details" helper="Hair, style, vibe. The more you say, the closer it gets.">
        <Textarea id="inf-details" rows={2} maxLength={800} value={traits.details} onChange={(e) => setTrait('details', e.target.value)} placeholder="e.g. warm smile, shoulder-length brown hair, blazer" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Gender" htmlFor="inf-gender">
          <Select id="inf-gender" value={traits.gender} onChange={(e) => setTrait('gender', e.target.value)}>
            <option value="">Any</option>
            {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
        </Field>
        <Field label="Age" htmlFor="inf-age">
          <TextInput id="inf-age" type="number" inputMode="numeric" min={18} max={60} value={traits.age} onChange={(e) => setTrait('age', e.target.value)} placeholder="18–60" />
        </Field>
        <Field label="Ethnicity" htmlFor="inf-ethnicity" className="col-span-2">
          <TextInput id="inf-ethnicity" maxLength={60} value={traits.ethnicity} onChange={(e) => setTrait('ethnicity', e.target.value)} placeholder="e.g. Hispanic, East Asian, Black" />
        </Field>
      </div>
      {error && <p role="alert" className="text-[13px] text-app-danger">{error}</p>}
      {!image && (
        <AppButton fullWidth loading={busy} disabled={!described} iconLeft={<Sparkles className="h-4 w-4" />} onClick={() => void generate()}>
          {busy ? 'Making the portrait…' : 'Make the portrait'}
        </AppButton>
      )}
      {!image && !described && <p className="-mt-2 text-center text-[12px] text-app-muted">Describe them or pick a gender or ethnicity first.</p>}
    </div>
  );
};
