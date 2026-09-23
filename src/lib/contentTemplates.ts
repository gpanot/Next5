/**
 * Pure helpers over the content-template library. No database, no React — safe on both sides,
 * so the server matcher and the admin widgets score a hook the same way.
 */
import type { AssetFulfilment } from '@prisma/client';
import type { AssetRequirementDto, TemplateDto } from '../server/templates/dto';

export type { AssetRequirementDto, TemplateDto };

/** The template whose hook keywords best fit this video's hook. */
export const matchTemplateByHook = (hook: string, templates: readonly TemplateDto[]): TemplateDto | null => {
  if (templates.length === 0) return null;
  const lower = hook.toLowerCase();
  const fallback = templates.find((t) => t.slug === 'n-tips-from-a-pro') ?? templates[0]!;

  let best = fallback;
  let bestScore = 0;
  for (const template of templates) {
    const score = template.keywords.reduce((sum, k) => sum + (lower.includes(k) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = template;
    }
  }
  return best;
};

/** A classifier's own answer wins; otherwise fall back to keyword matching on the hook. */
export const resolveTemplate = (
  legacyId: number | null | undefined,
  hook: string,
  templates: readonly TemplateDto[],
): TemplateDto | null => {
  const classified = typeof legacyId === 'number' ? templates.find((t) => t.legacyId === legacyId) : undefined;
  return classified ?? matchTemplateByHook(hook, templates);
};

/** How the asset gets made, in the words a reader needs: what they must supply vs. what we produce. */
export const FULFILMENT_LABELS: Record<AssetFulfilment, string> = {
  upload: 'you supply',
  library: 'from library',
  generate: 'we generate',
};

/** "Needs: 1 person on camera · 2 product footage" — never show a template name without it. */
export const requirementsSummary = (assetRequirements: readonly AssetRequirementDto[]): string => {
  const required = assetRequirements.filter((a) => a.required);
  if (required.length === 0) return 'No assets required';
  return `Needs: ${required.map((a) => a.label).join(' · ')}`;
};

/** The optional extras, for the second line of a requirements block. */
export const optionalRequirements = (assetRequirements: readonly AssetRequirementDto[]): AssetRequirementDto[] =>
  assetRequirements.filter((a) => !a.required);
