import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { proposePlan } from '../../../src/server/automation/matching';
import {
  archiveTemplate,
  cloneAsOverride,
  createTemplate,
  duplicateTemplate,
  parseTemplateInput,
  updateTemplate,
} from '../../../src/server/templates/crud';
import { getTemplateBySlug, listTemplates } from '../../../src/server/templates/repository';
import { createTestWorkspace, ensureContentTemplates, resetBusinessTables } from '../../helpers/db';

beforeEach(async () => {
  await resetBusinessTables();
  await ensureContentTemplates();
});
afterAll(() => prisma.$disconnect());

const input = (slug: string) => ({
  slug,
  name: 'Test template',
  pillarSlug: 'education-authority',
  formatSlug: 'pro-tips-list',
  audience: 'both' as const,
  platforms: ['tiktok'],
  purposes: ['awareness' as const],
  primaryPurpose: 'awareness' as const,
  status: 'active' as const,
  version: {
    hookPattern: 'A hook about [THING]',
    beats: [{ label: 'Hook', guidance: 'Say the thing' }],
    suggestedSlides: [{ text: 'Slide', bgPrompt: 'A photo, 9:16 vertical, no text' }],
    keywords: ['test'],
    variables: [{ key: 'THING', label: 'Thing', type: 'text' as const, source: 'brand' as const, required: true, position: 0 }],
    assetRequirements: [{ kind: 'person_on_camera' as const, required: true, minCount: 1, fulfilment: 'generate' as const }],
  },
});

describe('template CRUD', () => {
  it('creates a template with its first version', async () => {
    const created = await createTemplate(prisma, input('test-create'));
    expect(created.version).toBe(1);
    expect(created.variables.map((v) => v.key)).toEqual(['THING']);
    expect(created.assetRequirements[0]!.label).toBe('1 person on camera');
  });

  it('rejects a payload with an unknown purpose before it reaches the database', () => {
    expect(() => parseTemplateInput({ ...input('x'), primaryPurpose: 'interest' })).toThrowError(/primaryPurpose/);
  });

  it('writes a new version rather than editing an active one in place', async () => {
    const created = await createTemplate(prisma, input('test-version'));
    const patched = await updateTemplate(prisma, created.id, {
      version: { ...input('test-version').version, hookPattern: 'A different hook' },
    });

    expect(patched.version).toBe(2);
    expect(patched.hookPattern).toBe('A different hook');

    // The v1 row is untouched, so anything that locked to it still reads the same content.
    const v1 = await prisma.contentTemplateVersion.findFirst({ where: { templateId: created.id, version: 1 } });
    expect(v1?.hookPattern).toBe('A hook about [THING]');
  });

  it('leaves an already-generated plan reporting the version it was generated from', async () => {
    const ws = await createTestWorkspace('brand');
    await prisma.workspace.update({ where: { id: ws.id }, data: { audienceType: 'b2c' } });

    const plan = await proposePlan({ workspaceId: ws.id, goal: 'leads', channels: ['tiktok'], startDate: '2026-10-05' });
    const slot = plan[0]!;
    await updateTemplate(prisma, slot.templateId, {
      version: { ...input('ignored').version, hookPattern: 'Rewritten after the plan was made' },
    });

    const lockedVersion = await prisma.contentTemplateVersion.findUnique({ where: { id: slot.versionId } });
    expect(lockedVersion?.version).toBe(slot.version);
    expect(lockedVersion?.hookPattern).not.toBe('Rewritten after the plan was made');
  });

  it('metadata edits update in place — they cannot change what a plan renders', async () => {
    const created = await createTemplate(prisma, input('test-metadata'));
    const patched = await updateTemplate(prisma, created.id, { name: 'Renamed', status: 'draft' });
    expect(patched.version).toBe(1);
    expect(patched.name).toBe('Renamed');
    expect(patched.status).toBe('draft');
  });

  it('duplicates a template as a new draft', async () => {
    const source = await getTemplateBySlug('n-red-flags');
    const copy = await duplicateTemplate(prisma, source!.id, 'n-red-flags-copy');
    expect(copy.status).toBe('draft');
    expect(copy.variables).toHaveLength(source!.variables.length);
    expect(copy.assetRequirements).toHaveLength(source!.assetRequirements.length);
  });

  it('clones a global template into a workspace override, once', async () => {
    const ws = await createTestWorkspace('brand');
    const source = await getTemplateBySlug('n-red-flags');

    const override = await cloneAsOverride(prisma, source!.id, ws.id);
    expect(override.workspaceId).toBe(ws.id);
    expect(override.parentTemplateId).toBe(source!.id);
    expect(override.status).toBe('active');

    await expect(cloneAsOverride(prisma, source!.id, ws.id)).rejects.toThrowError(/already overrides/);
  });

  it('hides the parent from the workspace that overrides it, but not from anyone else', async () => {
    const ws = await createTestWorkspace('brand');
    const other = await createTestWorkspace('brand');
    const source = await getTemplateBySlug('n-red-flags');
    await cloneAsOverride(prisma, source!.id, ws.id);

    const forWs = await listTemplates({ workspaceId: ws.id });
    expect(forWs.some((t) => t.id === source!.id)).toBe(false);
    expect(forWs.some((t) => t.parentTemplateId === source!.id)).toBe(true);

    const forOther = await listTemplates({ workspaceId: other.id });
    expect(forOther.some((t) => t.id === source!.id)).toBe(true);
  });

  it('archives rather than deletes, and archived templates leave the matcher', async () => {
    const created = await createTemplate(prisma, input('test-archive'));
    const archived = await archiveTemplate(prisma, created.id);
    expect(archived.status).toBe('archived');

    const active = await listTemplates({ status: 'active' });
    expect(active.some((t) => t.id === created.id)).toBe(false);
    expect(await prisma.contentTemplate.count({ where: { id: created.id } })).toBe(1);
  });
});
