'use client';

import type { OnboardingProfileDto } from '../../../../types/admin/onboarding';
import type { BuildStatus } from './buildStatus';
import { LiveBuildScreen, ValuePropScreen } from './InfoScreens';
import { GoalsScreen, PainsScreen, PostingModeScreen, SpendScreen, type OnNext } from './QuestionScreens';
import { ReadyScreen } from './ReadyScreen';

type Props = { step: number; profile: OnboardingProfileDto; build: BuildStatus; slow: boolean; onNext: OnNext; onDone: () => void };

/** Screens in order: 0 value prop, 1 goals, 2 difficulties, 3 hands-on, 4 live build, 5 spend, 6 ready. */
export function StepScreen({ step, profile, build, slow, onNext, onDone }: Props) {
  switch (step) {
    case 0:
      return <ValuePropScreen onNext={() => onNext({})} />;
    case 1:
      return <GoalsScreen profile={profile} onNext={onNext} />;
    case 2:
      return <PainsScreen profile={profile} onNext={onNext} />;
    case 3:
      return <PostingModeScreen profile={profile} onNext={onNext} />;
    case 4:
      return <LiveBuildScreen stages={build.stages} onNext={() => onNext({})} />;
    case 5:
      return <SpendScreen profile={profile} onNext={onNext} />;
    default:
      return <ReadyScreen profile={profile} build={build} slow={slow} onDone={onDone} />;
  }
}
