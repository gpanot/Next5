import Link from 'next/link';
import type { ReactNode } from 'react';

// **bold** or [label](href). Nothing else is markup, so article text cannot inject HTML.
const TOKEN = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;

const linkClass = 'font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-2 transition-colors hover:decoration-blue-600 dark:text-blue-400 dark:decoration-blue-400/30 dark:hover:decoration-blue-400';

/** Renders one line of article text with its inline bold and links. Internal links use next/link; external ones open in a new tab. */
export function InlineText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    const [, bold, label, href] = match;
    if (bold !== undefined) {
      parts.push(<strong key={at} className="font-semibold text-ink dark:text-zinc-100">{bold}</strong>);
    } else if (href.startsWith('/')) {
      parts.push(<Link key={at} href={href} className={linkClass}>{label}</Link>);
    } else {
      parts.push(<a key={at} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>{label}</a>);
    }
    last = at + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** Article text without markup, for meta tags and JSON-LD. */
export const plainText = (text: string): string => text.replace(TOKEN, (_m, bold?: string, label?: string) => bold ?? label ?? '');
