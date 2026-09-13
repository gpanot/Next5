import { notFound } from 'next/navigation';
import { isBusinessEnabled } from '../config/business';

/**
 * Call at the top of every business page/layout (/, /brand, /shop, /pricing, /app/*).
 * Returns `notFound()` (throws a Next.js 404) when the flag is off.
 *
 * Usage in a server component or route handler:
 * ```ts
 * import { assertBusinessEnabled } from '@/src/server/guards';
 * assertBusinessEnabled();
 * ```
 */
export const assertBusinessEnabled = (): void => {
  if (!isBusinessEnabled()) notFound();
};
