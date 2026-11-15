'use client';

import { Film } from 'lucide-react';
import { AppButton } from '../../ui/AppButton';
import { Dialog } from '../../ui/Dialog';
import type { ListingVideoDto } from '../../../types/business/listingVideos';
import { PRESET_EXAMPLES } from './presets';

type Props = {
  preset: ListingVideoDto['preset'] | null;
  name: string;
  line: string;
  onClose: () => void;
  /** Starts this style for the home; hidden when it is already made or being made. */
  onMake?: () => void;
  making?: boolean;
};

/** Pop-up with a finished example of one video style. Loads only when opened. */
export const PresetPreviewDialog = ({ preset, name, line, onClose, onMake, making = false }: Props) => {
  const example = preset ? PRESET_EXAMPLES[preset] : null;
  return (
    <Dialog open={Boolean(example)} onClose={onClose} title={name} description={`Example · ${line}`} className="max-w-sm">
      {example && (
        <div className="flex flex-col gap-3">
          <div className="mx-auto aspect-[9/16] max-h-[60dvh] overflow-hidden rounded-xl bg-black ring-1 ring-app-line">
            <video key={example.video} src={example.video} poster={example.poster} controls autoPlay playsInline className="h-full w-full object-contain" />
          </div>
          {onMake && (
            <AppButton fullWidth size="lg" loading={making} onClick={onMake} iconLeft={<Film aria-hidden className="h-4 w-4" />}>
              Make this video
            </AppButton>
          )}
        </div>
      )}
    </Dialog>
  );
};
