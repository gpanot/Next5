/**
 * Brand Cast — client-safe types. 3 recurring people per workspace, made from the brand's audience (ICP) and Visual
 * Bible. Their anchor photos go to the image model as references, so the same faces come back across a brand's
 * slideshows. Shown on the Brand page (users swap a face) and on the admin workspace page.
 */

export const CAST_SIZE = 3;

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
};

export type IntroStatus = 'none' | 'pending' | 'ready' | 'failed';

/** GET /brand-cast. `members` is empty before the cast is made. */
export type BrandCastDto = { members: BrandCastMemberDto[] };
