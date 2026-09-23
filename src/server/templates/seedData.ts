/**
 * Reads the Phase 0A starter library off disk.
 *
 * The JSON under `scripts/data/content-templates/` is the source of truth for the library —
 * transcribed from `next5-phase0a-output.md` §5, reviewable in a diff, and re-runnable.
 * Nothing in the app writes to it; the admin CRUD writes to the database instead.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type {
  AssetFulfilment,
  AssetKind,
  AudienceType,
  ContentPurpose,
  ContentTemplateStatus,
  TemplateVariableSource,
  TemplateVariableType,
} from '@prisma/client';

export type SeedBeat = { label: string; guidance: string; bgPrompt?: string };
export type SeedSlide = { text: string; bgPrompt: string };

export type SeedVariable = {
  key: string;
  label: string;
  type: TemplateVariableType;
  source: TemplateVariableSource;
  required: boolean;
  defaultValue: string | null;
  hint: string | null;
  position: number;
};

export type SeedAssetRequirement = {
  kind: AssetKind;
  required: boolean;
  minCount: number;
  fulfilment: AssetFulfilment;
  notes: string | null;
};

export type SeedTemplate = {
  slug: string;
  legacyId: number;
  name: string;
  pillarSlug: string;
  formatSlug: string;
  audience: AudienceType;
  platforms: string[];
  purposes: ContentPurpose[];
  primaryPurpose: ContentPurpose;
  status: ContentTemplateStatus;
  version: {
    version: number;
    hookPattern: string;
    beats: SeedBeat[];
    suggestedSlides: SeedSlide[];
    keywords: string[];
    variables: SeedVariable[];
    assetRequirements: SeedAssetRequirement[];
  };
};

export type SeedPillar = { slug: string; name: string; description: string; position: number };

const DATA_DIR = path.join(process.cwd(), 'scripts', 'data', 'content-templates');

const read = <T>(file: string): T => JSON.parse(readFileSync(path.join(DATA_DIR, file), 'utf8')) as T;

export const readSeedPillars = (): SeedPillar[] => read<SeedPillar[]>('pillars.json');

/** Every template file in the data directory, ordered by its Phase 0A number. */
export const readSeedTemplates = (): SeedTemplate[] =>
  readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'pillars.json')
    .sort()
    .map((f) => read<SeedTemplate>(f));
