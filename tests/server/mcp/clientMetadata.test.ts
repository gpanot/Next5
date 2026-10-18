import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchClientMetadata, isMetadataDocumentUrl } from '../../../src/server/mcp/clientMetadata';

const DOC_URL = 'https://claude.ai/oauth/mcp-oauth-client-metadata';
const respond = (body: unknown) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));

afterEach(() => vi.unstubAllGlobals());

describe('Client ID Metadata Documents', () => {
  it('only fetches https URLs on public DNS names', () => {
    expect(isMetadataDocumentUrl(DOC_URL)).toBe(true);
    expect(isMetadataDocumentUrl('n5c_0123')).toBe(false);
    expect(isMetadataDocumentUrl('http://claude.ai/doc')).toBe(false);
    expect(isMetadataDocumentUrl('https://127.0.0.1/doc')).toBe(false);
    expect(isMetadataDocumentUrl('https://[::1]/doc')).toBe(false);
    expect(isMetadataDocumentUrl('https://localhost/doc')).toBe(false);
    expect(isMetadataDocumentUrl('https://metadata.internal/doc')).toBe(false);
    expect(isMetadataDocumentUrl('https://claude.ai/')).toBe(false);
  });

  it('reads the name and the allowed redirect URIs', async () => {
    respond({ client_id: DOC_URL, client_name: 'Claude', redirect_uris: ['https://claude.ai/api/mcp/auth_callback', 'http://evil.test/cb'] });
    await expect(fetchClientMetadata(DOC_URL)).resolves.toEqual({ clientName: 'Claude', redirectUris: ['https://claude.ai/api/mcp/auth_callback'] });
  });

  it('refuses a document naming another client', async () => {
    respond({ client_id: 'https://evil.test/doc', redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] });
    await expect(fetchClientMetadata(DOC_URL)).rejects.toMatchObject({ code: 'invalid_client' });
  });
});
