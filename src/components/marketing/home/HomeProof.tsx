import { Check } from 'lucide-react';
import { HOME_PROOF } from '../../../content/business/home';
import { OFFER } from '../../../content/business/offer';
import { CtaLink } from '../shared/CtaLink';
import { BeforeAfterSlider } from '../shop/BeforeAfterSlider';

const KitLine = ({ label, text, accent = false }: { label: string; text: string; accent?: boolean }) => (
  <div className="flex flex-col gap-0.5">
    <p className="label-caps text-[10px] font-medium text-app-muted">{label}</p>
    <p className={`whitespace-pre-line text-[14px] leading-snug ${accent ? 'text-app-accent' : 'text-app-ink'}`}>{text}</p>
  </div>
);

/** The words that come with the dress photo: hook, description, hashtags. Marked as an example. */
const KitSnippet = () => {
  const post = OFFER.shop.example;
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-app-panel p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <div>
        <p className="flex items-center justify-between gap-2 text-[15px] font-semibold text-app-ink">
          {HOME_PROOF.kit.title}
          <span className="label-caps rounded-full bg-app-sunken px-2 py-0.5 text-[9px] font-medium text-app-muted">{HOME_PROOF.kit.example}</span>
        </p>
        <p className="text-[14px] text-app-muted">{HOME_PROOF.kit.sub}</p>
      </div>
      <KitLine label="Hook" text={post.hook} />
      {post.description && <KitLine label="Description" text={post.description} />}
      <KitLine label="Hashtags" text={post.hashtags.join(' ')} accent />
    </div>
  );
};

/** Proof before promises: the real before/after slider, three plain claims and the words written for it. */
export const HomeProof = () => (
  <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
    <div className="order-2 flex flex-col gap-5 lg:order-1">
      <ul className="flex flex-col gap-3">
        {HOME_PROOF.points.map((point) => (
          <li key={point} className="flex gap-3 text-[18px] text-app-ink">
            <Check aria-hidden className="mt-1 h-5 w-5 shrink-0 text-app-accent" />
            {point}
          </li>
        ))}
      </ul>
      <KitSnippet />
      <div className="flex flex-col items-start gap-2">
        <CtaLink href="/start/shop">{HOME_PROOF.cta}</CtaLink>
        <p className="text-[13px] text-app-muted">No card needed.</p>
      </div>
    </div>
    <div className="order-1 mx-auto w-full max-w-md lg:order-2">
      <BeforeAfterSlider />
    </div>
  </div>
);
