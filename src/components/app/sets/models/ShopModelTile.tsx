'use client';

import { Settings2, Sparkles, UserRound } from 'lucide-react';
import Image from 'next/image';
import { hasManifestImage } from '../../../../lib/manifest';
import type { StudioSetDto } from '../../../../types/business/catalog';
import { AppLink as Link } from '../../shell/AppLink';
import type { ModelGroup, ModelInfo } from './modelIdentity';
import { MyPhotosButton } from './MyPhotosButton';

type Props = {
  group: ModelGroup;
  /** Her own photo (signed URL), for "You". */
  myPhotoUrl: string | null;
  /** After she changes her photos (You tile only). */
  onMyPhotosChanged: () => void;
};

const usedLine = (sets: readonly StudioSetDto[]): string => {
  const drops = sets.reduce((n, s) => n + s.batchCount, 0);
  return `Used in ${drops} drop${drops === 1 ? '' : 's'}`;
};

const ModelPortrait = ({ model, photoUrl }: { model: ModelInfo; photoUrl: string | null }) => {
  const src = [model.fullImage, model.faceImage].find((img): img is string => Boolean(img && hasManifestImage(img)));
  if (src) return <Image src={src} alt={model.name} fill sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw" className="object-cover object-top" />;
  // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
  if (photoUrl) return <img src={photoUrl} alt={model.name} className="h-full w-full object-cover object-top" />;
  return <div className="flex h-full items-center justify-center"><UserRound aria-hidden className="h-12 w-12 text-app-muted/50" /></div>;
};

/** One model on the Studio Models page. Same layout as a Brand influencer tile. */
export const ShopModelTile = ({ group, myPhotoUrl, onMyPhotosChanged }: Props) => {
  const { model, sets } = group;
  const setId = sets[0]!.id;
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-app-line bg-app-panel shadow-sm transition-shadow duration-200 hover:shadow-md dark:shadow-none">
      <div className="relative aspect-square bg-app-sunken sm:aspect-[4/5]">
        <ModelPortrait model={model} photoUrl={model.isMe ? myPhotoUrl : null} />
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {model.isMe ? 'Your photos' : 'Studio model'}
        </span>
        <Link
          href={`/app/sets/${setId}`}
          aria-label={`Manage ${model.name}`}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/80"
        >
          <Settings2 aria-hidden className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[16px] font-semibold text-app-ink">{model.name}</h3>
            {model.description && <p className="truncate text-[13px] text-app-muted">{model.description}</p>}
            <p className="text-[12px] text-app-muted">{usedLine(sets)}</p>
          </div>
          {model.isMe && <MyPhotosButton onChanged={onMyPhotosChanged} />}
        </div>
        <Link
          href={`/app/create?models=${setId}`}
          className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-app-cta px-4 text-[13px] font-medium text-app-cta-ink transition-opacity duration-200 hover:opacity-90"
        >
          <Sparkles aria-hidden className="h-4 w-4" />
          Create with {model.isMe ? 'you' : model.name}
        </Link>
      </div>
    </article>
  );
};
