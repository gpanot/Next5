import { NextRequest, NextResponse } from 'next/server';
import { generateDirectorNote, type DirectorNoteInput } from '../../../src/lib/director-note';

export type DirectorNoteRequestBody = DirectorNoteInput;

export type DirectorNoteResponseBody = {
  note: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DirectorNoteRequestBody;

    if (!body?.directorName || !body?.studioTitle) {
      return NextResponse.json(
        { error: 'Missing directorName or studioTitle' },
        { status: 400 },
      );
    }

    const note = await generateDirectorNote({
      directorName: body.directorName,
      directorSpecialty: body.directorSpecialty ?? '',
      directorSignature: body.directorSignature ?? '',
      studioTitle: body.studioTitle,
      feelings: body.feelings ?? [],
      goals: body.goals ?? [],
    });

    return NextResponse.json({ note } satisfies DirectorNoteResponseBody);
  } catch (err) {
    console.error('[director-note] POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
