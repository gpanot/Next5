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
};

export type StudioSetDto = {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  coverImage: string;
  coverUrl: string | null;
  locations: string[];
  wardrobe: string | null;
  poseEnergy: string | null;
  brandColors: string[];
  modelRef: string | null;
  status: 'draft' | 'active' | 'archived';
  batchCount: number;
  createdAt: string;
};
