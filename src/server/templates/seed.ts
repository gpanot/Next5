/**
 * Seeds (or re-seeds) the Phase 0A starter library.
 *
 * Idempotent and keyed on `slug`: running it twice leaves one row per template. It only ever
 * touches global templates (`workspaceId = null`) — a workspace override is never overwritten.
 * A template whose v1 already exists keeps it, so a re-run cannot orphan a plan that locked to it.
 */
import type { PrismaClient } from '@prisma/client';
import { readSeedPillars, readSeedTemplates, type SeedTemplate } from './seedData';

type Db = Pick<PrismaClient, 'contentPillar' | 'contentTemplate' | 'contentTemplateVersion'>;

const upsertVersion = async (db: Db, templateId: string, seed: SeedTemplate): Promise<string> => {
  const { version } = seed;
  const existing = await db.contentTemplateVersion.findUnique({
    where: { templateId_version: { templateId, version: version.version } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await db.contentTemplateVersion.create({
    data: {
      templateId,
      version: version.version,
      hookPattern: version.hookPattern,
      beats: version.beats,
      suggestedSlides: version.suggestedSlides,
      keywords: version.keywords,
      variables: { create: version.variables },
      assetRequirements: { create: version.assetRequirements },
    },
    select: { id: true },
  });
  return created.id;
};

export type SeedResult = { pillars: number; templates: number };

export const seedContentTemplates = async (db: Db): Promise<SeedResult> => {
  const pillarIds = new Map<string, string>();
  for (const pillar of readSeedPillars()) {
    const row = await db.contentPillar.upsert({
      where: { slug: pillar.slug },
      create: pillar,
      update: { name: pillar.name, description: pillar.description, position: pillar.position },
      select: { id: true },
    });
    pillarIds.set(pillar.slug, row.id);
  }

  const templates = readSeedTemplates();
  for (const seed of templates) {
    const pillarId = pillarIds.get(seed.pillarSlug);
    if (!pillarId) throw new Error(`Template ${seed.slug} references unknown pillar ${seed.pillarSlug}`);

    const fields = {
      legacyId: seed.legacyId,
      name: seed.name,
      pillarId,
      formatSlug: seed.formatSlug,
      audience: seed.audience,
      platforms: seed.platforms,
      purposes: seed.purposes,
      primaryPurpose: seed.primaryPurpose,
      status: seed.status,
    };
    const template = await db.contentTemplate.upsert({
      where: { slug: seed.slug },
      create: { slug: seed.slug, ...fields },
      update: fields,
      select: { id: true },
    });

    const versionId = await upsertVersion(db, template.id, seed);
    await db.contentTemplate.update({ where: { id: template.id }, data: { activeVersionId: versionId } });
  }

  return { pillars: pillarIds.size, templates: templates.length };
};
