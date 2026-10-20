'use client';

import { useId } from 'react';
import {
  TARGET_AGE_LABELS, TARGET_AGES, TARGET_GENDER_LABELS, TARGET_GENDERS, type TargetAge, type TargetGender,
} from '../../../../types/admin/targetClient';

const chipBase = 'relative flex min-h-[52px] cursor-pointer items-center justify-center rounded-xl border px-3 text-[15px] font-semibold transition active:scale-[0.98] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600/40';
const chipOff = 'border-zinc-200 bg-white text-ink hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-700';
const chipOn = 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-300';

type ChipsProps<K extends string> = {
  legend: string;
  keys: readonly K[];
  labels: Record<K, string>;
  value: K | null;
  onChange: (key: K) => void;
  columns: string;
  /** A small "Best match?" tag on this option: our guess from the site, the owner decides. */
  badged?: K | null;
};

/** A single-select group shown as big tap targets: a real radio group, one chip per option. */
function Chips<K extends string>({ legend, keys, labels, value, onChange, columns, badged }: ChipsProps<K>) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink dark:text-zinc-100">{legend}</legend>
      <div className={`grid gap-2.5 ${columns}`}>
        {keys.map((key) => (
          <label key={key} className={`${chipBase} ${value === key ? chipOn : chipOff}`}>
            <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} className="sr-only" />
            {labels[key]}
            {badged === key && (
              <span className="absolute -top-2 right-2 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Best match?
              </span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type Props = {
  age: TargetAge | null;
  gender: TargetGender | null;
  onAge: (age: TargetAge) => void;
  onGender: (gender: TargetGender) => void;
  /** The age read from the website, tagged "Best match?". */
  suggested?: TargetAge | null;
  /** Shows the gender choice only once an age is picked (the onboarding's step by step reveal). */
  revealGender?: boolean;
};

/** Age range of the main client (20-30 … 50+), then women, men or both. */
export function TargetClientPicker({ age, gender, onAge, onGender, suggested = null, revealGender = false }: Props) {
  const showGender = !revealGender || age !== null;
  return (
    <div className="space-y-6">
      <Chips legend="Age of your main client" keys={TARGET_AGES} labels={TARGET_AGE_LABELS} value={age} onChange={onAge} columns="grid-cols-2 sm:grid-cols-4" badged={suggested} />
      {showGender && (
        <div className={revealGender ? 'animate-onb-forward' : undefined}>
          <Chips legend="Preferably" keys={TARGET_GENDERS} labels={TARGET_GENDER_LABELS} value={gender} onChange={onGender} columns="grid-cols-3" />
        </div>
      )}
    </div>
  );
}
