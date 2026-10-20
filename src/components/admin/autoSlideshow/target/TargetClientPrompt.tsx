'use client';

import { useEffect, useState } from 'react';
import { targetAgeOf, type TargetAge, type TargetClientDto, type TargetGender } from '../../../../types/admin/targetClient';
import { TargetClientPicker } from './TargetClientPicker';
import { useTargetClient } from './useTargetClient';

const TITLE_ID = 'target-client-prompt-title';
const laterKey = (workspaceId: string) => `next5:target-later:${workspaceId}`;

/** "Later" hides the pop-up for this tab's session only; it comes back on the next visit. */
const laterStore = {
  get: (workspaceId: string): boolean => {
    try {
      return sessionStorage.getItem(laterKey(workspaceId)) === '1';
    } catch {
      return false;
    }
  },
  set: (workspaceId: string) => {
    try {
      sessionStorage.setItem(laterKey(workspaceId), '1');
    } catch {
      // Storage blocked: the pop-up just closes for now.
    }
  },
};

type DialogProps = {
  target: TargetClientDto;
  saving: boolean;
  error: string | null;
  onSave: (age: TargetAge, gender: TargetGender) => void;
  onLater: () => void;
};

function TargetClientDialog({ target, saving, error, onSave, onLater }: DialogProps) {
  const [age, setAge] = useState<TargetAge | null>(target.age);
  const [gender, setGender] = useState<TargetGender | null>(target.gender);
  const suggested = targetAgeOf(target.detectedRange);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onLater();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onLater]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={TITLE_ID} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-surface px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl animate-onb-forward sm:max-w-[440px] sm:rounded-[28px] dark:bg-zinc-950">
        <p className="mb-2 text-xs font-semibold tracking-wide text-blue-600 uppercase dark:text-blue-400">Your brand avatars</p>
        <h2 id={TITLE_ID} className="font-heading text-[26px] leading-tight tracking-tight text-ink dark:text-zinc-100">Who is your main client?</h2>
        <p className="mt-2 text-[15px] text-muted">
          {target.detectedRange ? (
            <>From your website, your clients are about <span className="font-semibold text-ink dark:text-zinc-100">{target.detectedRange}</span> years old. </>
          ) : null}
          Pick the group that fits your main client today. We make your avatars look like them.
        </p>
        <div className="mt-6">
          <TargetClientPicker age={age} gender={gender} onAge={setAge} onGender={setGender} suggested={suggested} revealGender />
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => age && gender && onSave(age, gender)}
          disabled={!age || !gender || saving}
          className="mt-6 h-[54px] w-full rounded-full bg-app-cta text-[15px] font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onLater} className="mt-2 min-h-11 w-full rounded-full text-sm font-medium text-muted transition hover:text-ink dark:hover:text-zinc-100">
          Later
        </button>
      </div>
    </div>
  );
}

/**
 * Asks a workspace that has no target client yet (made before the onboarding asked it) to pick one. Waits while the
 * onboarding is open (it asks itself). Change it later on the Brand page.
 */
export function TargetClientPrompt({ token, workspaceId }: { token: string; workspaceId: string }) {
  const { target, saving, saveError, save } = useTargetClient(token, workspaceId);
  const [later, setLater] = useState(() => laterStore.get(workspaceId));
  if (!target || target.confirmedAt || target.inOnboarding || later) return null;
  const onLater = () => {
    laterStore.set(workspaceId);
    setLater(true);
  };
  return <TargetClientDialog target={target} saving={saving} error={saveError} onSave={(age, gender) => void save(age, gender)} onLater={onLater} />;
}
