/**
 * GET /api/admin/copy-viral/[id]/media/<file>?token=… — a project file (reference video, stills) for <img>/<video>.
 * Those tags cannot send the Authorization header, so the admin token comes in the query. Supports Range for video seeking.
 * Localhost only.
 */
import { existsSync, statSync } from 'fs';
import { open, type FileHandle } from 'fs/promises';
import path from 'path';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdminToken } from '../../../../../../../src/lib/admin-auth';
import { HttpError, toErrorResponse } from '../../../../../../../src/server/http';
import { assertLocal, projectFile } from '../../../../../../../src/server/copyViral/store';

type Ctx = { params: Promise<{ id: string; path: string[] }> };

const TYPES: Record<string, string> = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.srt': 'text/plain; charset=utf-8', '.log': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

const CHUNK = 256 * 1024;

/**
 * Bytes start..end of the file, read only when the response asks for more. The browser aborts range requests all the
 * time (video seeking): cancel closes the file, and nothing is pushed after that (Readable.toWeb on a file stream
 * did, which crashed the dev server with "Controller is already closed").
 */
const body = (file: string, start: number, end: number) => {
  let handle: FileHandle | null = null;
  let pos = start;
  let done = false;
  const finish = async () => {
    done = true;
    await handle?.close().catch(() => undefined);
    handle = null;
  };
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (done) return;
      handle ??= await open(file, 'r');
      const length = Math.min(CHUNK, end - pos + 1);
      const { bytesRead, buffer } = length > 0 ? await handle.read(new Uint8Array(length), 0, length, pos) : { bytesRead: 0, buffer: new Uint8Array(0) };
      if (done) return;
      if (bytesRead === 0) {
        await finish();
        return controller.close();
      }
      pos += bytesRead;
      controller.enqueue(buffer.subarray(0, bytesRead));
    },
    cancel: finish,
  });
};

export const GET = async (req: NextRequest, ctx: Ctx) => {
  try {
    assertLocal();
    verifyAdminToken(req.nextUrl.searchParams.get('token') ?? '');
  } catch (err) {
    return err instanceof HttpError ? toErrorResponse(err) : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id, path: parts } = await ctx.params;
    const file = projectFile(id, parts.join('/'));
    if (!existsSync(file)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const size = statSync(file).size;
    const headers = { 'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': file.endsWith('.log') ? 'no-store' : 'private, max-age=3600' };
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') ?? '');
    if (!range) return new Response(body(file, 0, size - 1), { headers: { ...headers, 'Content-Length': String(size) } });
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    return new Response(body(file, start, end), {
      status: 206,
      headers: { ...headers, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${size}` },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
};
