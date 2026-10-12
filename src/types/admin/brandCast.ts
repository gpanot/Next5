/**
 * Brand Cast — client-safe types. 3 recurring people per workspace, made from the brand's audience (ICP) and Visual
 * Bible. Their anchor photos go to the image model as references, so the same faces come back across a brand's
 * slideshows. Shown on the Brand page (users swap a face) and on the admin workspace page.
 */

export const CAST_SIZE = 3;
/** "New face" parks the old person here; they can be brought back or deleted. */
export const ARCHIVE_MAX = 7;
export const ARCHIVE_DAYS = 14;
/** About how long a new face's photo takes: the countdown on the card. */
export const FACE_SECONDS = 45;
/** Ages the owner can set on the "Edit name and age" dialog. */
export const MIN_AGE = 18;
export const MAX_AGE = 90;
export const MAX_NAME = 30;

export type BrandCastStatus = 'pending' | 'ready' | 'failed';

export type BrandCastMemberDto = {
  id: string;
  slot: number;
  /** First name and age, e.g. "Maya, 28". */
  name: string;
  /** Face, hair, build and everyday style, as the photo prompts get it. */
  look: string;
  /** The anchor photo; null while it is being made or when it failed. */
  imageUrl: string | null;
  status: BrandCastStatus;
  error: string | null;
  /** Slideshows that used this person. */
  uses: number;
  updatedAt: string;
  /** The ~6 s intro video ("Hi, I'm Maya…"): its status, link when ready, spoken line and why it failed. */
  introStatus: IntroStatus;
  introUrl: string | null;
  introScript: string | null;
  introError: string | null;
  /** When "New face" parked this person, and when they are deleted for good; null for the active cast. */
  archivedAt: string | null;
  expiresAt: string | null;
};

export type IntroStatus = 'none' | 'pending' | 'ready' | 'failed';

/** GET /brand-cast. `members`: the active cast, empty before it is made. `archived`: parked people, newest first. */
export type BrandCastDto = { members: BrandCastMemberDto[]; archived: BrandCastMemberDto[] };
