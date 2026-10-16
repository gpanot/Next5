import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseSignedRequest } from '../../../src/server/social/instagramSignedRequest';

const sign = (payload: object, secret: string) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${createHmac('sha256', secret).update(body).digest('base64url')}.${body}`;
};

describe('parseSignedRequest', () => {
  it('reads the user id when the signature matches', () => {
    const req = sign({ algorithm: 'HMAC-SHA256', user_id: '17841400550449128', issued_at: 1760000000 }, 'secret');
    expect(parseSignedRequest(req, 'secret')).toEqual({ userId: '17841400550449128', issuedAt: 1760000000 });
  });

  it('refuses a request signed with another secret', () => {
    expect(parseSignedRequest(sign({ algorithm: 'HMAC-SHA256', user_id: '1' }, 'other'), 'secret')).toBeNull();
  });

  it('refuses malformed input', () => {
    expect(parseSignedRequest('nodot', 'secret')).toBeNull();
    expect(parseSignedRequest('', 'secret')).toBeNull();
  });
});
