// server-only — never import from a 'use client' file.
// YouTube Shorts upload: a vertical video of 3 minutes or less with #Shorts is a Short.
// YouTube cannot pull a video from a link (TikTok can), so the MP4 is sent from here in one resumable request.
// Docs: developers.google.com/youtube/v3/guides/using_resumable_upload_protocol

import { HttpError } from '../http';
import { providerFetch } from './http';

const UPLOAD = 'https://www.googleapis.com/upload/youtube/v3/videos';
const VIDEOS = 'https://www.googleapis.com/youtube/v3/videos';

export const YOUTUBE_PRIVACY = ['private', 'unlisted', 'public'] as const;
export type YouTubePrivacy = (typeof YOUTUBE_PRIVACY)[number];
export const isYouTubePrivacy = (v: unknown): v is YouTubePrivacy => YOUTUBE_PRIVACY.includes(v as YouTubePrivacy);

export type ShortInput = { title: string; description: string; tags: string[]; privacy: YouTubePrivacy; video: Buffer };

/** Titles are capped at 100 characters; #Shorts goes in the title or description so YouTube files it as a Short. */
const titleOf = (title: string): string => {
  const base = title.replace(/[<>]/g, '').trim() || 'Slideshow';
  const tag = ' #Shorts';
  return (base.length + tag.length > 100 ? `${base.slice(0, 100 - tag.length - 1)}…` : base) + tag;
};

/** Uploads the MP4 and returns the video id. Quota: 1600 units per upload (10,000 a day by default). */
export const uploadShort = async (accessToken: string, input: ShortInput): Promise<string> => {
  const meta = {
    snippet: { title: titleOf(input.title), description: input.description.slice(0, 4900), tags: input.tags.slice(0, 15), categoryId: '22' },
    // Made-for-kids is a legal flag on YouTube: these slideshows are for adults.
    status: { privacyStatus: input.privacy, selfDeclaredMadeForKids: false, containsSyntheticMedia: true },
  };
  const start = await fetch(`${UPLOAD}?uploadType=resumable&part=snippet,status`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(input.video.length) },
    body: JSON.stringify(meta),
    cache: 'no-store',
  });
  const session = start.headers.get('location');
  if (!start.ok || !session) {
    const text = await start.text();
    console.error('[social:youtube] upload start', start.status, text.slice(0, 300));
    throw new HttpError(502, 'provider_error', `YouTube said: ${readError(text) ?? `HTTP ${start.status}`}`);
  }
  const done = await fetch(session, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(input.video.length) }, body: new Uint8Array(input.video), cache: 'no-store' });
  const text = await done.text();
  if (!done.ok) {
    console.error('[social:youtube] upload', done.status, text.slice(0, 300));
    throw new HttpError(502, 'provider_error', `YouTube said: ${readError(text) ?? `HTTP ${done.status}`}`);
  }
  const id = (JSON.parse(text) as { id?: string }).id;
  if (!id) throw new HttpError(502, 'provider_error', 'YouTube accepted the video but sent no video id.');
  return id;
};

const readError = (text: string): string | null => {
  try {
    const e = (JSON.parse(text) as { error?: { message?: string; errors?: { reason?: string }[] } }).error;
    const reason = e?.errors?.[0]?.reason;
    return e?.message ? (reason && !e.message.includes(reason) ? `${e.message} (${reason})` : e.message) : null;
  } catch {
    return null;
  }
};

export type ShortState = { state: 'posted' | 'processing' | 'failed'; reason?: string };

/** Where a video is after upload: YouTube checks and transcodes it first. */
export const shortState = async (accessToken: string, videoId: string): Promise<ShortState> => {
  const res = await providerFetch('youtube', `${VIDEOS}?part=status&id=${encodeURIComponent(videoId)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const status = ((res.items as { status?: { uploadStatus?: string; failureReason?: string; rejectionReason?: string } }[] | undefined) ?? [])[0]?.status;
  if (!status) return { state: 'failed', reason: 'The video is gone from YouTube. It may have been deleted.' };
  if (status.uploadStatus === 'failed' || status.uploadStatus === 'rejected') return { state: 'failed', reason: status.failureReason ?? status.rejectionReason ?? status.uploadStatus };
  return { state: status.uploadStatus === 'processed' ? 'posted' : 'processing' };
};
