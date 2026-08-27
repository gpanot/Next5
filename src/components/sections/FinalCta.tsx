import { avatarSources } from '../../data/site';
import { AvatarStack } from '../ui/AvatarStack';
import { ButtonLink } from '../ui/Button';
import { PolaroidStack } from './PolaroidStack';

export const FinalCta = () => (
  <section className="bg-page py-14 sm:py-16">
    <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
      <div className="flex flex-col items-center gap-10 rounded-2xl bg-ink-block px-6 py-12 text-center sm:px-10 lg:flex-row lg:gap-14 lg:px-14 lg:py-12 lg:text-left">
        <PolaroidStack />

        <div className="lg:pl-2">
          <h2 className="font-serif text-[30px] leading-[1.15] font-light text-on-dark sm:text-[36px] lg:text-[40px]">
            Ready for your next 5 Instagram photos?
          </h2>
          <p className="mt-3 text-[14px] text-on-dark-muted sm:text-[15px]">
            Spots, timing, photographer – all planned for you.
          </p>

          <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
            <ButtonLink href="#routes" size="lg" withArrow>
              Book your route now
            </ButtonLink>

            <div className="flex items-center gap-3">
              <AvatarStack sources={avatarSources.slice(0, 4)} size="sm" ringClassName="ring-ink-block" />
              <p className="text-left text-[11.5px] leading-[1.45] text-on-dark-muted">
                Join 200+ women
                <br />
                creating unforgettable memories
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
