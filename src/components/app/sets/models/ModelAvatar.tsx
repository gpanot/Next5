'use client';

import { UserRound } from 'lucide-react';
import Image from 'next/image';
import { hasManifestImage } from '../../../../lib/manifest';
import type { ModelInfo } from './modelIdentity';

type Props = { model: ModelInfo; /** Her own face (signed URL), for "You". */ photoUrl?: string | null; size?: 'md' | 'lg' };

const SIZE = { md: 'h-12 w-12', lg: 'h-16 w-16' } as const;

/** Round face of one model: the Studio model image, or her own selfie for "You". */
export const ModelAvatar = ({ model, photoUrl, size = 'lg' }: Props) => (
  <span className={`relative block shrink-0 overflow-hidden rounded-full bg-app-sunken ring-2 ring-app-panel ${SIZE[size]}`}>
    {model.faceImage && hasManifestImage(model.faceImage) ? (
      <Image src={model.faceImage} alt={model.name} fill sizes="64px" className="object-cover" />
    ) : photoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
      <img src={photoUrl} alt={model.name} className="h-full w-full object-cover" />
    ) : (
      <span className="flex h-full w-full items-center justify-center text-app-muted"><UserRound aria-hidden className="h-6 w-6" /></span>
    )}
  </span>
);
