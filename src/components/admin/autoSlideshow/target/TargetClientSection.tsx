'use client';

import { useState } from 'react';
import {
  TARGET_AGE_LABELS, TARGET_AGES, TARGET_GENDER_LABELS, TARGET_GENDERS, targetAgeOf,
  type TargetAge, type TargetClientDto, type TargetGender,
} from '../../../../types/admin/targetClient';
import { useTargetClient } from './useTargetClient';

const errorClass = 'rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300';
const selectClass =
  'min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base text-ink transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-400';

function SectionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2" aria-busy="true" aria-label="Loading your main client">
      {Array.from({ length: 2 }, (_, i) => <div key={i} className="h-[62px] animate-pulse rounded-xl bg-app-sunken" />)}
    </div>
  );
}

type SelectProps<K extends string> = {
  label: string;
  keys: readonly K[];
  labels: Record<K, string>;
  value: K | null;
  onChange: (key: K) => void;
};

/** One labelled dropdown; "Pick one" until a value is chosen. */
function Select<K extends string>({ label, keys, labels, value, onChange }: SelectProps<K>) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-ink dark:text-zinc-100">{label}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value as K)} className={selectClass}>
        {value === null && <option value="" disabled>Pick one</option>}
        {keys.map((key) => (
          <option key={key} value={key}>{labels[key]}</option>
        ))}
      </select>
    </label>
  );
}

type FormProps = { target: TargetClientDto; saving: boolean; saveError: string | null; save: (age: TargetAge, gender: TargetGender) => Promise<boolean> };

/** Two dropdowns starting from the stored pick (or the age read from the site); Save shows only after a change. */
function TargetClientForm({ target, saving, saveError, save }: FormProps) {
  const [age, setAge] = useState<TargetAge | null>(target.age ?? targetAgeOf(target.detectedRange));
  const [gender, setGender] = useState<TargetGender | null>(target.gender);
  const [saved, setSaved] = useState(false);
  const changed = age !== null && gender !== null && (age !== target.age || gender !== target.gender);
  const onSave = async () => {
    if (!age || !gender) return;
    setSaved(await save(age, gender));
  };
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Select label="Age" keys={TARGET_AGES} labels={TARGET_AGE_LABELS} value={age} onChange={(a) => { setAge(a); setSaved(false); }} />
        <Select label="Preferably" keys={TARGET_GENDERS} labels={TARGET_GENDER_LABELS} value={gender} onChange={(g) => { setGender(g); setSaved(false); }} />
      </div>
      {saveError && <p role="alert" className={errorClass}>{saveError}</p>}
      {changed && (
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="min-h-11 rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      )}
      {saved && !changed && <p className="text-xs text-app-muted">Saved. New faces follow this. To remake one, tap New face in its ⋮ menu.</p>}
    </div>
  );
}

/** The Brand page's "Your main client": the age range and gender the brand avatars are cast for. */
export function TargetClientSection({ token, workspaceId }: { token: string; workspaceId: string }) {
  const { target, loading, loadError, saving, saveError, save } = useTargetClient(token, workspaceId);
  return (
    <section aria-labelledby="target-client-title" className="space-y-2">
      <div className="space-y-0.5">
        <h2 id="target-client-title" className="text-sm font-bold text-app-ink">Your main client</h2>
        <p className="text-sm text-app-muted">Your brand avatars are made to look like them.</p>
      </div>
      {loading && <SectionSkeleton />}
      {!loading && loadError && <p role="alert" className={errorClass}>{loadError}</p>}
      {target && <TargetClientForm target={target} saving={saving} saveError={saveError} save={save} />}
    </section>
  );
}
