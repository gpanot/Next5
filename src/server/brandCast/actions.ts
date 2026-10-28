// server-only — never import from a 'use client' file.
// One cast member's action from the Brand page or the admin: "swap" (with the "New face" dialog's note and/or photo,
// sent as a multipart form), "retry", "intro", "edit" (name and age), "archive" (an active face), "restore" (an archived face, in place of
// `replace` when the cast is full) or "delete" (an archived face), as JSON. Shared by the user and admin routes.

import { HttpError } from '../http';
import { readForm } from '../storage/images';
import { archiveMember, deleteParked, editMember, restoreMember } from './archive';
import { startCast, startRetry, startSwap, storeSwapPhoto } from './cast';
import { CAST_SIZE } from '../../types/admin/brandCast';
import { requireIntroCredit, startIntro, startIntros, type IntroCharge } from './intro';

const MAX_NOTE = 300;
/** "Use your own prompt" in the "Create avatar" dialog starts from a whole written person, so it gets more room. */
const MAX_PROMPT = 600;

const cleanText = (v: string | undefined, max: number) => v?.replace(/\s+/g, ' ').trim().slice(0, max) || undefined;

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
 *  archive and edit actions, which are done when this returns). `charge`: who pays an intro (1 credit); null is free. */
export const startCastAction = async (req: Request, workspaceId: string, memberId: string, charge: IntroCharge | null = null): Promise<() => Promise<void>> => {
  const { action, note, file, name, age, replace } = await parse(req);
  if (action === 'edit') return editMember(workspaceId, memberId, name ?? '', age ?? NaN).then(() => done);
  if (action === 'restore') return restoreMember(workspaceId, memberId, replace).then(() => done);
  if (action === 'archive') return archiveMember(workspaceId, memberId).then(() => done);
  if (action === 'delete') return deleteParked(workspaceId, memberId).then(() => done);
  if (action === 'intro') return requireIntroCredit(charge).then(() => startIntro(workspaceId, memberId, charge));
  if (action === 'retry') return startRetry(workspaceId, memberId);
  if (action !== 'swap') throw new HttpError(400, 'bad_action', 'Unknown action.');
  const photoKey = file ? await storeSwapPhoto(workspaceId, memberId, file) : undefined;
  return startSwap(workspaceId, memberId, { note: cleanText(note, MAX_NOTE), photoKey });
};

/** One person from the "Create avatar" dialog, sent as a form: a note ("Use your own prompt") and/or a photo; neither
 *  is "Surprise me". */
const startCreate = async (req: Request, workspaceId: string): Promise<(() => Promise<void>) | null> => {
  const form = await readForm(req);
  const file = form.get('file');
  const photoKey = file instanceof File && file.size > 0 ? await storeSwapPhoto(workspaceId, 'new', file) : undefined;
  return startCast(workspaceId, undefined, 1, { note: cleanText(String(form.get('note') ?? ''), MAX_PROMPT), photoKey });
};

/**
 * The whole cast's POST, shared by the user and admin routes: {} makes the people of the empty slots ({ count: 1 }: one
 * of them); a multipart form makes one person from the "Create avatar" dialog (note and/or photo); { action: "intros",
 * ids } makes those people's intro videos as one click (1 credit in all, paid by `charge`; null is free). Returns the
 * background job, or null when nothing is to be made.
 */
export const startCastPost = async (req: Request, workspaceId: string, charge: IntroCharge | null = null): Promise<(() => Promise<void>) | null> => {
  if ((req.headers.get('content-type') ?? '').includes('multipart/form-data')) return startCreate(req, workspaceId);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.action === 'intros') {
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string').slice(0, CAST_SIZE) : [];
    return startIntros(workspaceId, ids, charge);
  }
  return startCast(workspaceId, undefined, body.count === 1 ? 1 : CAST_SIZE);
};
