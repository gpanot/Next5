/**
 * Reads of the template library. The only place that knows how a template is stored, so the
 * matching engine, the admin tool and the Researcher all see the same shape.
 */
import type { ContentTemplateStatus, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/db';
import { toTemplateDto, type TemplateDto, type TemplateRow } from './dto';

type Db = Pick<PrismaClient, 'contentTemplate'>;

const WITH_VERSION = {
  pillar: { select: { slug: true, name: true } },
  activeVersion: { include: { variables: true, assetRequirements: true } },
} satisfies Prisma.ContentTemplateInclude;

const withVersion = (rows: TemplateRow[]): TemplateDto[] =>
  rows.filter((r) => r.activeVersion !== null).map(toTemplateDto);

/**
 * An override replaces the global template it was cloned from — it does not sit beside it.
 * Without this a workspace is offered both the original and its customised twin, and a week
 * of seven slots can spend two of them on the same idea.
 */
export const applyOverrides = (templates: readonly TemplateDto[]): TemplateDto[] => {
  const overridden = new Set(
    templates.filter((t) => t.workspaceId !== null && t.parentTemplateId !== null).map((t) => t.parentTemplateId!),
  );
  return templates.filter((t) => !(t.workspaceId === null && overridden.has(t.id)));
};

export type ListFilter = {
  /** Global templates always come back. Passing a workspace adds that workspace's overrides. */
  workspaceId?: string | null;
  status?: ContentTemplateStatus;
};

export const listTemplates = async (filter: ListFilter = {}, db: Db = prisma): Promise<TemplateDto[]> => {
  const rows = await db.contentTemplate.findMany({
    where: {
      status: filter.status,
      OR: [{ workspaceId: null }, ...(filter.workspaceId ? [{ workspaceId: filter.workspaceId }] : [])],
    },
    include: WITH_VERSION,
    orderBy: [{ legacyId: 'asc' }, { slug: 'asc' }],
  });
  return applyOverrides(withVersion(rows as TemplateRow[]));
};

export const getTemplateBySlug = async (slug: string, db: Db = prisma): Promise<TemplateDto | null> => {
  const row = await db.contentTemplate.findUnique({ where: { slug }, include: WITH_VERSION });
  return row?.activeVersion ? toTemplateDto(row as TemplateRow) : null;
};

export const getTemplateById = async (id: string, db: Db = prisma): Promise<TemplateDto | null> => {
  const row = await db.contentTemplate.findUnique({ where: { id }, include: WITH_VERSION });
  return row?.activeVersion ? toTemplateDto(row as TemplateRow) : null;
};

/**
 * Resolves the numeric Phase 0A id (1–18) that the Researcher and the Blitz slide route still
 * pass around. Global templates only — a workspace override never answers to a legacy id.
 */
export const getTemplateByLegacyId = async (legacyId: number, db: Db = prisma): Promise<TemplateDto | null> => {
  const row = await db.contentTemplate.findFirst({
    where: { legacyId, workspaceId: null },
    include: WITH_VERSION,
  });
  return row?.activeVersion ? toTemplateDto(row as TemplateRow) : null;
};

/**
 * Re-exported so server callers get the same scoring the admin widgets use.
 * The implementation is pure and lives in src/lib/contentTemplates.ts.
 */
export { matchTemplateByHook, resolveTemplate } from '../../lib/contentTemplates';
