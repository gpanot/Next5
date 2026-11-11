'use client';

import { ABOUT_MAX, type About } from '../../../lib/blueprint/schema';
import { TextInput } from '../../ui/TextInput';
import { ABOUT_CARD } from './planCopy';

const KEYS = ['aud', 'off', 'cred', 'voice'] as const;

/** The creator's facts, filled once and used by all 7 scripts. */
export const AboutCard = ({ about, onChange }: { about: About; onChange: (about: About) => void }) => (
  <section className="flex flex-col gap-3 rounded-2xl border border-app-line bg-app-panel p-4 shadow-sm sm:p-5">
    <div>
      <h3 className="text-[16px] font-semibold text-app-ink">{ABOUT_CARD.title}</h3>
      <p className="text-[14px] text-app-muted">{ABOUT_CARD.body}</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {KEYS.map((key) => (
        <label key={key} className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-app-ink">{ABOUT_CARD.fields[key].label}</span>
          <TextInput
            value={about[key]}
            maxLength={ABOUT_MAX}
            placeholder={ABOUT_CARD.fields[key].placeholder}
            onChange={(e) => onChange({ ...about, [key]: e.target.value })}
            className="min-h-11 text-[16px] sm:text-[14px]"
          />
        </label>
      ))}
    </div>
  </section>
);
