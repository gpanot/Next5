// server-only — never import from a 'use client' file.

/** R2 object keys for business studios. Keys are built only from server-generated ids. */

export type ProductPhotoSide = 'front' | 'back' | 'detail';

export const identityKey = (workspaceId: string, refId: string): string =>
  `ws/${workspaceId}/identity/${refId}.jpg`;

export const productKey = (workspaceId: string, productId: string, side: ProductPhotoSide): string =>
  `ws/${workspaceId}/products/${productId}/${side}.jpg`;

export const batchItemKey = (workspaceId: string, batchId: string, itemId: string, version = 1): string =>
  `ws/${workspaceId}/batches/${batchId}/${itemId}${version > 1 ? `-v${version}` : ''}.jpg`;

export const studioModelKey = (slug: string, kind: 'face' | 'full'): string =>
  `studio-models/${slug}/${kind}.jpg`;
