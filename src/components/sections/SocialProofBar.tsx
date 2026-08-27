import { avatarSources } from '../../data/site';
import { AvatarStack } from '../ui/AvatarStack';
import { StarIcon } from '../ui/Icons';

export const SocialProofBar = () => (
  <div className="border-y border-line bg-cream">
    <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-center gap-4 px-5 py-5 text-center sm:flex-row sm:gap-8 sm:px-8">
      <div className="flex items-center gap-2.5">
        <span className="flex gap-0.5 text-ink" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <StarIcon key={index} className="h-3.5 w-3.5" />
          ))}
        </span>
        <span className="text-[13px] font-medium text-ink">4.9</span>
        <span className="text-[13px] text-muted">(230+ reviews)</span>
      </div>

      <div className="flex items-center gap-3.5">
        <AvatarStack sources={avatarSources} size="md" ringClassName="ring-cream" />
        <p className="text-[13px] text-muted">
          Loved by 200+ women in Saigon <span aria-hidden="true">🧡</span>
        </p>
      </div>
    </div>
  </div>
);
