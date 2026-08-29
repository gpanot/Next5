import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import { LocaleProvider } from '../src/i18n/LocaleContext';

// 'vietnamese' subset added alongside 'latin' — the VI toggle needs full
// diacritic coverage (ệ, ố, ữ, …), which the base latin subset doesn't carry.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NEXT5 — Your Next 5 Instagram Photos',
  description:
    'A professional photoshoot, made for you. Choose your studio, show us your vibe, and get 5 personalized photos delivered within 4 hours. First studio 149K VND — a first-shoot offer.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-full antialiased">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
