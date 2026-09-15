import { describe, expect, it } from 'vitest';
import { scopeAppPath, studioHref } from '../../src/lib/studioPaths';

describe('studio paths', () => {
  it('builds studio URLs', () => {
    expect(studioHref('shop')).toBe('/app/shop');
    expect(studioHref('brand', '/create')).toBe('/app/brand/create');
  });

  it('scopes legacy app paths and leaves shared or scoped ones alone', () => {
    expect(scopeAppPath('/app', 'shop')).toBe('/app/shop');
    expect(scopeAppPath('/app/create?theme=just-listed', 'brand')).toBe('/app/brand/create?theme=just-listed');
    expect(scopeAppPath('/app/batches/abc', 'shop')).toBe('/app/shop/batches/abc');
    expect(scopeAppPath('/app/settings/privacy', 'shop')).toBe('/app/settings/privacy');
    expect(scopeAppPath('/app/brand/library', 'shop')).toBe('/app/brand/library');
    expect(scopeAppPath('https://next5.giinger.com/pricing', 'shop')).toBe('https://next5.giinger.com/pricing');
  });
});
