'use client';

/** Client calls for the content-template admin tool. */
import { adminFetch } from '../useAdminApi';
import type { TemplateDto } from '../../../../lib/contentTemplates';

export type PillarDto = { id: string; slug: string; name: string; description: string };
export type VersionSummary = { id: string; version: number; hookPattern: string; createdAt: string; active: boolean };
export type AdminWorkspace = { id: string; name: string; email: string; product: string };

export const PURPOSES = ['awareness', 'trust', 'enquiry', 'conversion', 'engagement', 'retention'] as const;
export const AUDIENCES = ['b2c', 'b2b', 'both'] as const;
export const STATUSES = ['draft', 'active', 'archived'] as const;
export const PLATFORMS = ['tiktok', 'instagram'] as const;

export const ASSET_KINDS = [
  'person_on_camera', 'product_footage', 'product_image', 'location_footage',
  'customer_photo', 'customer_footage', 'logo', 'on_screen_text',
  'before_after_photo', 'before_footage', 'after_footage', 'demonstration',
  'spec_sheet_broll', 'trending_audio', 'screen_recording', 'generic_selfie',
] as const;

export const FULFILMENTS = ['upload', 'library', 'generate'] as const;
export const VARIABLE_TYPES = ['text', 'image', 'number', 'url'] as const;
export const VARIABLE_SOURCES = ['brand', 'campaign', 'manual'] as const;

/** Every template including drafts and archived — the admin tool shows the whole library. */
export const listAllTemplates = (token: string, workspaceId?: string) =>
  adminFetch<{ templates: TemplateDto[] }>(
    token,
    `/api/admin/content-templates${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ''}`,
  ).then((r) => r.templates);

export const listPillars = (token: string) =>
  adminFetch<{ pillars: PillarDto[] }>(token, '/api/admin/content-pillars').then((r) => r.pillars);

export const listVersions = (token: string, id: string) =>
  adminFetch<{ versions: VersionSummary[] }>(token, `/api/admin/content-templates/${id}/versions`).then((r) => r.versions);

export const listWorkspaces = (token: string) =>
  adminFetch<{ workspaces: AdminWorkspace[] }>(token, '/api/admin/business/workspaces').then((r) => r.workspaces);

export const patchTemplate = (token: string, id: string, body: Record<string, unknown>) =>
  adminFetch<{ template: TemplateDto }>(token, `/api/admin/content-templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }).then((r) => r.template);

export const archive = (token: string, id: string) =>
  adminFetch<{ template: TemplateDto }>(token, `/api/admin/content-templates/${id}`, { method: 'DELETE' }).then((r) => r.template);

export const clone = (token: string, id: string, body: { workspaceId: string } | { slug: string; name?: string }) =>
  adminFetch<{ template: TemplateDto }>(token, `/api/admin/content-templates/${id}/clone`, {
    method: 'POST',
    body: JSON.stringify(body),
  }).then((r) => r.template);

export const createTemplate = (token: string, body: Record<string, unknown>) =>
  adminFetch<{ template: TemplateDto }>(token, '/api/admin/content-templates', {
    method: 'POST',
    body: JSON.stringify(body),
  }).then((r) => r.template);
