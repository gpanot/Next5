/**
 * Writes to the template library — the internal admin tool's half of Phase 0B.
 *
 * The rule that shapes everything here: editing the content of an **active** template never
 * mutates it. A new version is written and the template points at it, so a plan generated last
 * week still reports exactly what it was generated from.
 *
 * Self-serve editing for business users is a later extension. Nothing here assumes the writer
 * is Next5 staff — that check lives in the route, not in this module.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { HttpError } from '../http';
import { toTemplateDto, type TemplateDto, type TemplateRow } from './dto';

type Db = PrismaClient | Prisma.TransactionClient;

const WITH_VERSION = {
  pillar: { select: { slug: true, name: true } },
  activeVersion: { include: { variables: true, assetRequirements: true } },
} satisfies Prisma.ContentTemplateInclude;

const PURPOSES = ['awareness', 'trust', 'enquiry', 'conversion', 'engagement', 'retention'] as const;
const AUDIENCES = ['b2c', 'b2b', 'both'] as const;
const STATUSES = ['draft', 'active', 'archived'] as const;
const PLATFORMS = ['tiktok', 'instagram'] as const;

type Purpose = (typeof PURPOSES)[number];

export type VersionInput = {
  hookPattern: string;
  beats: { label: string; guidance: string; bgPrompt?: string }[];
  suggestedSlides: { text: string; bgPrompt: string }[];
  keywords: string[];
  variables: Prisma.TemplateVariableCreateManyVersionInput[];
  assetRequirements: Prisma.TemplateAssetRequirementCreateManyVersionInput[];
};

export type TemplateInput = {
  slug: string;
  name: string;
  pillarSlug: string;
  formatSlug: string;
  audience: (typeof AUDIENCES)[number];
  platforms: string[];
  purposes: Purpose[];
  primaryPurpose: Purpose;
  status: (typeof STATUSES)[number];
  version: VersionInput;
};

const str = (body: Record<string, unknown>, key: string, required = true): string => {
  const value = body[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (!required) return '';
  throw new HttpError(400, 'invalid_field', `${key} is required.`);
};

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], key: string): T => {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T;
  throw new HttpError(400, 'invalid_field', `${key} must be one of: ${allowed.join(', ')}.`);
};

const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Validates an admin payload. Throws HttpError(400) rather than letting Prisma reject it later. */
export const parseTemplateInput = (body: Record<string, unknown>): TemplateInput => {
  const purposes = list<unknown>(body.purposes).map((p) => oneOf(p, PURPOSES, 'purposes'));
  const primaryPurpose = oneOf(body.primaryPurpose, PURPOSES, 'primaryPurpose');
  const platforms = list<unknown>(body.platforms).map((p) => oneOf(p, PLATFORMS, 'platforms'));
  const version = (body.version ?? {}) as Record<string, unknown>;

  return {
    slug: str(body, 'slug'),
    name: str(body, 'name'),
    pillarSlug: str(body, 'pillarSlug'),
    formatSlug: str(body, 'formatSlug'),
    audience: oneOf(body.audience ?? 'both', AUDIENCES, 'audience'),
    platforms: platforms.length > 0 ? platforms : ['tiktok', 'instagram'],
    purposes: purposes.includes(primaryPurpose) ? purposes : [primaryPurpose, ...purposes],
    primaryPurpose,
    status: oneOf(body.status ?? 'draft', STATUSES, 'status'),
    version: {
      hookPattern: str(version, 'hookPattern', false),
      beats: list(version.beats),
      suggestedSlides: list(version.suggestedSlides),
      keywords: list<string>(version.keywords).filter((k) => typeof k === 'string'),
      variables: list(version.variables),
      assetRequirements: list(version.assetRequirements),
    },
  };
};

const loadDto = async (db: Db, id: string): Promise<TemplateDto> => {
  const row = await db.contentTemplate.findUnique({ where: { id }, include: WITH_VERSION });
  if (!row) throw new HttpError(404, 'not_found', 'Template not found.');
  if (!row.activeVersion) throw new HttpError(409, 'no_active_version', 'Template has no active version.');
  return toTemplateDto(row as TemplateRow);
};

const versionData = (version: VersionInput) => ({
  hookPattern: version.hookPattern,
  beats: version.beats as unknown as Prisma.InputJsonValue,
  suggestedSlides: version.suggestedSlides as unknown as Prisma.InputJsonValue,
  keywords: version.keywords,
  variables: { createMany: { data: version.variables } },
  assetRequirements: { createMany: { data: version.assetRequirements } },
});

const requirePillar = async (db: Db, slug: string): Promise<string> => {
  const pillar = await db.contentPillar.findUnique({ where: { slug }, select: { id: true } });
  if (!pillar) throw new HttpError(400, 'unknown_pillar', `No pillar with slug ${slug}.`);
  return pillar.id;
};

