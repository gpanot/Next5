'use client';

import { Images } from 'lucide-react';
import { useState } from 'react';
import type { InfluencerSourceDto } from '../../../../types/business/influencers';
import { AppButton } from '../../../ui/AppButton';
import { Field } from '../../../ui/Field';
import { TextInput } from '../../../ui/TextInput';
import { GalleryModal, type GalleryItem } from './GalleryModal';
import { GeneratePanel } from './GeneratePanel';
import { PortraitPreview } from './PortraitPreview';
import { SourcePicker } from './SourcePicker';
import { UploadPanel } from './UploadPanel';

export type BaseImageData = {
  source: InfluencerSourceDto;
  /** Stored preview key (generated / uploaded). Gallery faces are resolved on the server from `galleryItemId`. */
  baseImageKey: string;
  /** Signed URL to show. */
  previewUrl: string;
  galleryItemId?: string;
};

export type InfluencerTraits = {
  name: string;
  gender: string;
  /** Kept as typed. */
  age: string;
  ethnicity: string;
  /** Free-text description for the AI portrait. */
  details: string;
};

export const EMPTY_TRAITS: InfluencerTraits = { name: '', gender: '', age: '', ethnicity: '', details: '' };

type Props = {
  traits: InfluencerTraits;
  onTraitsChange: (t: InfluencerTraits) => void;
  image: BaseImageData | null;
  onImageChange: (img: BaseImageData | null) => void;
};

type GalleryPanelProps = { image: BaseImageData | null; onBrowse: () => void };

const GalleryPanel = ({ image, onBrowse }: GalleryPanelProps) =>
  image ? (
    <PortraitPreview url={image.previewUrl} alt="Gallery face" badge="From gallery" actions={<AppButton variant="secondary" size="sm" iconLeft={<Images className="h-3.5 w-3.5" />} onClick={onBrowse}>Pick another</AppButton>} />
  ) : (
    <AppButton fullWidth iconLeft={<Images className="h-4 w-4" />} onClick={onBrowse}>Browse faces</AppButton>
  );

/** Step 1: where the face comes from, then a name. */
export const BaseImageStep = ({ traits, onTraitsChange, image, onImageChange }: Props) => {
  const [source, setSource] = useState<InfluencerSourceDto>(image?.source ?? 'generated');
  const [showGallery, setShowGallery] = useState(false);
  const current = image?.source === source ? image : null;

  const setTrait = <K extends keyof InfluencerTraits>(key: K, val: InfluencerTraits[K]) => onTraitsChange({ ...traits, [key]: val });

  const switchSource = (next: InfluencerSourceDto) => {
    setSource(next);
    if (image && image.source !== next) onImageChange(null);
  };

  const pickGallery = (item: GalleryItem) => {
    setShowGallery(false);
    onImageChange({ source: 'gallery', baseImageKey: '', previewUrl: item.url, galleryItemId: item.id });
    onTraitsChange({
      ...traits,
      gender: item.gender ?? traits.gender,
      age: item.age ? String(item.age) : traits.age,
      ethnicity: item.ethnicity ?? traits.ethnicity,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <SourcePicker value={source} onChange={switchSource} />
      {source === 'generated' && <GeneratePanel traits={traits} setTrait={setTrait} image={current} onImageChange={onImageChange} />}
      {source === 'uploaded' && <UploadPanel image={current} onImageChange={onImageChange} />}
      {source === 'gallery' && <GalleryPanel image={current} onBrowse={() => setShowGallery(true)} />}
      <div className="border-t border-app-line pt-5">
        <Field label="Name" htmlFor="inf-name" required helper="Only you see it. It helps you tell influencers apart.">
          <TextInput id="inf-name" value={traits.name} maxLength={80} onChange={(e) => setTrait('name', e.target.value)} placeholder="e.g. Sarah" />
        </Field>
      </div>
      {showGallery && <GalleryModal onSelect={pickGallery} onClose={() => setShowGallery(false)} />}
    </div>
  );
};
