import type { IdeaDto } from '../../../../types/admin/calendarIdeas';

/**
 * An idea's cover: a video's first shot (its hook, a photo or the clip's first frame), which differs from card to card,
 * else the saved cover photo.
 */
export const ideaCover = (idea: IdeaDto): { url: string; video: boolean } | null => {
  const first = idea.card?.shots[0];
  if (first?.mediaUrl) return { url: first.mediaUrl, video: first.mediaKind === 'video' };
  return idea.coverUrl ? { url: idea.coverUrl, video: false } : null;
};
