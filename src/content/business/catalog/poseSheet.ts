import type { ShotId } from '../../../config/shots';

/** The four poses on every model's pose sheet, in the order shown. The same shots product photos use. */
export const POSE_SHEET_POSES = ['full_body_front', 'walking_motion', 'side_profile', 'seated_pose'] as const satisfies readonly ShotId[];
export type PoseSheetPose = (typeof POSE_SHEET_POSES)[number];

const DIR = '/images/business/shop/models/poses';

/** Pre-made pose photo of a Studio model (made by scripts/gen-pose-sheets.ts). Check it with hasManifestImage. */
export const studioPosePath = (slug: string, pose: PoseSheetPose): string => `${DIR}/${slug}-${pose.replace(/_/g, '-')}.png`;
