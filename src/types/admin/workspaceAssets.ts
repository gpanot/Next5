/** Admin workspace page, Assets tab — client-safe types: the workspace's AI-generated pictures and their prompts. */

export const WORKSPACE_ASSET_TYPES = ['blitz', 'hook', 'brand'] as const;
export type WorkspaceAssetType = (typeof WORKSPACE_ASSET_TYPES)[number];

export const WORKSPACE_ASSET_LABELS: Record<WorkspaceAssetType, string> = {
  blitz: 'Blitzs',
  hook: 'Hook Slideshows',
  brand: 'Brand Slideshows',
};

/** One generated picture. `imageKey` also identifies it: the same picture is never listed twice. */
export type WorkspaceAssetDto = {
  imageKey: string;
  type: WorkspaceAssetType;
  thumbUrl: string;
  fullUrl: string;
  prompt: string;
  model: string | null;
  createdAt: string;
};

export type WorkspaceAssetsPageDto = { assets: WorkspaceAssetDto[]; total: number };

export const WORKSPACE_ASSETS_PAGE_SIZE = 60;
