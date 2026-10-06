import { describe, expect, it } from 'vitest';
import { spreadTimes, tomorrow } from '../../../src/components/admin/autoSlideshow/schedule';
import { carouselBody, postIdFromRaw } from '../../../src/server/social/tiktokCarousel';
import { parseSlideMediaId, readMediaToken, slideMediaUrl } from '../../../src/server/social/links';

describe('spreadTimes', () => {
  const now = new Date(2026, 9, 1, 12, 0);

  it('fills each day with the chosen times, in order', () => {
    const at = spreadTimes(5, '2026-10-02', ['19:00', '09:00'], 2, now);
    expect(at.map((d) => `${d.getDate()} ${d.getHours()}h`)).toEqual(['2 9h', '2 19h', '3 9h', '3 19h', '4 9h']);
  });

  it('never schedules in the past: today\'s earlier times are skipped', () => {
    const at = spreadTimes(2, '2026-10-01', ['09:00', '13:00', '19:00'], 3, now);
    expect(at.map((d) => d.getHours())).toEqual([13, 19]);
  });

  it('uses only as many times as posts a day', () => {
    const at = spreadTimes(3, '2026-10-02', ['09:00', '13:00', '19:00'], 1, now);
    expect(at.map((d) => d.getDate())).toEqual([2, 3, 4]);
  });

  it('gives tomorrow as a local date', () => {
    expect(tomorrow(now)).toBe('2026-10-02');
  });
});

describe('carouselBody', () => {
  it('builds a Direct Post photo carousel with TikTok music and the approver\'s choices', () => {
    const body = carouselBody({
      photoUrls: ['https://app.test/api/media/a.jpg', 'https://app.test/api/media/b.jpg'],
      title: 'x'.repeat(120),
      description: 'Save this #golf',
      privacyLevel: 'SELF_ONLY',
      allowComments: false,
      brandOrganic: true,
      brandContent: false,
    });
    expect(body.media_type).toBe('PHOTO');
    expect(body.post_mode).toBe('DIRECT_POST');
    expect(body.post_info.title.length).toBe(90);
    expect(body.post_info).toMatchObject({ privacy_level: 'SELF_ONLY', disable_comment: true, auto_add_music: true, brand_organic_toggle: true, brand_content_toggle: false });
    expect(body.source_info).toEqual({ source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: ['https://app.test/api/media/a.jpg', 'https://app.test/api/media/b.jpg'] });
  });
});

describe('postIdFromRaw', () => {
  it('keeps all 19 digits of the post id that JSON.parse would round', () => {
    const raw = '{"data":{"status":"PUBLISH_COMPLETE","publicaly_available_post_id":[7650000000000000001]},"error":{"code":"ok"}}';
    expect(String(JSON.parse(raw).data.publicaly_available_post_id[0])).not.toBe('7650000000000000001');
    expect(postIdFromRaw(raw)).toBe('7650000000000000001');
    expect(postIdFromRaw('{"data":{"publicaly_available_post_id":[]}}')).toBeNull();
  });
});

describe('slide media links', () => {
  it('signs a slide link on our domain that the media route can read back', () => {
    const url = slideMediaUrl('cmumb9ixt0000vuu5q2ynb0cq', 7);
    expect(url).toMatch(/\/api\/media\/[^/]+\.jpg$/);
    const id = readMediaToken(url.split('/api/media/')[1]!);
    expect(parseSlideMediaId(id!)).toEqual({ slideshowId: 'cmumb9ixt0000vuu5q2ynb0cq', index: 7 });
  });

  it('leaves batch item ids alone', () => {
    expect(parseSlideMediaId('cmitem123')).toBeNull();
  });
});

describe('instagram posting', () => {
  it('caps the caption at 2,200 characters and 30 hashtags', async () => {
    const { instagramCaption } = await import('../../../src/server/social/instagramCarousel');
    const tags = Array.from({ length: 40 }, (_, i) => `t${i}`);
    const text = instagramCaption('Save this', tags);
    expect(text.startsWith('Save this\n\n#t0 #t1')).toBe(true);
    expect(text.match(/#/g)).toHaveLength(30);
    expect(instagramCaption('x'.repeat(3000), []).length).toBe(2200);
  });

  it('refuses a carousel over 10 slides before calling Instagram', async () => {
    const { createCarousel } = await import('../../../src/server/social/instagramCarousel');
    const urls = Array.from({ length: 11 }, (_, i) => `https://app.test/${i}.jpg`);
    await expect(createCarousel('token', 'ig', urls, '')).rejects.toThrow(/up to 10 slides/);
  });
});

describe('parsePlatforms', () => {
  it('keeps TikTok choices only when TikTok is picked', async () => {
    const { parsePlatforms } = await import('../../../src/server/autoSlideshow/parsePosting');
    expect(parsePlatforms({ platforms: ['instagram', 'instagram', 'facebook'] })).toEqual({ platforms: ['instagram'], tiktok: null, youtube: null });
    expect(parsePlatforms({ platforms: ['youtube'], youtube: { privacyLevel: 'unlisted' } })).toEqual({ platforms: ['youtube'], tiktok: null, youtube: { privacyLevel: 'unlisted' } });
    expect(parsePlatforms({ platforms: ['youtube'] }).youtube).toEqual({ privacyLevel: 'private' });
    const both = parsePlatforms({ platforms: ['tiktok', 'instagram'], tiktok: { privacyLevel: 'SELF_ONLY', consent: true } });
    expect(both.tiktok).toEqual({ privacyLevel: 'SELF_ONLY', allowComments: true, brandOrganic: false, brandContent: false, consent: true });
  });

  it('asks for a platform, and for TikTok privacy', async () => {
    const { parsePlatforms } = await import('../../../src/server/autoSlideshow/parsePosting');
    expect(() => parsePlatforms({ platforms: [] })).toThrow(/Pick where to post/);
    expect(() => parsePlatforms({ platforms: ['tiktok'] })).toThrow(/who can see/);
  });
});