export const createTemplate = async (db: Db, input: TemplateInput): Promise<TemplateDto> => {
  const pillarId = await requirePillar(db, input.pillarSlug);
  const created = await db.contentTemplate.create({
    data: {
      slug: input.slug,
      name: input.name,
      pillarId,
      formatSlug: input.formatSlug,
      audience: input.audience,
      platforms: input.platforms,
      purposes: input.purposes,
      primaryPurpose: input.primaryPurpose,
      status: input.status,
      versions: { create: { version: 1, ...versionData(input.version) } },
    },
    include: { versions: { select: { id: true } } },
  });
  await db.contentTemplate.update({
    where: { id: created.id },
    data: { activeVersionId: created.versions[0]!.id },
  });
  return loadDto(db, created.id);
};

/**
 * Edits a template. Content changes on an `active` template write a new version; metadata
 * (name, audience, platforms, purposes, status) always updates in place, because none of it
 * changes what an already-generated plan would render.
 */
export const updateTemplate = async (
  db: Db,
  id: string,
  patch: Partial<TemplateInput>,
): Promise<TemplateDto> => {
  const existing = await db.contentTemplate.findUnique({
    where: { id },
    select: { id: true, status: true, activeVersionId: true },
  });
  if (!existing) throw new HttpError(404, 'not_found', 'Template not found.');

  const data: Prisma.ContentTemplateUpdateInput = {};
  if (patch.name) data.name = patch.name;
  if (patch.formatSlug) data.formatSlug = patch.formatSlug;
  if (patch.audience) data.audience = patch.audience;
  if (patch.platforms) data.platforms = patch.platforms;
  if (patch.purposes) data.purposes = patch.purposes;
  if (patch.primaryPurpose) data.primaryPurpose = patch.primaryPurpose;
  if (patch.status) data.status = patch.status;
  if (patch.pillarSlug) data.pillar = { connect: { id: await requirePillar(db, patch.pillarSlug) } };

  if (patch.version) {
    const next = await nextVersionNumber(db, id);
    const version = await db.contentTemplateVersion.create({
      data: { templateId: id, version: next, ...versionData(patch.version) },
      select: { id: true },
    });
    data.activeVersion = { connect: { id: version.id } };
  }

  await db.contentTemplate.update({ where: { id }, data });
  return loadDto(db, id);
};

const nextVersionNumber = async (db: Db, templateId: string): Promise<number> => {
  const latest = await db.contentTemplateVersion.findFirst({
    where: { templateId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  return (latest?.version ?? 0) + 1;
};

/** Copies a template's active version into a brand-new template. */
const copyTo = async (
  db: Db,
  source: TemplateDto,
  fields: { slug: string; name: string; workspaceId?: string; parentTemplateId?: string; status?: TemplateInput['status'] },
): Promise<TemplateDto> => {
  const pillarId = await requirePillar(db, source.pillarSlug);
  const created = await db.contentTemplate.create({
    data: {
      slug: fields.slug,
      name: fields.name,
      pillarId,
      formatSlug: source.formatSlug,
      audience: source.audience,
      platforms: source.platforms,
      purposes: source.purposes,
      primaryPurpose: source.primaryPurpose,
      status: fields.status ?? 'draft',
      workspaceId: fields.workspaceId ?? null,
      parentTemplateId: fields.parentTemplateId ?? null,
      versions: {
        create: {
          version: 1,
          hookPattern: source.hookPattern,
          beats: source.beats as unknown as Prisma.InputJsonValue,
          suggestedSlides: source.suggestedSlides as unknown as Prisma.InputJsonValue,
          keywords: source.keywords,
          variables: { createMany: { data: source.variables.map((v, position) => ({ ...v, position })) } },
          assetRequirements: {
            createMany: {
              data: source.assetRequirements.map(({ kind, required, minCount, fulfilment, notes }) => ({
                kind, required, minCount, fulfilment, notes,
              })),
            },
          },
        },
      },
    },
    include: { versions: { select: { id: true } } },
  });
  await db.contentTemplate.update({
    where: { id: created.id },
    data: { activeVersionId: created.versions[0]!.id },
  });
  return loadDto(db, created.id);
};

export const duplicateTemplate = async (db: Db, id: string, slug: string, name?: string): Promise<TemplateDto> => {
  const source = await loadDto(db, id);
  return copyTo(db, source, { slug, name: name ?? `${source.name} (copy)` });
};

/**
 * Clones a global template into a workspace-specific override. The override replaces its parent
 * for that workspace — the matcher never proposes both.
 */
export const cloneAsOverride = async (db: Db, id: string, workspaceId: string): Promise<TemplateDto> => {
  const source = await loadDto(db, id);
  if (source.workspaceId) throw new HttpError(400, 'already_override', 'That template is already an override.');

  const existing = await db.contentTemplate.findFirst({
    where: { workspaceId, parentTemplateId: id },
    select: { id: true },
  });
  if (existing) throw new HttpError(409, 'override_exists', 'This workspace already overrides that template.');

  return copyTo(db, source, {
    slug: `${source.slug}--${workspaceId}`,
    name: source.name,
    workspaceId,
    parentTemplateId: id,
    status: 'active',
  });
};

export const archiveTemplate = async (db: Db, id: string): Promise<TemplateDto> => {
  await db.contentTemplate.update({ where: { id }, data: { status: 'archived' } });
  return loadDto(db, id);
};
