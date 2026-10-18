'use client';

/** The model choice at the top of the clone form, with each mode's billing note. */

import { Section } from '../ugcLab/ui';
import { CLONE_MODES, MODE_CONFIG, type CloneMode } from './cloneConfig';

type Props = {
  mode: CloneMode;
  onModeChange: (mode: CloneMode) => void;
};

export function CloneModePicker({ mode, onModeChange }: Props) {
  const config = MODE_CONFIG[mode];

  return (
    <Section title="UGC Clone" description="Pick a mode, then follow the steps below">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CLONE_MODES.map((m) => {
          const c = MODE_CONFIG[m];
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-colors ${
                active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:bg-surface-alt'
              }`}
            >
              <span className="text-[14px] font-semibold">{c.label}</span>
              <span className={`font-mono text-[10px] ${active ? 'text-white/60' : 'text-muted'}`}>{c.model}</span>
              <span className={`text-[11px] leading-snug ${active ? 'text-white/80' : 'text-muted'}`}>{c.hint}</span>
            </button>
          );
        })}
      </div>
      {config.billingNote && (
        <p className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-[12px] text-orange-800">{config.billingNote}</p>
      )}
    </Section>
  );
}
