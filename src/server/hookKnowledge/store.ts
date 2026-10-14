// server-only — never import from a 'use client' file.
// Hook Knowledge: notes and files admins keep on what makes slideshow hooks work. The campaign hook writer reads them.

import type { HookKnowledge } from '@prisma/client';
import { prisma } from '../../lib/db';
import { MAX_KNOWLEDGE_BODY_CHARS, MAX_KNOWLEDGE_TITLE_CHARS, type HookKnowledgeDto, type HookKnowledgeInput } from '../../types/admin/hookKnowledge';
import { HttpError } from '../http';

/** How much knowledge goes into one prompt: newest entries first, cut at this size. */
const PROMPT_BUDGET_CHARS = 40_000;

const toDto = (k: HookKnowledge): HookKnowledgeDto => ({ id: k.id, title: k.title, body: k.body, fileName: k.fileName, updatedAt: k.updatedAt.toISOString() });

/** A request body, cleaned; a 400 when the title or text is missing. */
export const parseKnowledge = (value: unknown): HookKnowledgeInput => {
  const r = (value ?? {}) as Record<string, unknown>;
  const title = typeof r.title === 'string' ? r.title.trim().slice(0, MAX_KNOWLEDGE_TITLE_CHARS) : '';
  const body = typeof r.body === 'string' ? r.body.trim().slice(0, MAX_KNOWLEDGE_BODY_CHARS) : '';
  if (!title) throw new HttpError(400, 'no_title', 'Give it a title.');
  if (!body) throw new HttpError(400, 'no_body', 'Add some text or a file.');
  return { title, body, fileName: typeof r.fileName === 'string' && r.fileName.trim() ? r.fileName.trim().slice(0, 200) : null };
};

export const listKnowledge = async (): Promise<HookKnowledgeDto[]> => (await prisma.hookKnowledge.findMany({ orderBy: { updatedAt: 'desc' } })).map(toDto);

export const createKnowledge = async (input: HookKnowledgeInput): Promise<HookKnowledgeDto> => toDto(await prisma.hookKnowledge.create({ data: input }));

export const updateKnowledge = async (id: string, input: HookKnowledgeInput): Promise<HookKnowledgeDto> => {
  const found = await prisma.hookKnowledge.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw new HttpError(404, 'not_found', 'This entry was deleted.');
  return toDto(await prisma.hookKnowledge.update({ where: { id }, data: input }));
};

export const deleteKnowledge = async (id: string): Promise<void> => {
  await prisma.hookKnowledge.deleteMany({ where: { id } });
};

/** Every entry as one text for a prompt, newest first, within the budget. Empty when there is none. */
export const knowledgeForPrompt = async (): Promise<string> => {
  let left = PROMPT_BUDGET_CHARS;
  const parts: string[] = [];
  for (const k of await prisma.hookKnowledge.findMany({ orderBy: { updatedAt: 'desc' } })) {
    if (left <= 200) break;
    const part = `## ${k.title}\n${k.body}`.slice(0, left);
    parts.push(part);
    left -= part.length;
  }
  return parts.join('\n\n');
};
