// Company data read from a website: shared by Perfect Ads and Auto Slideshow.

/** What step 1 learns about a business from its homepage. */
export type BrandProfile = {
  brandName: string;
  domain: string;
  valueProp: string;
  audience: string;
  tone: string;
  productCategories: string[];
  /** Plain words to search the Meta Ad Library with (category words, not the brand name). */
  searchKeywords: string[];
  /** Hex colors read from the site's CSS (brand colors first). Empty when the site has none. */
  palette: string[];
  heroImageUrl: string | null;
  faviconUrl: string | null;
  pageTitle: string | null;
  /** First part of the page text, so later steps can quote real facts. */
  pageExcerpt: string;
};
