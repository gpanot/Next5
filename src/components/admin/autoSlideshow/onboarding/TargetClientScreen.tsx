'use client';

import { useState } from 'react';
import { targetAgeOf, type TargetAge, type TargetClientDto, type TargetGender } from '../../../../types/admin/targetClient';
import { TargetClientPicker } from '../target/TargetClientPicker';
import { Screen } from './OnboardingChrome';

type Props = {
  target: TargetClientDto | null;
  /** The age range read from the website ("25-45"); null while it is read, or when the site shows no people. */
  detectedRange: string | null;
  /** True while the website is still being read: the range may still come. */
  reading: boolean;
  saving: boolean;
  error: string | null;
  onConfirm: (age: TargetAge, gender: TargetGender) => void;
};

/** What we read from the site, or a pulse while we read it. */
function Detected({ range, reading }: { range: string | null; reading: boolean }) {
  if (range) {
    return (
      <p className="mt-2 text-[15px] text-muted">
        From your website, your clients are about <span className="font-semibold text-ink dark:text-zinc-100">{range}</span> years old. Pick the group that fits your main client today.
      </p>
    );
  }
  if (reading) {
    return (
      <div className="mt-2 space-y-2" aria-label="Reading your website">
        <div className="h-4 w-11/12 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }
  return <p className="mt-2 text-[15px] text-muted">Pick the group that fits your main client today.</p>;
}

/**
 * The first onboarding screen and a hard stop: the workspace makes no brand avatar and no slideshow before the owner
 * picks the age and gender of their main client. Editable later on the Brand page.
 */
export function TargetClientScreen({ target, detectedRange, reading, saving, error, onConfirm }: Props) {
  const [age, setAge] = useState<TargetAge | null>(target?.age ?? null);
  const [gender, setGender] = useState<TargetGender | null>(target?.gender ?? null);
  const ready = age !== null && gender !== null && !saving;
  return (
    <Screen
      kicker="We're making your brand avatar"
      title="Who is your main client?"
      cta={{ label: saving ? 'Saving…' : 'Confirm', onClick: () => age && gender && onConfirm(age, gender), disabled: !ready }}
      ctaNote="You can change this later on your Brand page."
    >
      <div className="-mt-4 mb-6">
        <Detected range={detectedRange} reading={reading} />
      </div>
      <TargetClientPicker age={age} gender={gender} onAge={setAge} onGender={setGender} suggested={targetAgeOf(detectedRange)} revealGender />
      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
    </Screen>
  );
}
