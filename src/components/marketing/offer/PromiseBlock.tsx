import { ShieldCheck, Trophy } from 'lucide-react';
import { OFFER_SHARED } from '../../../content/business/offer';

/** The two promises a customer can check herself: every photo matches, and her feed does better. */
export const PromiseBlock = ({ matchPromise }: { matchPromise: string }) => (
  <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
    <div className="flex flex-col gap-3 rounded-3xl bg-ink p-5 text-white sm:p-8 dark:bg-app-panel dark:ring-1 dark:ring-app-line">
      <Trophy aria-hidden className="h-8 w-8 text-accent" />
      <h3 className="font-display text-[22px] font-medium leading-tight sm:text-[28px]">{OFFER_SHARED.promiseFeedTitle}</h3>
      <p className="text-[16px] leading-relaxed text-white/80 dark:text-app-muted">{OFFER_SHARED.promiseFeed}</p>
      <p className="text-[14px] text-white/60 dark:text-app-muted">{OFFER_SHARED.promiseFeedHow}</p>
    </div>
    <div className="flex flex-col gap-3 rounded-3xl border border-app-line bg-app-panel p-5 sm:p-8">
      <ShieldCheck aria-hidden className="h-8 w-8 text-app-accent" />
      <h3 className="font-display text-[22px] font-medium leading-tight sm:text-[28px] text-app-ink">Every photo looks right, or it’s free</h3>
      <p className="text-[16px] leading-relaxed text-app-muted">{matchPromise}</p>
      <p className="text-[14px] text-app-muted">If a photo fails, you get your photo credit back. You pay first, and nothing renews on its own.</p>
    </div>
  </div>
);
