import { describe, expect, it } from 'vitest';
import { resolutionFor, sizeForRatio } from '../../../src/config/imageModels';
import { toBenchModel } from '../../../src/server/admin/wavespeedCatalog';

const raw = (model_id: string, properties: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  model_id,
  base_price: 0.045,
  type: 'image-to-image',
  description: 'Edits a photo from a prompt. Second sentence is dropped.',
  api_schema: { api_schemas: [{ request_schema: { required: ['prompt'], properties } }] },
  ...extra,
});

describe('WaveSpeed model catalog', () => {
  it('reads how a model must be called from its own schema', () => {
    const model = toBenchModel(raw('bytedance/seedream-v5.0-pro/edit', {
      prompt: { type: 'string' },
      images: { type: 'array', maxItems: 10 },
      aspect_ratio: { type: 'string', enum: ['1:1', '3:4'] },
      resolution: { type: 'string', enum: ['1k', '2k', '4k'] },
      output_format: { type: 'string', enum: ['png', 'jpeg'] },
    }));

    expect(model).toMatchObject({
      id: 'bytedance/seedream-v5.0-pro/edit',
      label: 'Seedream V5.0 Pro',
      family: 'bytedance',
      imagesField: 'images',
      maxImages: 10,
      supportsAspectRatio: true,
      supportsResolution: true,
      supportsOutputFormat: true,
      keepsInputShape: false,
      priceUsdMicros: 45_000,
    });
    expect(model?.note).toBe('Edits a photo from a prompt.');
  });

  it('keeps output_format off the models that reject it, and names the variant', () => {
    const model = toBenchModel(raw('google/nano-banana-2/edit-fast', {
      prompt: { type: 'string' },
      image: { type: 'string' },
      size: { type: 'string' },
    }));
    expect(model).toMatchObject({
      label: 'Nano Banana 2 (fast)',
      imagesField: 'image',
      maxImages: 1,
      supportsOutputFormat: false,
      supportsSize: true,
      keepsInputShape: false,
    });
  });

  it('skips anything that is not a prompt-and-photo edit', () => {
    expect(toBenchModel(raw('wavespeed-ai/flux-2-klein-9b/edit-lora', { prompt: {}, images: { type: 'array' } }))).toBeNull();
    expect(toBenchModel(raw('some/text-to-image', { prompt: {}, images: { type: 'array' } }, { type: 'text-to-image' }))).toBeNull();
    expect(toBenchModel(raw('some/model', { images: { type: 'array' } }))).toBeNull(); // no prompt
    expect(toBenchModel(raw('some/model', { prompt: {} }))).toBeNull(); // no photo
  });

  it('picks a resolution and a pixel size the model accepts', () => {
    expect(resolutionFor('2k', ['1080p', '2K', '4K'])).toBe('2K');
    expect(resolutionFor('1k', ['2k', '4k'])).toBe('2k'); // nothing matches 1k, so its first choice
    expect(resolutionFor('1k', undefined)).toBe('1k');
    expect(sizeForRatio('1:1', '1k')).toBe('1024*1024');
    expect(sizeForRatio('9:16', '2k')).toBe('1536*2720');
  });
});
