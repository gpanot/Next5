// server-only. Saved Script Generator work: one row per generated video script or carousel, autosaved after every change.
import { randomUUID } from 'crypto';
import type { Prisma, ScriptGeneratorDraft } from '@prisma/client';
import { prisma } from '../../lib/db';
import { deleteFromR2, getPresignedUrl, uploadToR2 } from '../../lib/r2';
import type { CarouselInput, GeneratedCarousel } from '../../types/admin/carousel';
import { isCarouselTemplate } from '../../types/admin/carouselTemplates';
import { isPhotoSlot, PHOTO_TYPES, type DraftChatEntry, type DraftSummary, type ScriptDraft } from '../../types/admin/scriptDrafts';
import { isScriptModel, type GeneratedScript, type GenerateScriptInput } from '../../types/admin/scriptGenerator';
import { HttpError } from '../http';
import { normalizeCarousel, parseCarouselInput } from './carouselService';
import { parseGenerateInput } from './service';

const notFound = () => new HttpError(404, 'not_found', 'This saved script no longer exists.');
const bad = (message: string) => new HttpError(400, 'bad_request', message);

type Photos = Record<string, string>;
type Raw = Record<string, unknown>;
const photosOf = (row: ScriptGeneratorDraft): Photos => (row.photos && typeof row.photos === 'object' ? (row.photos as Photos) : {});
const isCarouselRow = (row: Pick<ScriptGeneratorDraft, 'format'>) => row.format === 'carousel';

const toSummary = (row: ScriptGeneratorDraft): DraftSummary => ({
  id: row.id,
  kind: isCarouselRow(row) ? 'carousel' : 'video',
  title: row.title,
  format: row.format,
  structure: row.structure,
  photoCount: Object.keys(photosOf(row)).length,
  updatedAt: row.updatedAt.toISOString(),
});

/** Carousels saved before 2026-10-24 used the video shape (beats, wizard answers). Read them as a carousel. */
function legacyCarousel(row: ScriptGeneratorDraft): { input: CarouselInput; script: GeneratedCarousel } {
  const old = (row.input ?? {}) as Raw;
  const template = isCarouselTemplate(row.structure) ? row.structure : 'story_6';
  const input: CarouselInput = { template, answers: { field: String(old.credibility ?? ''), audience: String(old.audience ?? ''), topic: String(old.message ?? '') } };
  const s = (row.script ?? {}) as Raw;
  const beats = Array.isArray(s.beats) ? (s.beats as Raw[]) : [];
  const slides = beats.map((b) => ({ label: String(b.label ?? ''), text: String(b.onScreen ?? ''), photo: String(b.broll ?? ''), bottomText: String(b.bottomOnScreen ?? ''), bottomPhoto: String(b.bottomBroll ?? '') }));
  return { input, script: { title: String(s.title ?? row.title), template, slides, song: String(s.music ?? ''), caption: String(s.cta ?? ''), bioCta: '' } };
}

async function toDraft(row: ScriptGeneratorDraft): Promise<ScriptDraft> {
  const signed = await Promise.all(Object.entries(photosOf(row)).map(async ([slot, key]) => [slot, await getPresignedUrl(key)] as const));
  const base = {
    ...toSummary(row),
    model: isScriptModel(row.model) ? row.model : 'gpt-6.1-sol',
    chat: Array.isArray(row.chat) ? (row.chat as DraftChatEntry[]) : [],
    photoUrls: Object.fromEntries(signed.filter((e): e is readonly [string, string] => !!e[1])),
  } as const;
  if (!isCarouselRow(row)) return { ...base, kind: 'video', input: row.input as GenerateScriptInput, script: row.script as GeneratedScript };
  const saved = Array.isArray((row.script as Raw | null)?.slides)
    ? { input: row.input as CarouselInput, script: row.script as GeneratedCarousel }
    : legacyCarousel(row);
  return { ...base, kind: 'carousel', ...saved };
}

/** The script as sent by the browser: it came from our own generate or refine call, so only the shape is checked. */
function parseScript(value: unknown): GeneratedScript {
  const s = value as Partial<GeneratedScript> | null;
  if (!s || typeof s.title !== 'string' || typeof s.format !== 'string' || !Array.isArray(s.beats)) throw bad('Script is missing.');
  return s as GeneratedScript;
}

