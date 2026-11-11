// server-only — never import from a 'use client' file.
// Copy Viral Post, phase 1: get the reference reel, find its hard cuts, take one still per shot.
// Steps run in the background of the local dev server; the tab polls project.json.

import { createWriteStream, existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { ReadableStream as WebReadableStream } from 'stream/web';
import { tregCall } from '../admin/ugcLab';
import { DEFAULT_CUT_THRESHOLD, type CopyViralCutMode, type CopyViralProject, type CopyViralShot } from '../../types/admin/copyViral';
import { detectCuts, extractFrame, probeVideo } from './media';
import { cutsToShots, frameTimeMs, sentenceShots } from './shots';
import { loadTranscript, sentenceBreaks, shotTranscript } from './transcript';
import { getProject, projectFile, saveProject, updateProject } from './store';

const REFERENCE = 'reference.mp4';
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

type DownloadResult = { output?: { found?: boolean; data?: { videoUrl?: string } } };

/** The reel's CDN video URL via treg: anyapi TikTok $0.0012, anyapi Instagram $0.0015 (per success). */
const resolveVideoUrl = async (pageUrl: string): Promise<string> => {
  const host = new URL(pageUrl).hostname;
  const endpoint = host.includes('tiktok.com') ? 'anyapi.tiktok.video_download'
    : host.includes('instagram.com') ? 'anyapi.instagram.post.detail'
    : null;
  if (!endpoint) throw new Error('Paste a TikTok or Instagram reel link, or upload the video');
  const result = await tregCall<DownloadResult>(endpoint, { method: 'POST', body: { url: pageUrl }, timeoutMs: 45_000 });
  const videoUrl = result.output?.data?.videoUrl;
  if (!result.output?.found || !videoUrl) throw new Error('Could not get this reel (private, deleted or not a video). Upload the video instead.');
  return videoUrl;
};

const download = async (url: string, file: string, referer: string) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000), headers: { 'User-Agent': BROWSER_UA, Referer: referer } });
  if (!res.ok || !res.body) throw new Error(`Video download failed (HTTP ${res.status}). The link may have expired: try again.`);
  await pipeline(Readable.fromWeb(res.body as WebReadableStream<Uint8Array>), createWriteStream(file));
};

/** A still per shot that has none; named by its boundaries, so a moved boundary gets a new file (no stale cache). */
export const ensureFrames = async (id: string, shots: CopyViralShot[]): Promise<CopyViralShot[]> => {
  await mkdir(projectFile(id, 'frames'), { recursive: true });
  const reference = projectFile(id, REFERENCE);
  return Promise.all(shots.map(async (shot) => {
    if (shot.frame) return shot;
    const frame = `frames/shot-${shot.startMs}-${shot.endMs}.jpg`;
    await extractFrame(reference, frameTimeMs(shot), projectFile(id, frame));
    return { ...shot, frame };
  }));
};

const analyze = async (id: string) => {
  await updateProject(id, { status: 'ANALYZING', reference: REFERENCE });
  const reference = projectFile(id, REFERENCE);
  const project = await getProject(id);
  const probe = await probeVideo(reference);
  const cuts = await detectCuts(reference, project.cutThreshold ?? DEFAULT_CUT_THRESHOLD);
  await writeFile(projectFile(id, 'cuts.json'), JSON.stringify(cuts));
  // the transcript (whisper, ~$0.006/min) is needed for sentence cuts, and shows each shot's words in the cut editor
  const transcript = probe.hasAudio ? await loadTranscript(id, REFERENCE) : { text: '', words: [] };
  const raw = project.cutMode === 'pictures' ? cutsToShots(cuts, probe.durationMs) : sentenceShots(cuts, sentenceBreaks(transcript), probe.durationMs);
  const shots = await ensureFrames(id, raw.map((s) => ({ ...s, transcript: shotTranscript(transcript.words, s) })));
  const { durationMs, width, height, fps } = probe;
  await updateProject(id, { status: 'READY', durationMs, width, height, fps, shots });
};

const fail = (id: string) => async (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[copy-viral] ${id} failed:`, message);
  await updateProject(id, { status: 'FAILED', error: message }).catch(() => undefined);
};

/** Download the reel at `project.referenceUrl`, then analyze it. Runs in the background. */
export const startFromUrl = (project: CopyViralProject) => {
  void (async () => {
    const pageUrl = project.referenceUrl ?? '';
    await download(await resolveVideoUrl(pageUrl), projectFile(project.id, REFERENCE), new URL(pageUrl).origin + '/');
    await analyze(project.id);
  })().catch(fail(project.id));
};

/** Save an uploaded reference video from the request body, then analyze it in the background. */
export const startFromUpload = async (project: CopyViralProject, body: ReadableStream<Uint8Array>): Promise<CopyViralProject> => {
  try {
    await pipeline(Readable.fromWeb(body as WebReadableStream<Uint8Array>), createWriteStream(projectFile(project.id, REFERENCE)));
  } catch (err) {
    await fail(project.id)(err);
    throw err;
  }
  const analyzing = await updateProject(project.id, { status: 'ANALYZING', reference: REFERENCE });
  void analyze(project.id).catch(fail(project.id));
  return analyzing;
};

/** Analyze again from the saved reference, with another cut sensitivity or cut mode (resets the shot edits). */
export const reanalyze = async (id: string, cutThreshold: number, cutMode: CopyViralCutMode) => {
  const project = await getProject(id);
  await saveProject({ ...project, status: 'ANALYZING', error: null, cutThreshold, cutMode });
  void analyze(id).catch(fail(id));
};

export const referenceExists = (id: string) => existsSync(projectFile(id, REFERENCE));
