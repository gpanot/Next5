/** Next5's own social accounts. Shown in the public footer and listed as `sameAs` in the home page's Organization JSON-LD. */
export const SOCIAL_LINKS = [
  { name: 'Instagram', handle: '@next5marketing', href: 'https://www.instagram.com/next5marketing/' },
  { name: 'TikTok', handle: '@next5marketing', href: 'https://www.tiktok.com/@next5marketing' },
] as const;

export type SocialName = (typeof SOCIAL_LINKS)[number]['name'];
