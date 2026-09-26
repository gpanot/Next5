/** Client-safe catalog DTOs. */

export type ThemeSceneDto = { id: string; label: string; direction: string };

export type ThemeDto = {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  featuredMonth: string | null;
  scenes: ThemeSceneDto[];
  earlyAccess: boolean;
};

export type TemplateLocationDto = { id: string; label: string };

export type SetTemplateDto = {
  id: string;
  product: 'brand' | 'shop';
  name: string;
  description: string;
  coverImage: string;
  locations: TemplateLocationDto[];
  defaults: { wardrobe?: string; poseEnergy?: string };
  /** Shop: the poses that fit this scene, each with a sample photo (manifest path). Empty for Brand. */
  poses: ScenePoseDto[];
};

export type ScenePoseDto = { id: string; label: string; image: string };

/** Free photos of her in one style: none yet, being made, or ready (signed URLs). */
export type SetPreviewDto = { status: 'none' | 'generating' | 'ready' | 'failed'; photos: string[] };

export type StudioSetDto = {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  coverImage: string;
  locations: string[];
  wardrobe: string | null;
  poseEnergy: string | null;
  brandColors: string[];
  modelRef: string | null;
  status: 'draft' | 'active' | 'archived';
  batchCount: number;
  preview: SetPreviewDto;
  createdAt: string;
};
