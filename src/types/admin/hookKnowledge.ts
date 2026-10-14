/** One Hook Knowledge entry (admin → Hooks → Hook Knowledge): a note, or the text of an uploaded .md/.txt file. */
export type HookKnowledgeDto = { id: string; title: string; body: string; fileName: string | null; updatedAt: string };

export type HookKnowledgeInput = { title: string; body: string; fileName?: string | null };

export const MAX_KNOWLEDGE_TITLE_CHARS = 120;
/** One entry's text: about 25 pages. */
export const MAX_KNOWLEDGE_BODY_CHARS = 60_000;
/** File types the upload takes (read as text in the browser). */
export const KNOWLEDGE_FILE_TYPES = '.md,.markdown,.txt,text/plain,text/markdown';

/** "Generate for me" in the campaign editor: how many hooks (one post each). */
export const MIN_GENERATED_HOOKS = 2;
export const MAX_GENERATED_HOOKS = 6;
