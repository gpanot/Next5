'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import { CropIcon, EyeIcon, FaceIcon, HeartIcon, SunIcon } from '../ui/Icons';
import { PostConfidenceGallery, type Platform } from './PostConfidenceGallery';
import { PostConfidencePhone } from './PostConfidencePhone';

const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'facebook'];
const AUTO_CYCLE_MS = 3000;
const PAUSE_AFTER_MANUAL_MS = 9000;

const criteriaIcons = [FaceIcon, SunIcon, CropIcon, HeartIcon, EyeIcon] as const;
/* fill values map → display scores: 0.92→92, 0.88→88, etc.
   Reference shows: Face 94, Lighting 96, Composition 92, Vibe 93, Scroll 90 */
const criteriaFills = [0.94, 0.96, 0.92, 0.93, 0.90] as const;

const copy = {
  en: {
    eyebrow: 'Next5 Post Confidence™',
    comingSoon: 'Coming soon',
    headlinePre: 'Know your best shot before you ',
    headlineEm: 'post.',
    supporting: 'Not every photo deserves a post. We help you find the one that does.',
    criteriaLabels: ['Face Presence', 'Lighting', 'Composition', 'Vibe Match', 'Scroll-Stopping'],
    emotionalKicker: "Stop wondering if it\u2019s good enough.",
    emotionalMain: 'Know which photo to post with confidence.',
    emotionalSupport:
      'Next5 looks at what makes a photo feel strong, natural and attention-worthy — then picks your best one.',
    link: 'See how it works',
    platforms: { instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook' } as Record<Platform, string>,
    pickLabel: {
      instagram: 'Our pick for Instagram',
      tiktok: 'Strongest scroll-stopper',
      facebook: 'Best for your profile',
    } as Record<Platform, string>,
    excellentChoice: 'Excellent Choice',
    phoneEyebrow: 'Post Confidence',
    phoneOutOf: '/ 100',
    phoneWhyTitle: 'Why this photo works',
    phoneWhyBody:
      'Strong eye contact, warm lighting and a clean background make this your strongest shot.',
    benefits: [
      {
        title: 'Made for the platforms',
        body: 'Each score is optimized for Instagram, Facebook and TikTok.',
      },
      {
        title: 'Designed to stand out',
        body: 'We focus on what makes people stop, look and engage.',
      },
      {
        title: 'Pick your winner',
        body: 'We highlight your strongest shot — so posting is easy.',
      },
    ],
  },
  vi: {
    eyebrow: 'Next5 Post Confidence™',
    comingSoon: 'Sắp ra mắt',
    headlinePre: 'Biết bức ảnh đẹp nhất trước khi bạn ',
    headlineEm: 'đăng.',
    supporting: 'Không phải bức ảnh nào cũng đáng đăng. Chúng tôi giúp bạn tìm ra bức ảnh đó.',
    criteriaLabels: ['Gương mặt', 'Ánh sáng', 'Bố cục', 'Đúng vibe', 'Gây chú ý'],
    emotionalKicker: 'Đừng băn khoăn liệu ảnh đã đủ đẹp.',
    emotionalMain: 'Biết chắc bức ảnh nào nên đăng.',
    emotionalSupport:
      'Next5 xem xét những yếu tố khiến một bức ảnh nổi bật, tự nhiên và thu hút — rồi chọn ra bức ảnh đẹp nhất cho bạn.',
    link: 'Xem cách hoạt động',
    platforms: { instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook' } as Record<Platform, string>,
    pickLabel: {
      instagram: 'Lựa chọn hàng đầu cho Instagram',
      tiktok: 'Gây chú ý mạnh nhất',
      facebook: 'Phù hợp nhất cho trang cá nhân',
    } as Record<Platform, string>,
    excellentChoice: 'Lựa chọn xuất sắc',
    phoneEyebrow: 'Độ tự tin khi đăng',
    phoneOutOf: '/ 100',
    phoneWhyTitle: 'Vì sao ảnh này nổi bật',
    phoneWhyBody:
      'Ánh mắt cuốn hút, ánh sáng ấm và phông nền gọn gàng khiến đây là bức ảnh mạnh nhất của bạn.',
    benefits: [
      {
        title: 'Tối ưu cho nền tảng',
        body: 'Mỗi điểm số được tối ưu cho Instagram, Facebook và TikTok.',
      },
      {
        title: 'Thiết kế để nổi bật',
        body: 'Chúng tôi tập trung vào điều khiến người ta dừng lại và tương tác.',
      },
      {
        title: 'Chọn ảnh tốt nhất',
        body: 'Chúng tôi làm nổi bật bức ảnh mạnh nhất của bạn — để đăng thật dễ dàng.',
      },
    ],
  },
} as const;

/* Circular gold icon badges for the three benefits */
const BenefitIconTargetSvg = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const BenefitIconSparkle = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3.5c.6 3.9 1.9 5.3 5.8 5.9-3.9.6-5.2 2-5.8 5.9-.6-3.9-1.9-5.3-5.8-5.9 3.9-.6 5.2-2 5.8-5.9Z" />
    <path d="M18.5 15.5c.3 1.7.9 2.3 2.6 2.6-1.7.3-2.3.9-2.6 2.6-.3-1.7-.9-2.3-2.6-2.6 1.7-.3 2.3-.9 2.6-2.6Z" />
  </svg>
);

const BenefitIconCrown = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold" fill="currentColor" aria-hidden="true">
    <path d="M4 17.5h16l-1.4-8.8-4.3 3.5L12 5.8 9.7 12.2l-4.3-3.5Z" />
    <rect x="4" y="18.3" width="16" height="1.9" rx="0.6" />
  </svg>
);

