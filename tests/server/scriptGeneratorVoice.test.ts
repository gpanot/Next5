import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/server/shorts/voice', () => ({
  synthesize: vi.fn(async (_text: string, _choice: unknown, meter: { add: (l: string, n: number) => void }) => {
    meter.add('Gemini 3.8 Flash TTS (treg)', 13_000);
    return { wav: Buffer.from('RIFFfake'), durationS: 4.2 };
  }),
}));
import { POST as voiceRoute } from '../../app/api/admin/script-generator/voice/route';
import { signAdminToken } from '../../src/lib/admin-auth';
import { synthesize } from '../../src/server/shorts/voice';
import { MAX_VOICE_CHARS, parseVoiceText, SCRIPT_VOICE } from '../../src/server/scriptGenerator/voice';

const request = (body: unknown, token: string | null = signAdminToken()) =>
  new NextRequest('http://localhost/api/admin/script-generator/voice', {
    method: 'POST',
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST voice', () => {
  it('returns the script read by the man voice as audio/wav, with its cost', async () => {
    const res = await voiceRoute(request({ text: 'Hello moms.\n\nBuild something.' }), undefined);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('audio/wav');
    expect(res.headers.get('x-cost-usd')).toBe('0.0130');
    const [text, choice] = vi.mocked(synthesize).mock.calls[0];
    expect(text).toBe('Hello moms. Build something.');
    expect(choice.voice).toBe(SCRIPT_VOICE);
  });

  it('rejects empty and too long text without calling the voice', async () => {
    vi.mocked(synthesize).mockClear();
    expect((await voiceRoute(request({ text: '  ' }), undefined)).status).toBe(400);
    expect((await voiceRoute(request({ text: 'a'.repeat(MAX_VOICE_CHARS + 1) }), undefined)).status).toBe(400);
    expect(synthesize).not.toHaveBeenCalled();
  });

  it('needs an admin token', async () => {
    expect((await voiceRoute(request({ text: 'Hi.' }, null), undefined)).status).toBe(401);
  });
});

describe('parseVoiceText', () => {
  it('collapses whitespace', () => expect(parseVoiceText(' a\n\n b ')).toBe('a b'));
});
