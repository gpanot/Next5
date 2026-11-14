'use client';

import { Dialog } from '../../ui/Dialog';
import type { ListingVideoDto } from '../../../types/business/listingVideos';
import { PRESET_EXAMPLES } from './presets';

type Props = {
  preset: ListingVideoDto['preset'] | null;
  name: string;
  line: string;
  onClose: () => void;
};

/** Pop-up with a finished example of one video style. Loads only when opened. */
export const PresetPreviewDialog = ({ preset, name, line, onClose }: Props) => {
  const example = preset ? PRESET_EXAMPLES[preset] : null;
  return (
    <Dialog open={Boolean(example)} onClose={onClose} title={name} description={`Example · ${line}`} className="max-w-sm">
      {example && (
        <div className="mx-auto aspect-[9/16] max-h-[70dvh] overflow-hidden rounded-xl bg-black ring-1 ring-app-line">
          <video key={example.video} src={example.video} poster={example.poster} controls autoPlay playsInline className="h-full w-full object-contain" />
        </div>
      )}
    </Dialog>
  );
};
