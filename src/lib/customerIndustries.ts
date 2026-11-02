/**
 * The kinds of clients a workspace sells to (market.targetCustomerIndustries on its company profile): read from the
 * website, then editable by the owner on the Brand page and by admins. Blitz writes one audience of stories per item.
 * No server imports: the Brand page uses the limits too.
 */

/** Most client types a person can set. */
export const MAX_CUSTOMER_INDUSTRIES = 5;
/** Most client types Blitz writes for when they come from the website, not from a person. */
export const MAX_EXTRACTED_INDUSTRIES = 3;
export const MAX_INDUSTRY_CHARS = 60;

/**
 * GET/PUT /api/slideshow/workspaces/[workspaceId]/customer-industries. `ready` false: the website is not read yet.
 * `edited`: the owner or an admin confirmed the list. `suggestions`: other client types read from the site.
 * `askOwner`: the pop-up should ask the owner to check the list.
 */
export type CustomerIndustriesDto = { industries: string[]; suggestions: string[]; edited: boolean; ready: boolean; askOwner: boolean };

type IndustriesField = { value?: string[] | null; source?: string; alternatives?: string[] } | null | undefined;

/** The client types Blitz writes for: all a person set, the first few the website gave. */
export const usedIndustries = (field: IndustriesField): string[] =>
  (field?.value ?? []).slice(0, field?.source === 'manual' ? MAX_CUSTOMER_INDUSTRIES : MAX_EXTRACTED_INDUSTRIES);

/** What the site gave beyond the list in use, offered as one tap additions. */
export const suggestedIndustries = (field: IndustriesField): string[] => {
  const used = new Set(usedIndustries(field).map((n) => n.toLowerCase()));
  return cleanIndustries([...(field?.value ?? []), ...(field?.alternatives ?? [])]).filter((n) => !used.has(n.toLowerCase()));
};

/** Trimmed, single spaced, without blanks or repeats (case ignored). Keeps the first spelling. */
export const cleanIndustries = (names: string[]): string[] => {
  const seen = new Set<string>();
  return names.map((n) => n.trim().replace(/\s+/g, ' ')).filter((n) => {
    const key = n.toLowerCase();
    if (!n || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
