'use client';

import { Camera, Images, Sparkles } from 'lucide-react';
import type { InfluencerSourceDto } from '../../../../types/business/influencers';

const OPTIONS: readonly { value: InfluencerSourceDto; label: string; hint: string; Icon: typeof Sparkles }[] = [
  { value: 'generated', label: 'Describe', hint: 'AI makes a face', Icon: Sparkles },
  { value: 'uploaded', label: 'Use a photo', hint: 'Your selfie', Icon: Camera },
  { value: 'gallery', label: 'Gallery', hint: 'Ready-made faces', Icon: Images },
];

type Props = { value: InfluencerSourceDto; onChange: (v: InfluencerSourceDto) => void };

/** Three ways to get a face, as big tap targets. */
export const SourcePicker = ({ value, onChange }: Props) => (
  <div role="radiogroup" aria-label="Where the face comes from" className="grid grid-cols-3 gap-2">
    {OPTIONS.map(({ value: v, label, hint, Icon }) => {
      const active = v === value;
      return (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(v)}
          className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${active ? 'border-app-accent bg-app-accent-soft' : 'border-app-line bg-app-panel hover:border-app-muted'}`}
        >
          <Icon aria-hidden className={`h-5 w-5 ${active ? 'text-app-accent' : 'text-app-muted'}`} />
          <span className="text-[13px] font-medium leading-tight text-app-ink">{label}</span>
          <span className="text-[11px] leading-tight text-app-muted">{hint}</span>
        </button>
      );
    })}
  </div>
);
