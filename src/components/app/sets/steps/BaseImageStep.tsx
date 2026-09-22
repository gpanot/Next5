'use client';

import { ImageOff, Loader2, RefreshCw, UploadCloud, User } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';
import { ApiError, apiFetch } from '../../../../lib/apiClient';
import { AppButton } from '../../../ui/AppButton';
import { Field } from '../../../ui/Field';
import { TextInput } from '../../../ui/TextInput';
import { GalleryModal, type GalleryItem } from './GalleryModal';

export type BaseImageData = {
  /** The tab the user chose. */
  source: 'generated' | 'uploaded' | 'gallery';
  /** R2 key for the stored portrait (set once the image is confirmed). */
  baseImageKey: string;
  /** Preview URL (presigned) to show the user. */
  previewUrl: string;
  /** Gallery item id, when source = 'gallery'. */
  galleryItemId?: string;
};

export type InfluencerTraits = {
  name: string;
  gender: string;
  age: string; // as string from input
  ethnicity: string;
};

type Tab = 'generated' | 'uploaded' | 'gallery';

type BaseImageStepProps = {
  traits: InfluencerTraits;
  onTraitsChange: (t: InfluencerTraits) => void;
  image: BaseImageData | null;
  onImageChange: (img: BaseImageData | null) => void;
};

const GENDER_OPTIONS = ['', 'Female', 'Male', 'Non-binary'];

