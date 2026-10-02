import { describe, expect, it } from 'vitest';
import { badgeOf, groupBy, liftOf, platformMedians, views48h } from '../../../src/components/admin/autoSlideshow/analytics/insights';
import { afterFailedRead, afterGoodRead, CHECKPOINTS, firstStatsAt, nextCheckpointAt, stoppedGrowing } from '../../../src/server/autoSlideshow/statsSchedule';
import { parseTikTokPublicStats } from '../../../src/server/social/tiktokPublicStats';
import type { AnalyticsPostDto } from '../../../src/types/admin/slideshowAnalytics';

const H = 60 * 60 * 1000;
const posted = new Date('2026-10-01T12:00:00Z');
const at = (hours: number) => new Date(posted.getTime() + hours * H);

describe('stats schedule', () => {
  it('reads at +48h, +96h, +7d, then weekly up to 8 weeks', () => {
    expect(CHECKPOINTS).toEqual([48, 96, 168, 336, 504, 672, 840, 1008, 1176, 1344]);
    expect(firstStatsAt(posted)).toEqual(at(48));
    expect(nextCheckpointAt(posted, at(48))).toEqual(at(96));
    expect(nextCheckpointAt(posted, at(170))).toEqual(at(336));
    expect(nextCheckpointAt(posted, at(1344))).toBeNull();
  });

  it('ends tracking when a weekly read grew views under 5%', () => {
    expect(stoppedGrowing(336, { views: 1000 }, { views: 1040 })).toBe(true);
    expect(stoppedGrowing(336, { views: 1000 }, { views: 1100 })).toBe(false);
    // First-week reads never end tracking
    expect(stoppedGrowing(96, { views: 1000 }, { views: 1000 })).toBe(false);
    expect(afterGoodRead(posted, at(336), { views: 1000 }, { views: 1001 })).toBeNull();
  });

  it('retries a failed read hourly, then skips to the next checkpoint with fresh tries', () => {
    expect(afterFailedRead(posted, at(48), 1)).toEqual({ nextAt: at(49), tries: 1 });
    expect(afterFailedRead(posted, at(50), 3)).toEqual({ nextAt: at(96), tries: 0 });
  });
});

describe('parseTikTokPublicStats', () => {
  it('reads the app shape, saves included', () => {
    expect(parseTikTokPublicStats({ statistics: { play_count: 1607478, digg_count: 36750, comment_count: 2434, share_count: 96080, collect_count: 10018 } }))
      .toEqual({ views: 1607478, likes: 36750, comments: 2434, shares: 96080, saves: 10018 });
  });

  it('reads the web shape, string counts included', () => {
    expect(parseTikTokPublicStats({ stats: { playCount: 10, diggCount: 2, commentCount: 1, shareCount: 0, collectCount: '3' } }))
      .toEqual({ views: 10, likes: 2, comments: 1, shares: 0, saves: 3 });
  });

  it('gives null for a missing video', () => {
    expect(parseTikTokPublicStats(null)).toBeNull();
    expect(parseTikTokPublicStats({ id: 'x' })).toBeNull();
  });
});

const post = (id: string, platform: 'tiktok' | 'instagram', views48: number | null, hookPattern = 'listicle'): AnalyticsPostDto => ({
  id, slideshowId: id, runId: 'r', platform, postedAt: posted.toISOString(), postUrl: null, hook: id, topic: 't', hookPattern,
  modelName: 'm', goal: 'teach', thumbnailUrl: null, stats: views48 === null ? null : { views: views48 }, statsAt: null, nextStatsAt: null,
  snapshots: views48 === null ? [] : [{ ageHours: 49, takenAt: posted.toISOString(), stats: { views: views48 } }], noNumbers: null,
});

describe('insights', () => {
  it('only counts a read taken 48-72h after posting as the 48h number', () => {
    expect(views48h({ ...post('a', 'tiktok', 100), snapshots: [{ ageHours: 200, takenAt: '', stats: { views: 9 } }] })).toBeNull();
    expect(views48h(post('a', 'tiktok', 100))).toBe(100);
  });

  it('compares each post to its own platform median, once a platform has 5 posts', () => {
    const tiktok = [100, 100, 100, 100, 400].map((v, i) => post(`t${i}`, 'tiktok', v));
    const ig = [10, 10, 10].map((v, i) => post(`i${i}`, 'instagram', v));
    const medians = platformMedians([...tiktok, ...ig]);
    expect(medians).toEqual({ tiktok: 100 });
    expect(liftOf(tiktok[4], medians)).toBe(4);
    expect(badgeOf(liftOf(tiktok[4], medians))).toBe('winner');
    expect(badgeOf(0.4)).toBe('flop');
    expect(liftOf(ig[0], medians)).toBeNull();
  });

  it('groups hooks with 5+ judged posts, best lift first', () => {
    const posts = [
      ...[300, 300, 300, 300, 300].map((v, i) => post(`a${i}`, 'tiktok', v, 'question')),
      ...[100, 100, 100, 100, 100].map((v, i) => post(`b${i}`, 'tiktok', v, 'listicle')),
      post('c', 'tiktok', 100, 'story'),
    ];
    const groups = groupBy(posts, 'hookPattern', platformMedians(posts));
    expect(groups.map((g) => [g.label, g.posts, g.lift])).toEqual([['question', 5, 3], ['listicle', 5, 1]]);
  });
});
