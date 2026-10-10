// server-only — never import from a 'use client' file.
// One cast member's action from the Brand page or the admin: "swap" (with the "New face" dialog's note and/or photo,
// sent as a multipart form), "retry" or "intro" (JSON). Shared by the user and admin routes.

import { HttpError } from '../http';
import { readForm } from '../storage/images';
import { startRetry, startSwap, storeSwapPhoto } from './cast';
import { startIntro } from './intro';

const MAX_NOTE = 300;

type Parsed = { action: string; note?: string; file?: File };

const parse = async (req: Request): Promise<Parsed> => {
  if ((req.headers.get('content-type') ?? '').includes('multipart/form-data')) {
    const form = await readForm(req);
    const file = form.get('file');
    return { action: String(form.get('action') ?? 'swap'), note: String(form.get('note') ?? ''), ...(file instanceof File && file.size > 0 ? { file } : {}) };
  }
  const body = (await req.json().catch(() => ({}))) as { action?: unknown; note?: unknown };
  return { action: typeof body.action === 'string' ? body.action : 'swap', note: typeof body.note === 'string' ? body.note : '' };
};

/** Starts the action and returns its background job (the photo or video is made after the response). */
export const startCastAction = async (req: Request, workspaceId: string, memberId: string): Promise<() => Promise<void>> => {
  const { action, note, file } = await parse(req);
  if (action === 'intro') return startIntro(workspaceId, memberId);
  if (action === 'retry') return startRetry(workspaceId, memberId);
  if (action !== 'swap') throw new HttpError(400, 'bad_action', 'Unknown action.');
  const photoKey = file ? await storeSwapPhoto(workspaceId, memberId, file) : undefined;
  const cleanNote = note?.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE) || undefined;
  return startSwap(workspaceId, memberId, { note: cleanNote, photoKey });
};
