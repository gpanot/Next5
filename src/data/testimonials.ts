export type Testimonial = {
  quote: string;
  name: string;
};

/** Short by design — shown on the preview wait screen, where she won't stop
 *  to read more than a line or two. Swap for real reviews once collected. */
export const previewTestimonials: readonly Testimonial[] = [
  { quote: "I looked like an actual model. My friends didn't believe it was AI.", name: 'Mai' },
  { quote: 'Got compliments for a week off just one photo.', name: 'Trang' },
  { quote: 'Better than my last real photoshoot, and 10x faster.', name: 'Linh' },
];
