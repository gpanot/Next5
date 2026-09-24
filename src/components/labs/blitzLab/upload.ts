'use client';

/**
 * Blitz Lab uploads.
 *
 * Fast path: ask the server for a presigned PUT URL, then send the file straight
 * from the browser to R2 (one hop, no server body limit).
 * Fallback: when the direct PUT fails at the network level (usually a missing
 * CORS rule on the bucket), send the file through the lab's own /blitz/upload route.
 * Both paths end by registering the file as a BlitzAsset so it is reusable.
 */

import { blitzApi, type BlitzAssetDto, type LabClient } from './api';

export type BlitzUploadType = 'BACKGROUND' | 'OVERLAY' | 'AUDIO';

type Progress = (fraction: number) => void;

class NetworkError extends Error {}

/** XHR instead of fetch: fetch has no upload progress events. */
const sendWithProgress = (
  method: 'PUT' | 'POST',
  url: string,
  body: Blob | FormData,
  headers: Record<string, string>,
  onProgress: Progress,
): Promise<{ status: number; text: string }> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => reject(new NetworkError('Network error'));
    xhr.send(body);
  });

const parseError = (text: string, fallback: string): string => {
  try {
    const data = JSON.parse(text) as { error?: string; message?: string };
    return data.message ?? data.error ?? fallback;
  } catch {
    return fallback;
  }
};

const uploadDirect = async (client: LabClient, type: BlitzUploadType, file: File, onProgress: Progress) => {
  const res = await blitzApi.getUploadUrl(client, type, file.name);
  if (!res.ok) throw new Error(res.data.error ?? 'Could not start upload');
  const { uploadUrl, r2Key, contentType } = res.data;
  const put = await sendWithProgress('PUT', uploadUrl, file, { 'Content-Type': contentType }, onProgress);
  if (put.status < 200 || put.status >= 300) throw new NetworkError(`R2 PUT failed (${put.status})`);
  return r2Key;
};

const uploadViaServer = async (client: LabClient, type: BlitzUploadType, file: File, onProgress: Progress) => {
  const form = new FormData();
  form.append('file', file);
  form.append('type', type);
  const res = await sendWithProgress('POST', client.url('/blitz/upload'), form, client.authHeaders(), onProgress);
  if (res.status === 413) throw new Error('File too large for the fallback upload. Add the R2 CORS rule to enable direct uploads.');
  if (res.status < 200 || res.status >= 300) throw new Error(parseError(res.text, `Upload failed (${res.status})`));
  return (JSON.parse(res.text) as { r2Key: string }).r2Key;
};

/** Uploads a file and registers it. Resolves with the saved asset. */
export const uploadBlitzAsset = async (
  client: LabClient,
  type: BlitzUploadType,
  file: File,
  onProgress: Progress,
): Promise<BlitzAssetDto> => {
  let r2Key: string;
  try {
    r2Key = await uploadDirect(client, type, file, onProgress);
  } catch (err) {
    if (!(err instanceof NetworkError)) throw err;
    console.warn('[blitz] Direct R2 upload failed, using server fallback:', err.message);
    onProgress(0);
    r2Key = await uploadViaServer(client, type, file, onProgress);
  }
  const res = await blitzApi.registerAsset(client, { type, r2Key, name: file.name });
  if (!res.ok || !res.data.asset) throw new Error(res.data.error ?? 'Could not save the upload');
  return res.data.asset;
};

/** Upload formats the server accepts, per layer. */
export const BLITZ_ACCEPT: Record<BlitzUploadType, string> = {
  OVERLAY: 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov',
  BACKGROUND: 'video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp,image/gif,.mp4,.webm,.mov,.jpg,.jpeg,.png,.webp,.gif',
  AUDIO: 'audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/ogg,.mp3,.m4a,.aac,.wav,.ogg',
};

/** Media kind of a picked file, from its MIME type. */
export const fileMediaKind = (file: File): 'image' | 'video' | 'audio' =>
  file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'video';
