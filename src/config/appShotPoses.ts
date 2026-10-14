/**
 * The App shot poses: a hand holding a phone, keyed once by scripts/build-app-shot-poses.ts. Each pose has its overlay
 * (hand and phone, see-through elsewhere), its screen mask, a thumb, and the screen's four corners at photo size
 * (1440x2560: top left, top right, bottom right, bottom left) that the app screenshot is warped onto.
 */

export type AppShotPoseId = 'held-up' | 'over-shoulder';

export type AppShotPose = {
  id: AppShotPoseId;
  label: string;
  thumb: string;
  overlay: string;
  screen: string;
  quad: [number, number][];
};

const DIR = '/images/app-shot';

const pose = (id: AppShotPoseId, label: string, quad: [number, number][]): AppShotPose => ({
  id,
  label,
  thumb: `${DIR}/${id}-thumb.jpg`,
  overlay: `${DIR}/${id}-overlay.png`,
  screen: `${DIR}/${id}-screen.png`,
  quad,
});

export const APP_SHOT_POSES: AppShotPose[] = [
  pose('held-up', 'Held up', [[410, 510], [1038, 506], [1050, 1962], [407, 1960]]),
  pose('over-shoulder', 'Over the shoulder', [[392, 569], [759, 510], [926, 1425], [564, 1502]]),
];

export const appShotPose = (id: unknown): AppShotPose | null => APP_SHOT_POSES.find((p) => p.id === id) ?? null;
