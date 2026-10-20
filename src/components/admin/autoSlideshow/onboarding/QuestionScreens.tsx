'use client';

import { useState } from 'react';
import type { MonthlySpend, OnboardingProfileDto, PostingMode } from '../../../../types/admin/onboarding';
import { GOAL_OPTIONS, MODE_OPTIONS, PAIN_OPTIONS, SPEND_OPTIONS, type Option } from './onboardingCopy';
import { MultiOptions, OtherInput, RadioCards } from './OnboardingChoices';
import { Screen } from './OnboardingChrome';

export type OnNext = (answers: Partial<OnboardingProfileDto>) => void;
type Props = { profile: OnboardingProfileDto; onNext: OnNext };

const toggle = <K extends string>(list: K[], key: K): K[] => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

/** Whitespace-only text is saved as null. */
const cleanText = (text: string): string | null => text.trim() || null;

type MultiProps<K extends string> = {
  title: string; subtitle: string; options: Option<K>[];
  initial: K[]; initialOther: string | null; onSave: (keys: K[], other: string | null) => void;
};

/** A multi-select question with a "Something else?" field. Zero picks is a valid answer (an empty list, not a skip). */
function MultiQuestion<K extends string>({ title, subtitle, options, initial, initialOther, onSave }: MultiProps<K>) {
  const [keys, setKeys] = useState<K[]>(initial);
  const [other, setOther] = useState(initialOther ?? '');
  return (
    <Screen title={title} subtitle={subtitle} cta={{ label: 'Continue', onClick: () => onSave(keys, cleanText(other)) }}>
      <MultiOptions options={options} selected={keys} onToggle={(k) => setKeys((l) => toggle(l, k))} />
      <OtherInput value={other} onChange={setOther} />
    </Screen>
  );
}

export function GoalsScreen({ profile, onNext }: Props) {
  return (
    <MultiQuestion
      title="What do you want from social?"
      subtitle="Pick all that apply. We build your plan around it."
      options={GOAL_OPTIONS}
      initial={profile.goals}
      initialOther={profile.goalsOther}
      onSave={(goals, goalsOther) => onNext({ goals, goalsOther })}
    />
  );
}

export function PainsScreen({ profile, onNext }: Props) {
  return (
    <MultiQuestion
      title="What's hardest about content today?"
      subtitle="Pick all that apply. We will take these off your plate."
      options={PAIN_OPTIONS}
      initial={profile.pains}
      initialOther={profile.painsOther}
      onSave={(pains, painsOther) => onNext({ pains, painsOther })}
    />
  );
}

export function PostingModeScreen({ profile, onNext }: Props) {
  const [mode, setMode] = useState<PostingMode>(profile.postingMode);
  const items = MODE_OPTIONS.map((o) => ({ key: o.key, title: o.title, line: o.line, badge: o.recommended ? 'Recommended' : undefined }));
  return (
    <Screen title="How hands-on do you want to be?" subtitle="You can change this anytime in settings." cta={{ label: 'Continue', onClick: () => onNext({ postingMode: mode }) }}>
      <RadioCards label="How hands-on do you want to be?" items={items} value={mode} onChange={setMode} />
    </Screen>
  );
}

/** Optional, no default: Finish without a pick saves nothing. */
export function SpendScreen({ profile, onNext }: Props) {
  const [spend, setSpend] = useState<MonthlySpend | null>(profile.monthlySpend);
  const items = SPEND_OPTIONS.map((o) => ({ key: o.key, title: o.label }));
  return (
    <Screen
      kicker="Last one, optional"
      title="What do you spend on content or ads each month?"
      subtitle="Helps us suggest the right plan."
      cta={{ label: 'Finish', onClick: () => onNext(spend ? { monthlySpend: spend } : {}) }}
    >
      <RadioCards label="Monthly spend on content or ads" items={items} value={spend} onChange={setSpend} />
    </Screen>
  );
}
