import { describe, expect, it } from 'vitest';
import { videoBody } from '../../../src/server/social/tiktokVideo';

describe('TikTok video Direct Post body', () => {
  it('pulls the MP4 from our URL with the person\'s choices', () => {
    const body = videoBody({ videoUrl: 'https://x.test/api/media/a.b.mp4', title: 'Hook', privacyLevel: 'SELF_ONLY', allowComments: false, brandOrganic: true, brandContent: false });
    expect(body.source_info).toEqual({ source: 'PULL_FROM_URL', video_url: 'https://x.test/api/media/a.b.mp4' });
    expect(body.post_info).toMatchObject({ title: 'Hook', privacy_level: 'SELF_ONLY', disable_comment: true, brand_organic_toggle: true, is_aigc: true });
  });

  it('keeps Duet and Stitch off unless the person turned them on', () => {
    const base = { videoUrl: 'u', title: 'T', privacyLevel: 'PUBLIC_TO_EVERYONE', allowComments: false, brandOrganic: false, brandContent: false };
    expect(videoBody(base).post_info).toMatchObject({ disable_duet: true, disable_stitch: true });
    expect(videoBody({ ...base, allowDuet: true, allowStitch: true }).post_info).toMatchObject({ disable_duet: false, disable_stitch: false });
  });

  it('clips the caption to 2,200 characters', () => {
    const body = videoBody({ videoUrl: 'u', title: 'a'.repeat(3000), privacyLevel: 'PUBLIC_TO_EVERYONE', allowComments: true, brandOrganic: false, brandContent: false });
    expect(body.post_info.title).toHaveLength(2200);
  });
});
