'use client';

import { APP_SHOT_POSES, type AppShotPoseId } from '../../../../../config/appShotPoses';
import { PoseScreenPreview } from './PoseScreenPreview';
import { StepTitle } from './StepTitle';

/** screen: the uploaded app screenshot's URL, shown on each thumb's green screen; null before one is uploaded. */
type Props = { pose: AppShotPoseId; screen: string | null; onPick: (pose: AppShotPoseId) => void };

/** Step 1: how the phone is held. The green screen in each thumb is where the app screen goes, and shows it once uploaded. */
export function PoseStep({ pose, screen, onPick }: Props) {
  return (
    <section>
      <StepTitle n={1} title="Pose" done />
      <div className="grid grid-cols-2 gap-2">
        {APP_SHOT_POSES.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={pose === p.id}
            onClick={() => onPick(p.id)}
            className={`overflow-hidden rounded-xl border-2 bg-zinc-900 text-left transition active:scale-[0.97] ${pose === p.id ? 'border-emerald-400' : 'border-white/10 hover:border-white/30'}`}
          >
            <span className="relative block aspect-[9/16] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt="" className="h-full w-full object-cover" />
              {screen && <PoseScreenPreview pose={p} src={screen} />}
            </span>
            <span className="block truncate px-2 py-1.5 text-center text-xs text-white/75">{p.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-white/45">{screen ? 'Your screen, at this exact angle.' : 'Your screen sits on the green part, at this exact angle.'}</p>
    </section>
  );
}