function parseChat(value: unknown): DraftChatEntry[] {
  if (!Array.isArray(value)) throw bad('Chat must be a list.');
  return value.slice(-100).map((e) => {
    const c = (e ?? {}) as Raw;
    return { you: String(c.you ?? '').slice(0, 500), reply: String(c.reply ?? '').slice(0, 500), refused: c.refused === true };
  });
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

/** The row fields of a body's work: a video script with its wizard answers, or a carousel with its answers. */
function parseWork(body: Raw): { format: string; structure: string; title: string; input: Prisma.InputJsonValue; script: Prisma.InputJsonValue } {
  if (body.kind === 'carousel') {
    const input = parseCarouselInput((body.input ?? {}) as Raw);
    const carousel = normalizeCarousel(body.script, input, false);
    return { format: 'carousel', structure: input.template, title: carousel.title.slice(0, 200), input: json(input), script: json(carousel) };
  }
  const input = parseGenerateInput((body.input ?? {}) as Raw);
  const script = parseScript(body.script);
  return { format: script.format, structure: String(script.structure), title: script.title.slice(0, 200) || 'Untitled', input: json(input), script: json(script) };
}

export async function listDrafts(): Promise<DraftSummary[]> {
  const rows = await prisma.scriptGeneratorDraft.findMany({ orderBy: { updatedAt: 'desc' }, take: 100 });
  return rows.map(toSummary);
}

export async function getDraft(id: string): Promise<ScriptDraft> {
  const row = await prisma.scriptGeneratorDraft.findUnique({ where: { id } });
  if (!row) throw notFound();
  return toDraft(row);
}

/** body: { kind: 'video' | 'carousel', input, script, model }. */
export async function createDraft(body: Raw): Promise<ScriptDraft> {
  const model = isScriptModel(body.model) ? body.model : 'gpt-6.1-sol';
  const row = await prisma.scriptGeneratorDraft.create({ data: { ...parseWork(body), model } });
  return toDraft(row);
}

/** Saves the edited work ({ kind, input, script }) and its chat. Photos are saved on their own (setPhoto), so the two never overwrite each other. */
export async function saveDraft(id: string, body: Raw): Promise<DraftSummary> {
  const data: Prisma.ScriptGeneratorDraftUpdateInput = {};
  if (body.script !== undefined) {
    const work = parseWork(body);
    data.script = work.script;
    data.input = work.input;
    data.title = work.title;
  }
  if (body.chat !== undefined) data.chat = json(parseChat(body.chat));
  if (isScriptModel(body.model)) data.model = body.model;
  const row = await prisma.scriptGeneratorDraft.update({ where: { id }, data }).catch(() => null);
  if (!row) throw notFound();
  return toSummary(row);
}

/** Max photo size. The browser shrinks photos to 1440 px before sending, so real ones are far smaller. */
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/** Stores one slide photo in R2 and records it on the slot (replacing the old one). */
export async function uploadPhoto(id: string, slot: string, file: File): Promise<void> {
  if (!isPhotoSlot(slot)) throw bad('Unknown slide.');
  const ext = PHOTO_TYPES[file.type];
  if (!ext) throw bad('Use a JPG, PNG, WebP or GIF photo.');
  if (file.size > MAX_PHOTO_BYTES) throw bad('Photo is too large (4 MB max).');
  if (!(await prisma.scriptGeneratorDraft.findUnique({ where: { id }, select: { id: true } }))) throw notFound();
  const r2Key = `admin/script-generator/${id}/${slot}-${randomUUID()}.${ext}`;
  if (!(await uploadToR2(r2Key, Buffer.from(await file.arrayBuffer()), file.type))) throw new HttpError(503, 'r2_unavailable', 'Photo storage is not configured.');
  await setPhoto(id, slot, r2Key);
}

/** Records (or with a null key, clears) the photo of one slot. Locks the row so two uploads at once both stay. */
export async function setPhoto(id: string, slot: string, r2Key: string | null): Promise<void> {
  if (!isPhotoSlot(slot)) throw bad('Unknown slide.');
  const old = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ photos: Photos }[]>`SELECT photos FROM script_generator_drafts WHERE id = ${id} FOR UPDATE`;
    if (!locked[0]) throw notFound();
    const photos = { ...locked[0].photos };
    const previous = photos[slot];
    if (r2Key) photos[slot] = r2Key;
    else delete photos[slot];
    await tx.scriptGeneratorDraft.update({ where: { id }, data: { photos } });
    return previous;
  });
  if (old && old !== r2Key) await deleteFromR2(old).catch(() => undefined);
}

export async function deleteDraft(id: string): Promise<void> {
  const row = await prisma.scriptGeneratorDraft.delete({ where: { id } }).catch(() => null);
  if (!row) throw notFound();
  await Promise.all(Object.values(photosOf(row)).map((key) => deleteFromR2(key).catch(() => undefined)));
}
