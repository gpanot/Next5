'use client';

import { avatarSources } from '../../data/site';
import { useLocale } from '../../i18n/LocaleContext';
import { AvatarStack } from '../ui/AvatarStack';
import { ButtonLink } from '../ui/Button';
import { PolaroidStack } from './PolaroidStack';

const copy = {
  en: {
    headline: 'Ready for your next 5 Instagram photos?',
    subline: 'Choose your studio, upload your photo, get your personalized shoot today.',
    joinLine: ['Join hundreds of women', 'who got their perfect photos'],
  },
  vi: {
    headline: 'Sẵn sàng cho 5 ảnh Instagram tiếp theo?',
    subline: 'Chọn studio, tải ảnh lên, và nhận bộ ảnh cá nhân hóa ngay hôm nay.',
    joinLine: ['Cùng hàng trăm phụ nữ', 'đã có bộ ảnh hoàn hảo của mình'],
  },
};

export const FinalCta = () => {
  const { locale, t } = useLocale();
  const c = copy[locale];

  return (
    <section className="bg-page py-14 sm:py-16">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col items-center gap-10 rounded-2xl bg-ink-block px-6 py-12 text-center sm:px-10 lg:flex-row lg:gap-14 lg:px-14 lg:py-12 lg:text-left">
          <PolaroidStack />

          <div className="lg:pl-2">
            <h2 className="font-serif text-[30px] leading-[1.15] font-light text-on-dark sm:text-[36px] lg:text-[40px]">
              {c.headline}
            </h2>
            <p className="mt-3 text-[14px] text-on-dark-muted sm:text-[15px]">{c.subline}</p>

            <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
              <ButtonLink href="#routes" size="lg" withArrow>
                {t.common.createMyShoot}
              </ButtonLink>

              <div className="flex items-center gap-3">
                <AvatarStack sources={avatarSources.slice(0, 4)} size="sm" ringClassName="ring-ink-block" />
                <p className="text-left text-[11.5px] leading-[1.45] text-on-dark-muted">
                  {c.joinLine[0]}
                  <br />
                  {c.joinLine[1]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
