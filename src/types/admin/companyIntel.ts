// Company data read from a website: shared by Perfect Ads and Auto Slideshow.

/** How a brand's slideshows look, so a Porsche deck does not look like a budget car's. */
export type SlideshowStyle = {
  /** Who and what the photos show, where, and how they are framed, in the brand's own world. Never lighting: photos stay bright. */
  photoStyle: string;
  /** The product itself (a car, a dress, a dish) may be a photo's subject. */
  productAsSubject: boolean;
  /** Slide headline box color and its text color (hex), readable together. */
  boxColor: string;
  boxTextColor: string;
};

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
  /** Missing on profiles made before 2026-10-02: slideshows then use the default look. */
  slideshowStyle?: SlideshowStyle;
};
