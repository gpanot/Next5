/**
 * Wire shapes for content templates. Everything the app reads about a template goes through
 * here, so a template always arrives with its requirements attached — never a bare name.
 */
import type {
  AssetFulfilment,
  AssetKind,
  AudienceType,
  ContentPurpose,
  ContentTemplate,
  ContentTemplateStatus,
  ContentTemplateVersion,
  TemplateAssetRequirement,
  TemplateVariable,
} from '@prisma/client';
import { assetRequirementLabel } from '../../config/contentTemplates';

export type BeatDto = { label: string; guidance: string; bgPrompt?: string };
export type SlideDto = { text: string; bgPrompt: string };

export type AssetRequirementDto = {
  kind: AssetKind;
  required: boolean;
  minCount: number;
  fulfilment: AssetFulfilment;
  notes: string | null;
  /** "1 person on camera" — ready to print in a requirements line. */
  label: string;
};

export type TemplateVariableDto = {
  key: string;
  label: string;
  type: TemplateVariable['type'];
  source: TemplateVariable['source'];
  required: boolean;
  defaultValue: string | null;
  hint: string | null;
};

export type TemplateDto = {
  id: string;
  slug: string;
  legacyId: number | null;
  name: string;
  pillarSlug: string;
  pillarName: string;
  formatSlug: string;
  audience: AudienceType;
  platforms: string[];
  purposes: ContentPurpose[];
  primaryPurpose: ContentPurpose;
  status: ContentTemplateStatus;
  workspaceId: string | null;
  parentTemplateId: string | null;
  versionId: string;
  version: number;
  hookPattern: string;
  beats: BeatDto[];
  suggestedSlides: SlideDto[];
  keywords: string[];
  variables: TemplateVariableDto[];
  assetRequirements: AssetRequirementDto[];
  /** Only the requirements the business must supply itself — what can actually block a campaign. */
  requiredUploads: AssetRequirementDto[];
};

export type TemplateRow = ContentTemplate & {
  pillar: { slug: string; name: string };
  activeVersion:
    | (ContentTemplateVersion & {
        variables: TemplateVariable[];
        assetRequirements: TemplateAssetRequirement[];
      })
    | null;
};

/** Prisma returns Json as `unknown`; the seed and the admin CRUD are the only writers. */
const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export const toAssetRequirementDto = (row: TemplateAssetRequirement): AssetRequirementDto => ({
  kind: row.kind,
  required: row.required,
  minCount: row.minCount,
  fulfilment: row.fulfilment,
  notes: row.notes,
  label: assetRequirementLabel(row.kind, row.minCount),
});

export const toTemplateDto = (row: TemplateRow): TemplateDto => {
  const version = row.activeVersion;
  if (!version) throw new Error(`Template ${row.slug} has no active version`);
  const assetRequirements = version.assetRequirements.map(toAssetRequirementDto);

  return {
    id: row.id,
    slug: row.slug,
    legacyId: row.legacyId,
    name: row.name,
    pillarSlug: row.pillar.slug,
    pillarName: row.pillar.name,
    formatSlug: row.formatSlug,
    audience: row.audience,
    platforms: row.platforms,
    purposes: row.purposes,
    primaryPurpose: row.primaryPurpose,
    status: row.status,
    workspaceId: row.workspaceId,
    parentTemplateId: row.parentTemplateId,
    versionId: version.id,
    version: version.version,
    hookPattern: version.hookPattern,
    beats: asArray<BeatDto>(version.beats),
    suggestedSlides: asArray<SlideDto>(version.suggestedSlides),
    keywords: version.keywords,
    variables: version.variables
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((v) => ({
        key: v.key,
        label: v.label,
        type: v.type,
        source: v.source,
        required: v.required,
        defaultValue: v.defaultValue,
        hint: v.hint,
      })),
    assetRequirements,
    requiredUploads: assetRequirements.filter((a) => a.required && a.fulfilment === 'upload'),
  };
};

/** "Needs: 1 person on camera · 2 product footage" — the one-line summary every recommendation shows. */
export const requirementsSummary = (template: Pick<TemplateDto, 'assetRequirements'>): string => {
  const required = template.assetRequirements.filter((a) => a.required);
  if (required.length === 0) return 'No assets required';
  return `Needs: ${required.map((a) => a.label).join(' · ')}`;
};
