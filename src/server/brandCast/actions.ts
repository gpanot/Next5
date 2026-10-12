// server-only — never import from a 'use client' file.
// One cast member's action from the Brand page or the admin: "swap" (with the "New face" dialog's note and/or photo,
// sent as a multipart form), "retry", "intro", "edit" (name and age), "restore" (an archived face, in place of
// `replace` when the cast is full) or "delete" (an archived face), as JSON. Shared by the user and admin routes.

import { HttpError } from '../http';
import { readForm } from '../storage/images';
import { deleteParked, editMember, restoreMember } from './archive';
import { startRetry, startSwap, storeSwapPhoto } from './cast';
import { startIntro } from './intro';

const MAX_NOTE = 300;

type Parsed = { action: string; note?: string; file?: File; name?: string; age?: number; replace?: string };

const text = (v: unknown) => (typeof v === 'string' ? v : undefined);

const parse = async (req: Request): Promise<Parsed> => {
  if ((req.headers.get('content-type') ?? '').includes('multipart/form-data')) {
    const form = await readForm(req);
    const file = form.get('file');
    return { action: String(form.get('action') ?? 'swap'), note: String(form.get('note') ?? ''), ...(file instanceof File && file.size > 0 ? { file } : {}) };
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    action: text(body.action) ?? 'swap',
    note: text(body.note) ?? '',
    name: text(body.name),
    age: typeof body.age === 'number' ? body.age : undefined,
    replace: text(body.replace),
  };
};

const done = async () => undefined;

/** Starts the action and returns its background job (the photo or video is made after the response; none for the
 *  archive and edit actions, which are done when this returns). */
export const startCastAction = async (req: Request, workspaceId: string, memberId: string): Promise<() => Promise<void>> => {
  const { action, note, file, name, age, replace } = await parse(req);
  if (action === 'edit') return editMember(workspaceId, memberId, name ?? '', age ?? NaN).then(() => done);
  if (action === 'restore') return restoreMember(workspaceId, memberId, replace).then(() => done);
  if (action === 'delete') return deleteParked(workspaceId, memberId).then(() => done);
  if (action === 'intro') return startIntro(workspaceId, memberId);
  if (action === 'retry') return startRetry(workspaceId, memberId);
  if (action !== 'swap') throw new HttpError(400, 'bad_action', 'Unknown action.');
  const photoKey = file ? await storeSwapPhoto(workspaceId, memberId, file) : undefined;
  const cleanNote = note?.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE) || undefined;
  return startSwap(workspaceId, memberId, { note: cleanNote, photoKey });
};
