// server-only — never import from a 'use client' file.
// The admin workspace page's Assets tab: every AI-generated picture of the workspace with its prompt, newest first.
// Blitz pictures are library assets the workspace owns. Brand slideshow pictures are the photos of its auto runs,
// hidden calendar idea runs included. Hook slideshow pictures are the AI photos of its campaigns: stock and library
// photos are left out, because they have no prompt.

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { WORKSPACE_ASSETS_PAGE_SIZE, type WorkspaceAssetDto, type WorkspaceAssetType, type WorkspaceAssetsPageDto } from '../../types/admin/workspaceAssets';
import { presignObject } from '../storage/objectStore';
import { thumbUrl } from '../storage/thumbs';
import { CAMPAIGN_KIND } from '../autoSlideshow/campaign/store';

type AssetRow = { image_key: string; type: WorkspaceAssetType; prompt: string; model: string | null; made_at: Date; total: bigint };

const assetRows = (workspaceId: string, type: WorkspaceAssetType | null, offset: number): Promise<AssetRow[]> => {
  const typeFilter = type ? Prisma.sql`WHERE type = ${type}` : Prisma.empty;
  return prisma.$queryRaw<AssetRow[]>`
    WITH runs AS (
      SELECT id, kind, photos, created_at FROM public.auto_slideshow_runs
      WHERE photos IS NOT NULL AND (
        workspace_id = ${workspaceId}
        OR idea_for_run_id IN (SELECT id FROM public.auto_slideshow_runs WHERE workspace_id = ${workspaceId})
      )
    ),
    all_assets AS (
      SELECT CASE WHEN r.kind = ${CAMPAIGN_KIND} THEN 'hook' ELSE 'brand' END AS type,
        e->>'imageKey' AS image_key,
        COALESCE(e->'gen'->>'sentPrompt', e->>'prompt') AS prompt,
        e->'gen'->>'model' AS model,
        COALESCE((e->'gen'->>'createdAt')::timestamptz, r.created_at AT TIME ZONE 'UTC') AS made_at
      FROM runs r
      CROSS JOIN LATERAL jsonb_array_elements(r.photos) AS e
      WHERE e->>'imageKey' IS NOT NULL AND e->'deleted' IS NULL AND e->>'brandPhotoKey' IS NULL
        AND (r.kind <> ${CAMPAIGN_KIND} OR (COALESCE(e->>'source', 'generated') = 'generated' AND COALESCE(e->>'origin', 'ai') = 'ai'))
      UNION ALL
      SELECT 'blitz', a.r2_key, d.descriptor->>'aiPrompt', d.model, a.created_at AT TIME ZONE 'UTC'
      FROM public.blitz_assets a
      JOIN public.asset_descriptors d ON d.blitz_asset_id = a.id
      WHERE a.workspace_id = ${workspaceId} AND d.source = 'ai_generated' AND d.descriptor->>'aiPrompt' IS NOT NULL
    ),
    unique_assets AS (
      SELECT DISTINCT ON (image_key) * FROM all_assets
      WHERE prompt IS NOT NULL
      ORDER BY image_key, made_at DESC
    )
    SELECT *, count(*) OVER () AS total FROM unique_assets
    ${typeFilter}
    ORDER BY made_at DESC, image_key
    LIMIT ${WORKSPACE_ASSETS_PAGE_SIZE} OFFSET ${offset}`;
};

const assetDto = async (row: AssetRow): Promise<WorkspaceAssetDto> => {
  const thumb = thumbUrl(row.image_key);
  return {
    imageKey: row.image_key,
    type: row.type,
    thumbUrl: thumb,
    fullUrl: (await presignObject(row.image_key)) ?? thumb,
    prompt: row.prompt,
    model: row.model,
    createdAt: row.made_at.toISOString(),
  };
};

/** One page of the workspace's generated pictures, newest first. `type` null: every type. */
export const workspaceAssets = async (workspaceId: string, type: WorkspaceAssetType | null, offset: number): Promise<WorkspaceAssetsPageDto> => {
  const rows = await assetRows(workspaceId, type, offset);
  return { assets: await Promise.all(rows.map(assetDto)), total: Number(rows[0]?.total ?? 0) };
};
