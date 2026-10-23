import { Instrument_Serif, Inter_Tight } from 'next/font/google';

/** Brand Nat Style Guide type: Inter Tight 800 for headings, Instrument Serif italic for the accent words. */
export const natTight = Inter_Tight({ subsets: ['latin'], weight: '800', variable: '--font-nat-tight', display: 'swap' });
export const natSerif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: 'italic', variable: '--font-nat-serif', display: 'swap' });