const benefitSvgIcons = [BenefitIconTargetSvg, BenefitIconSparkle, BenefitIconCrown] as const;

export const PostConfidence = () => {
  const { locale } = useLocale();
  const c = copy[locale];
  const [platform, setPlatform] = useState<Platform>('instagram');
  const pauseUntilRef = useRef<number>(0);

  // Auto-cycle every 3s; pauses for 9s after a manual tap
  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      setPlatform((prev) => {
        const idx = PLATFORMS.indexOf(prev);
        return PLATFORMS[(idx + 1) % PLATFORMS.length];
      });
    }, AUTO_CYCLE_MS);
    return () => clearInterval(timer);
  }, []);

  const handleManualPlatformChange = (p: Platform) => {
    pauseUntilRef.current = Date.now() + PAUSE_AFTER_MANUAL_MS;
    setPlatform(p);
  };

  const criteria = c.criteriaLabels.map((label, index) => ({
    icon: criteriaIcons[index],
    label,
    fill: criteriaFills[index],
  }));

  /* ── Shared sub-components ── */

  const leftCopyTop = (mobile = false) => (
    <>
      {/* Eyebrow */}
      <div className={`flex flex-wrap items-center gap-3 ${mobile ? 'justify-center' : ''}`}>
        <p className="label-caps text-[10px] font-medium text-accent-strong">{c.eyebrow}</p>
        <span className="label-caps rounded-full border border-line bg-surface px-2.5 py-1 text-[8.5px] font-medium text-muted">
          {c.comingSoon}
        </span>
      </div>

      {/* Headline */}
      <h2 className={`mt-4 font-serif font-normal text-ink ${mobile ? 'text-[28px] sm:text-[34px] text-center' : 'text-[46px] xl:text-[52px]'} leading-[1.1]`}>
        {c.headlinePre}
        <span className="text-gold italic">{c.headlineEm}</span>
      </h2>

      {/* Supporting copy */}
      <p className={`mt-4 text-[13.5px] leading-relaxed text-muted sm:text-[14px] ${mobile ? 'text-center max-w-sm mx-auto' : 'max-w-sm'}`}>
        {c.supporting}
      </p>

      {/* Criteria icon row */}
      <div className={`mt-6 flex flex-wrap gap-x-6 gap-y-4 ${mobile ? 'justify-center' : ''}`}>
        {criteria.map(({ icon: Icon, label }) => (
          <div key={label} className="flex w-16 flex-col items-center gap-2 text-center">
            <Icon className="h-6 w-6 text-accent-strong" strokeWidth={1.2} />
            <span className="label-caps text-[9.5px] leading-tight text-muted">{label}</span>
          </div>
        ))}
      </div>
    </>
  );

  const leftCopyBottom = (mobile = false) => (
    <>
      {/* Thin divider */}
      <div className={`border-t border-line ${mobile ? 'mt-8 w-full' : 'mt-8'}`} />

      {/* Emotional kicker */}
      <div className="mt-6">
        <p className="label-caps text-[10px] font-medium text-accent-strong">{c.emotionalKicker}</p>
        <p className={`mt-2 font-serif leading-snug text-ink ${mobile ? 'text-[22px] text-center' : 'text-[22px]'}`}>
          {c.emotionalMain}
        </p>
        <p className={`mt-3 text-[12.5px] leading-relaxed text-muted ${mobile ? 'text-center max-w-sm mx-auto' : 'max-w-[300px]'}`}>
          {c.emotionalSupport}
        </p>
      </div>

    </>
  );

  const phoneAndBenefitsEl = (
    <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:gap-8 lg:gap-10">
      {/* Phone */}
      <div className="shrink-0">
        <PostConfidencePhone className="max-w-[286px]" />
      </div>

      {/* Three benefit statements */}
      <div className="flex flex-col justify-center gap-5 pt-2">
        {c.benefits.map(({ title, body }, i) => {
          const Icon = benefitSvgIcons[i];
          return (
            <div key={title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface shadow-sm">
                <Icon />
              </span>
              <div>
                <p className="label-caps text-[9.5px] font-medium text-ink">{title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <section className="overflow-hidden bg-cream py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">

        {/* ─── DESKTOP LAYOUT ───────────────────────────────────────────────── */}
        <div className="hidden lg:block">
          {/* Top row: left copy (top portion) + right gallery — vertically centred */}
          <div className="grid grid-cols-[40%_60%] items-center gap-x-10">
            <div className="flex flex-col items-start text-left">
              {leftCopyTop()}
            </div>
            <div>
              <PostConfidenceGallery
                platform={platform}
                onPlatformChange={handleManualPlatformChange}
                pickLabel={c.pickLabel[platform]}
                platforms={c.platforms}
                excellentChoice={c.excellentChoice}
              />
            </div>
          </div>

          {/* Bottom row: left copy (bottom portion) + phone + benefits */}
          <div className="mt-0 grid grid-cols-[40%_60%] gap-x-10">
            <div className="flex flex-col items-start text-left">
              {leftCopyBottom()}
            </div>
            <div className="pt-6">{phoneAndBenefitsEl}</div>
          </div>
        </div>

        {/* ─── MOBILE LAYOUT ────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center lg:hidden">
          {leftCopyTop(true)}

          {/* Gallery + platform selector */}
          <div className="mt-10 w-full">
            <PostConfidenceGallery
              platform={platform}
              onPlatformChange={handleManualPlatformChange}
              pickLabel={c.pickLabel[platform]}
              platforms={c.platforms}
              excellentChoice={c.excellentChoice}
            />
          </div>

          {leftCopyBottom(true)}

          {/* Phone + benefits */}
          <div className="mt-10 w-full">{phoneAndBenefitsEl}</div>
        </div>

      </div>
    </section>
  );
};