export const BaseImageStep = ({ traits, onTraitsChange, image, onImageChange }: BaseImageStepProps) => {
  const [tab, setTab] = useState<Tab>((image?.source ?? 'generated') as Tab);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const setTrait = useCallback(
    <K extends keyof InfluencerTraits>(key: K, val: InfluencerTraits[K]) =>
      onTraitsChange({ ...traits, [key]: val }),
    [traits, onTraitsChange],
  );

  // ── Generate portrait ───────────────────────────────────────────────────
  const generate = async () => {
    if (!traits.gender && !traits.ethnicity && !additionalDetails) {
      setGenError('Add gender, ethnicity, or details so the AI knows who to generate.');
      return;
    }
    setGenerating(true);
    setGenError(null);
    try {
      const result = await apiFetch<{ r2Key: string; url: string }>(
        '/api/app/influencers/generate-portrait',
        {
          method: 'POST',
          json: {
            gender: traits.gender || null,
            age: traits.age ? Number(traits.age) : null,
            ethnicity: traits.ethnicity || null,
            additionalDetails: additionalDetails || null,
          },
        },
      );
      onImageChange({ source: 'generated', baseImageKey: result.r2Key, previewUrl: result.url });
    } catch (err) {
      setGenError(err instanceof ApiError ? err.message : 'Could not generate portrait. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  // ── Upload portrait ──────────────────────────────────────────────────────
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setGenError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await apiFetch<{ r2Key: string; url: string }>(
        '/api/app/influencers/upload-portrait',
        { method: 'POST', body: form },
      );
      onImageChange({ source: 'uploaded', baseImageKey: result.r2Key, previewUrl: result.url });
    } catch (err) {
      setGenError(err instanceof ApiError ? err.message : 'Could not upload photo.');
    } finally {
      setUploading(false);
      // Reset the file input.
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ── Gallery pick ─────────────────────────────────────────────────────────
  const pickGallery = (item: GalleryItem) => {
    setShowGallery(false);
    onImageChange({ source: 'gallery', baseImageKey: item.url, previewUrl: item.url, galleryItemId: item.id });
    if (item.gender) setTrait('gender', item.gender);
    if (item.age) setTrait('age', String(item.age));
    if (item.ethnicity) setTrait('ethnicity', item.ethnicity);
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setGenError(null);
    // Clearing image so user can't accidentally proceed with stale data from another tab.
    if (image?.source !== t) onImageChange(null);
  };

  const tabBase =
    'flex-1 rounded-full py-1.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent';
  const tabActive = 'bg-app-ink text-white';
  const tabInactive = 'text-app-muted hover:text-app-ink';

  return (
    <div className="flex flex-col gap-6">
      {/* Common trait fields */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" htmlFor="inf-name" required className="col-span-2">
          <TextInput
            id="inf-name"
            value={traits.name}
            onChange={(e) => setTrait('name', e.target.value)}
            maxLength={80}
            placeholder="e.g. Sarah"
          />
        </Field>
        <Field label="Gender" htmlFor="inf-gender">
          <select
            id="inf-gender"
            value={traits.gender}
            onChange={(e) => setTrait('gender', e.target.value)}
            className="h-10 w-full rounded-xl border border-app-line bg-app-base px-3 text-[14px] text-app-ink focus:outline-none focus:ring-2 focus:ring-app-accent"
          >
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g || 'Any'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Age (18–60)" htmlFor="inf-age">
          <input
            id="inf-age"
            type="number"
            min={18}
            max={60}
            value={traits.age}
            onChange={(e) => setTrait('age', e.target.value)}
            placeholder="e.g. 30"
            className="h-10 w-full rounded-xl border border-app-line bg-app-base px-3 text-[14px] text-app-ink focus:outline-none focus:ring-2 focus:ring-app-accent"
          />
        </Field>
        <Field label="Ethnicity" htmlFor="inf-ethnicity" className="col-span-2">
          <TextInput
            id="inf-ethnicity"
            value={traits.ethnicity}
            onChange={(e) => setTrait('ethnicity', e.target.value)}
            placeholder="e.g. East Asian, Hispanic, South Asian…"
            maxLength={60}
          />
        </Field>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-full bg-app-sunken p-1">
        {(['generated', 'uploaded', 'gallery'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            className={`${tabBase} ${tab === t ? tabActive : tabInactive}`}
          >
            {t === 'generated' ? 'AI Generated' : t === 'uploaded' ? 'Upload your own' : 'Pick from gallery'}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tab === 'generated' && (
        <div className="flex flex-col gap-4">
          <Field label="Additional details (optional)" htmlFor="inf-details">
            <TextInput
              id="inf-details"
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              placeholder="e.g. curly red hair, athletic, warm smile"
              maxLength={200}
            />
          </Field>
          {genError && <p className="text-[13px] text-red-500">{genError}</p>}
          {image?.source === 'generated' ? (
            <div className="flex flex-col gap-3">
              <div className="relative mx-auto h-48 w-36 overflow-hidden rounded-2xl bg-app-sunken">
                <Image src={image.previewUrl} alt="Generated portrait" fill className="object-cover object-top" />
              </div>
              <AppButton
                variant="secondary"
                size="sm"
                iconLeft={<RefreshCw className="h-4 w-4" />}
                onClick={generate}
                loading={generating}
              >
                Regenerate
              </AppButton>
            </div>
          ) : (
            <AppButton
              iconLeft={<User className="h-4 w-4" />}
              onClick={generate}
              loading={generating}
            >
              Generate portrait
            </AppButton>
          )}
        </div>
      )}

      {tab === 'uploaded' && (
        <div className="flex flex-col gap-4">
          {genError && <p className="text-[13px] text-red-500">{genError}</p>}
          {image?.source === 'uploaded' ? (
            <div className="flex flex-col gap-3">
              <div className="relative mx-auto h-48 w-36 overflow-hidden rounded-2xl bg-app-sunken">
                <Image src={image.previewUrl} alt="Uploaded portrait" fill className="object-cover object-top" />
              </div>
              <AppButton
                variant="secondary"
                size="sm"
                iconLeft={<UploadCloud className="h-4 w-4" />}
                onClick={() => fileRef.current?.click()}
                loading={uploading}
              >
                Replace photo
              </AppButton>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-app-line bg-app-sunken px-6 py-10 text-app-muted transition-colors hover:border-app-accent hover:text-app-ink"
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <UploadCloud className="h-8 w-8" />
              )}
              <span className="text-[14px] font-medium">
                {uploading ? 'Uploading…' : 'Upload a portrait photo'}
              </span>
              <span className="text-[12px]">JPG or PNG, facing camera</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={onFileChange}
          />
        </div>
      )}

      {tab === 'gallery' && (
        <div className="flex flex-col gap-4">
          {image?.source === 'gallery' ? (
            <div className="flex flex-col gap-3">
              <div className="relative mx-auto h-48 w-36 overflow-hidden rounded-2xl bg-app-sunken">
                <Image src={image.previewUrl} alt="Gallery portrait" fill className="object-cover object-top" />
                <span className="absolute left-2 top-2 rounded-full bg-app-cta px-2 py-0.5 text-[11px] font-semibold text-app-cta-ink">
                  FROM GALLERY
                </span>
              </div>
              <AppButton
                variant="secondary"
                size="sm"
                iconLeft={<ImageOff className="h-4 w-4" />}
                onClick={() => setShowGallery(true)}
              >
                Choose different
              </AppButton>
            </div>
          ) : (
            <AppButton
              iconLeft={<ImageOff className="h-4 w-4" />}
              onClick={() => setShowGallery(true)}
            >
              Browse gallery
            </AppButton>
          )}
        </div>
      )}

      {showGallery && <GalleryModal onSelect={pickGallery} onClose={() => setShowGallery(false)} />}
    </div>
  );
};
