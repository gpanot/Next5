import { ShieldCheck } from 'lucide-react';
import { SHOP } from '../../../content/business/marketing';
import { MarketingImage } from '../shared/MarketingImage';

export const AccuracyPromise = () => {
  const sample = SHOP.slider[0];
  return (
    <div className="grid items-center gap-10 rounded-3xl border border-app-line bg-app-panel p-6 sm:p-10 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <ShieldCheck aria-hidden className="h-8 w-8 text-app-accent" />
        <h3 className="font-serif text-[32px] font-medium leading-tight text-app-ink">If the clothes don’t match, we redo it free.</h3>
        <p className="text-[16px] leading-relaxed text-app-muted">
          You see each new photo next to your product photo. Check the color, print and length before you post. Tap “Doesn’t match product” and we make it again. You get two free redos per photo.
        </p>
        <ul className="mt-2 flex flex-col gap-2 text-[14px] text-app-ink">
          {SHOP.posting.map((tip) => <li key={tip} className="border-l-2 border-app-accent pl-3">{tip}</li>)}
        </ul>
      </div>
      {sample && (
        <div className="grid grid-cols-2 gap-3">
          {[{ src: sample.before, label: 'Your product photo' }, { src: sample.after, label: 'Next5 result' }].map((img) => (
            <figure key={img.src} className="flex flex-col gap-2">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-app-sunken ring-1 ring-black/5 dark:ring-white/10">
                <MarketingImage src={img.src} sizes="(min-width: 1024px) 22vw, 45vw" />
              </div>
              <figcaption className="label-caps text-center text-[10px] font-medium text-app-muted">{img.label}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
};
