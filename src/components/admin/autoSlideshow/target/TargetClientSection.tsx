'use client';

import { useState } from 'react';
import { targetAgeOf, type TargetAge, type TargetClientDto, type TargetGender } from '../../../../types/admin/targetClient';
import { TargetClientPicker } from './TargetClientPicker';
import { useTargetClient } from './useTargetClient';

const errorClass = 'rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300';

function SectionSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-app-line p-4" aria-busy="true" aria-label="Loading your main client">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-[52px] animate-pulse rounded-xl bg-app-sunken" />)}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-[52px] animate-pulse rounded-xl bg-app-sunken" />)}
      </div>
    </div>
  );
}

type FormProps = { target: TargetClientDto; saving: boolean; saveError: string | null; save: (age: TargetAge, gender: TargetGender) => Promise<boolean> };

/** The picker and Save, starting from the stored pick (or the age read from the site). */
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
    <div className="space-y-4 rounded-xl border border-app-line p-4 shadow-sm">
      <TargetClientPicker age={age} gender={gender} onAge={(a) => { setAge(a); setSaved(false); }} onGender={(g) => { setGender(g); setSaved(false); }} suggested={targetAgeOf(target.detectedRange)} />
      {saveError && <p role="alert" className={errorClass}>{saveError}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={!changed || saving}
          className="min-h-11 rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && !changed && <p className="text-sm text-app-muted">Saved. New faces follow this. To remake one, tap New face in its ⋮ menu.</p>}
      </div>
    </div>
  );
}

/** The Brand page's "Your main client": the age range and gender the brand avatars are cast for. */
export function TargetClientSection({ token, workspaceId }: { token: string; workspaceId: string }) {
  const { target, loading, loadError, saving, saveError, save } = useTargetClient(token, workspaceId);
  return (
    <section aria-labelledby="target-client-title" className="space-y-3">
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
