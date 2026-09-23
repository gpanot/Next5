import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_FULFILMENT } from '../../../src/config/contentTemplates';
import { resolveTemplate, requirementsSummary } from '../../../src/lib/contentTemplates';
import { prisma } from '../../../src/lib/db';
import { seedContentTemplates } from '../../../src/server/templates/seed';
import { getTemplateByLegacyId, listTemplates } from '../../../src/server/templates/repository';
import { ensureContentTemplates, resetBusinessTables } from '../../helpers/db';

beforeEach(async () => {
  await resetBusinessTables();
  await ensureContentTemplates();
});
afterAll(() => prisma.$disconnect());

describe('the seeded library', () => {
  it('holds the 6 pillars and 18 templates Phase 0A produced, all active', async () => {
    const templates = await listTemplates();
    expect(await prisma.contentPillar.count()).toBe(6);
    expect(templates).toHaveLength(18);
    expect(templates.every((t) => t.status === 'active')).toBe(true);
  });

  it('gives every template a version, variables and asset requirements', async () => {
    for (const template of await listTemplates()) {
      expect(template.version, template.slug).toBeGreaterThan(0);
      expect(template.variables.length, template.slug).toBeGreaterThan(0);
      expect(template.assetRequirements.length, template.slug).toBeGreaterThan(0);
      expect(template.suggestedSlides.length, template.slug).toBeGreaterThan(0);
      for (const slide of template.suggestedSlides) {
        expect(slide.text.trim()).not.toBe('');
        expect(slide.bgPrompt.trim()).not.toBe('');
      }
    }
  });

  it('states how every required asset gets satisfied, so nothing shows as a bare name', async () => {
    for (const template of await listTemplates()) {
      expect(requirementsSummary(template.assetRequirements)).toMatch(/^Needs: /);
      for (const asset of template.assetRequirements) {
        expect(asset.label, template.slug).not.toBe('');
        expect(asset.fulfilment, `${template.slug}/${asset.kind}`).toBe(DEFAULT_FULFILMENT[asset.kind]);
      }
    }
  });

  it('is idempotent — re-seeding does not duplicate or re-version anything', async () => {
    const before = await listTemplates();
    await seedContentTemplates(prisma);
    const after = await listTemplates();

    expect(after).toHaveLength(before.length);
    expect(after.map((t) => t.versionId)).toEqual(before.map((t) => t.versionId));
    expect(await prisma.contentTemplateVersion.count()).toBe(before.length);
  });

  it('covers every purpose a campaign rhythm can ask for', async () => {
    const templates = await listTemplates();
    for (const purpose of ['awareness', 'trust', 'enquiry', 'conversion', 'engagement'] as const) {
      const serving = templates.filter((t) => t.purposes.includes(purpose));
      expect(serving.length, purpose).toBeGreaterThan(0);
    }
  });
});

describe('resolveTemplate', () => {
  it('uses the id the research classifier chose, over anything the hook says', async () => {
    const templates = await listTemplates();
    // The hook screams "red flags" (template 1), but the classifier read the whole
    // transcript and said Day in the Life. The classifier wins.
    const resolved = resolveTemplate(17, '5 red flags your mechanic is scamming you', templates);
    expect(resolved?.legacyId).toBe(17);
    expect(resolved?.name).toBe('Day in the Life');
  });

  it('falls back to hook matching for results cached before classification existed', async () => {
    const templates = await listTemplates();
    expect(resolveTemplate(undefined, '5 red flags your mechanic is scamming you', templates)?.legacyId).toBe(1);
    expect(resolveTemplate(null, 'before and after transformation', templates)?.legacyId).toBe(18);
  });

  it('ignores an id no template has', async () => {
    const templates = await listTemplates();
    expect(resolveTemplate(999, 'day in the life of a plumber', templates)?.legacyId).toBe(17);
  });

  it('resolves the legacy number the Blitz slide route still passes', async () => {
    const template = await getTemplateByLegacyId(3);
    expect(template?.slug).toBe('n-tips-from-a-pro');
  });
});
