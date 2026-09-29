import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/server/admin/ugcLab', () => ({ tregCall: vi.fn() }));

const load = () => import('../../../src/server/slideshowKnowledge/tiktokPosts');

describe('TikTok link parsing', () => {
  it('reads the post id from video and photo links', async () => {
    const { postIdOf } = await load();
    expect(postIdOf('https://www.tiktok.com/@scratchaiapp/photo/7631608889665948942?_r=1')).toBe('7631608889665948942');
    expect(postIdOf('https://www.tiktok.com/@foodbyfranchi/video/7479916555602513174')).toBe('7479916555602513174');
    expect(postIdOf('https://vm.tiktok.com/ZMabc123/')).toBeNull();
  });

  it('accepts full and short links, rejects other sites', async () => {
    const { isTikTokLink } = await load();
    expect(isTikTokLink('https://vm.tiktok.com/ZMabc123/')).toBe(true);
    expect(isTikTokLink('https://www.tiktok.com/t/ZTFNEj8Hk/')).toBe(true);
    expect(isTikTokLink('https://www.tiktok.com/@scratchaiapp')).toBe(false);
    expect(isTikTokLink('https://instagram.com/p/123')).toBe(false);
  });

  it('turns @handles and profile links into a bare handle', async () => {
    const { handleOf } = await load();
    expect(handleOf('@scratchaiapp')).toBe('scratchaiapp');
    expect(handleOf('https://www.tiktok.com/@scratchaiapp?lang=en')).toBe('scratchaiapp');
    expect(handleOf(' scratchaiapp ')).toBe('scratchaiapp');
  });
});

describe('toPhotoPost', () => {
  const aweme = {
    aweme_id: '7631608889665948942',
    desc: '#golf #golftips',
    create_time: 1776872463,
    author: { unique_id: 'scratchaiapp' },
    statistics: { play_count: 546301, digg_count: 37537, collect_count: 13688, share_count: 1925, comment_count: 41 },
    image_post_info: {
      images: [
        { display_image: { url_list: ['https://cdn/a.heic', 'https://cdn/a.jpeg?x=1'], width: 1080, height: 1350 } },
        { display_image: { url_list: ['https://cdn/b.webp'], width: 1080, height: 1350 } },
      ],
    },
  };

  it('keeps stats, prefers JPEG/WebP over HEIC, builds a canonical link', async () => {
    const { toPhotoPost } = await load();
    const post = toPhotoPost(aweme);
    expect(post?.url).toBe('https://www.tiktok.com/@scratchaiapp/photo/7631608889665948942');
    expect(post?.stats).toEqual({ views: 546301, likes: 37537, saves: 13688, shares: 1925, comments: 41 });
    expect(post?.images.map((i) => i.url)).toEqual(['https://cdn/a.jpeg?x=1', 'https://cdn/b.webp']);
    expect(post?.postedAt?.toISOString()).toBe('2026-04-22T15:41:03.000Z');
  });

  it('returns null for videos', async () => {
    const { toPhotoPost } = await load();
    expect(toPhotoPost({ ...aweme, image_post_info: undefined })).toBeNull();
  });
});
