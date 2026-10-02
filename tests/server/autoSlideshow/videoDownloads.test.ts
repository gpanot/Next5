import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  autoSlideshow: { findFirst: vi.fn() },
  blitzProject: { findFirst: vi.fn(), create: vi.fn() },
  blitzTemplate: { findFirst: vi.fn() },
  autoSlideshowVideoDownload: { create: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
}));
vi.mock('../../../src/lib/db', () => ({ prisma: db }));
vi.mock('../../../src/lib/r2', () => ({ getPresignedUrl: vi.fn(async () => 'https://signed/video.mp4') }));

const show = { id: 'show1', topic: 'Tips', position: 0, slides: [{ imageKey: 'a.jpg' }, { imageKey: 'b.jpg' }], audioAssetId: null, audioStart: 0, audio: null };
const project = (renderStatus: string) => ({ id: 'proj1', renderStatus, renderedVideoKey: renderStatus === 'COMPLETED' ? 'v.mp4' : null });
const who = { workspaceId: 'ws1', userId: 'user1' };

describe('slideshow video downloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.autoSlideshow.findFirst.mockResolvedValue(show);
    db.autoSlideshowVideoDownload.create.mockResolvedValue({ id: 'dl1' });
    db.autoSlideshowVideoDownload.findFirst.mockResolvedValue({ requestedAt: new Date(Date.now() - 74_000) });
  });

  it('records a new render as an open tap with who asked', async () => {
    const { startSlideshowVideo } = await import('../../../src/server/autoSlideshow/video');
    db.blitzProject.findFirst.mockResolvedValue(null);
    db.blitzTemplate.findFirst.mockResolvedValue({ id: 'tpl' });
    db.blitzProject.create.mockResolvedValue(project('PENDING'));
    const dto = await startSlideshowVideo('run1', 'show1', who);
    expect(dto.downloadId).toBe('dl1');
    expect(db.autoSlideshowVideoDownload.create).toHaveBeenCalledWith({ data: { slideshowId: 'show1', runId: 'run1', workspaceId: 'ws1', userId: 'user1', projectId: 'proj1', reused: false } });
    expect(db.autoSlideshowVideoDownload.updateMany).not.toHaveBeenCalled();
  });

  it('closes a reused finished render at once', async () => {
    const { startSlideshowVideo } = await import('../../../src/server/autoSlideshow/video');
    db.blitzProject.findFirst.mockResolvedValue(project('COMPLETED'));
    await startSlideshowVideo('run1', 'show1', who);
    expect(db.autoSlideshowVideoDownload.create.mock.calls[0]![0].data.reused).toBe(true);
    expect(db.autoSlideshowVideoDownload.updateMany.mock.calls[0]![0].data.status).toBe('completed');
  });

  it('stores the wait when a poll sees the render done, only for this render', async () => {
    const { getSlideshowVideo } = await import('../../../src/server/autoSlideshow/video');
    db.blitzProject.findFirst.mockResolvedValue(project('COMPLETED'));
    await getSlideshowVideo('run1', 'show1', 'proj1', 'dl1');
    const call = db.autoSlideshowVideoDownload.updateMany.mock.calls[0]![0];
    expect(call.where).toEqual({ id: 'dl1', projectId: 'proj1', status: 'rendering' });
    expect(call.data.waitMs).toBeGreaterThanOrEqual(74_000);
  });
});
