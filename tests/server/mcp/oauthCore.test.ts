import { describe, expect, it } from 'vitest';
import { hashSecret, isAllowedRedirectUri, isS256Challenge, mintClientId, mintSecret, redirectMatches, redirectWith, verifyPkce } from '../../../src/server/mcp/oauthCore';

describe('PKCE (RFC 7636 appendix B)', () => {
  const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

  it('accepts the matching verifier', () => {
    expect(isS256Challenge(challenge)).toBe(true);
    expect(verifyPkce(verifier, challenge)).toBe(true);
  });

  it('rejects a wrong or malformed verifier', () => {
    expect(verifyPkce(`${verifier.slice(0, -1)}A`, challenge)).toBe(false);
    expect(verifyPkce('short', challenge)).toBe(false);
    expect(verifyPkce(`${verifier} `, challenge)).toBe(false);
  });
});

describe('secrets', () => {
  it('are prefixed, random and hashed', () => {
    const a = mintSecret('n5at');
    expect(a).toMatch(/^n5at_[A-Za-z0-9_-]{43}$/);
    expect(mintSecret('n5at')).not.toBe(a);
    expect(hashSecret(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSecret(a)).toBe(hashSecret(a));
    expect(mintClientId()).toMatch(/^n5c_[0-9a-f]{32}$/);
  });
});

describe('redirect URIs', () => {
  it('allows Claude\'s hosted callback and loopback http only', () => {
    expect(isAllowedRedirectUri('https://claude.ai/api/mcp/auth_callback')).toBe(true);
    expect(isAllowedRedirectUri('http://localhost:3118/callback')).toBe(true);
    expect(isAllowedRedirectUri('http://127.0.0.1/callback')).toBe(true);
    expect(isAllowedRedirectUri('http://evil.example/callback')).toBe(false);
    expect(isAllowedRedirectUri('javascript:alert(1)')).toBe(false);
    expect(isAllowedRedirectUri('https://claude.ai/cb#frag')).toBe(false);
    expect(isAllowedRedirectUri('not a url')).toBe(false);
  });

  it('matches exactly, or a loopback URI on any port (RFC 8252)', () => {
    const registered = ['https://claude.ai/api/mcp/auth_callback', 'http://localhost/callback'];
    expect(redirectMatches('https://claude.ai/api/mcp/auth_callback', registered)).toBe(true);
    expect(redirectMatches('https://claude.ai/api/mcp/auth_callback/', registered)).toBe(false);
    expect(redirectMatches('http://localhost:51234/callback', registered)).toBe(true);
    expect(redirectMatches('http://localhost:51234/other', registered)).toBe(false);
    expect(redirectMatches('http://127.0.0.1:51234/callback', registered)).toBe(false);
    expect(redirectMatches('https://evil.example/callback', registered)).toBe(false);
  });

  it('adds code and state to the redirect', () => {
    const url = new URL(redirectWith('https://claude.ai/api/mcp/auth_callback?x=1', { code: 'abc', state: 's t', error: undefined }));
    expect(url.searchParams.get('x')).toBe('1');
    expect(url.searchParams.get('code')).toBe('abc');
    expect(url.searchParams.get('state')).toBe('s t');
    expect(url.searchParams.has('error')).toBe(false);
  });
});
