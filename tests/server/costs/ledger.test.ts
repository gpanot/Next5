import { describe, expect, it } from 'vitest';
import { featureOf } from '../../../src/server/costs/ledger';

describe('featureOf', () => {
  it('names the route with ids replaced, so one feature groups as one line', () => {
    const req = new Request('https://next5.ai/api/app/campaigns/cmvelbh0m0003vu2v5ih645cb/generate?x=1', { method: 'POST' });
    expect(featureOf(req)).toBe('POST /api/app/campaigns/:id/generate');
  });

  it('keeps words and replaces numbers and uuids', () => {
    const req = new Request('https://next5.ai/api/admin/shorts/42/runs/3f1c2a9e-8b7d-4c6e-9a1f-0b2c3d4e5f60');
    expect(featureOf(req)).toBe('GET /api/admin/shorts/:id/runs/:id');
  });
});
