// A Prospect Pack's preview cards (past the ones it renders) make only their hook image at the batch; their other
// images wait for the unlock.

import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/db', () => ({ prisma: {} }));
vi.mock('../../../src/server/labs/ideaFinish', () => ({ finishIdeaCards: vi.fn() }));
vi.mock('../../../src/server/labs/websiteDeck', () => ({ loadWebsiteSource: vi.fn(), photoBrandFor: vi.fn() }));
vi.mock('../../../src/server/labs/blitzBankPhotos', () => ({ batchStoryPhotos: vi.fn() }));

import { holdPreviewImages } from '../../../src/server/labs/packPreviews';
import type { DeckItem } from '../../../src/server/slideshow/core/deckAssembly';
import type { ImageNeed } from '../../../src/server/slideshow/core/generatedAssets';

const need = (role: ImageNeed['role']): ImageNeed => ({ key: `a:${role}`, role, text: role });
const card = (roles: Array<ImageNeed['role']>): DeckItem =>
  ({ shots: [], finishing: true, ...(roles.length ? { pendingImages: { audience: 'a', categories: [], needs: roles.map(need) } } : {}) }) as unknown as DeckItem;

describe('holdPreviewImages', () => {
  it('leaves the rendered cards alone and holds the previews\' images but the hook', () => {
    const deck = [card(['hook', 'pain']), card(['pain']), card(['pain']), card(['pain']), card(['pain', 'proof']), card([]), card(['hook', 'pain', 'cta'])];
    const out = holdPreviewImages(deck, 0);
    expect(out.slice(0, 4)).toEqual(deck.slice(0, 4));
    expect(out[4]).toMatchObject({ packPreview: true, laterImages: { needs: [need('pain'), need('proof')] } });
    expect(out[4]!.pendingImages).toBeUndefined();
    expect(out[5]).toMatchObject({ packPreview: true });
    expect(out[5]!.laterImages).toBeUndefined();
    expect(out[6]).toMatchObject({ packPreview: true, pendingImages: { needs: [need('hook')] }, laterImages: { needs: [need('pain'), need('cta')] } });
  });

  it('counts the ideas already planned (a first batch written in two calls)', () => {
    const out = holdPreviewImages([card(['pain']), card(['pain'])], 3);
    expect(out[0]!.packPreview).toBeUndefined();
    expect(out[1]!.packPreview).toBe(true);
  });
});
