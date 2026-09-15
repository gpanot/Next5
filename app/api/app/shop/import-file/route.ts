import { after, NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError } from '../../../../../src/server/http';
import { enforceRateLimit } from '../../../../../src/server/rateLimit';
import { downloadPendingImages, importExportFile } from '../../../../../src/server/shopImport/service';
import { readForm } from '../../../../../src/server/storage/images';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

export const maxDuration = 60;

/** POST multipart { file } — import a TikTok Seller Center product export (xlsx or csv). */
export const POST = authedRoute(async (req, session) => {
  await enforceRateLimit(`shop-import-file:${session.userId}`, 10, 3600);
  const ws = await requireWorkspace(session.userId, 'shop');
  const form = await readForm(req);
  const file = form.get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'file_required', 'Choose your product export file.');
  const result = await importExportFile(ws, file);
  if (result.missing.length) throw new HttpError(422, 'columns_missing', `We couldn't find these columns: ${result.missing.join(', ')}. Use the product export from TikTok Seller Center.`);
  after(() => downloadPendingImages(ws.id, 60).then(() => undefined));
  return NextResponse.json(result, { status: 201 });
});
