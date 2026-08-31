import Image from 'next/image';

function ShieldCheckIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M24 4L8 10v14c0 10 7.2 18.4 16 20 8.8-1.6 16-10 16-20V10L24 4z"
        stroke="#c9a96e"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M16 24l5.5 5.5 10-10"
        stroke="#c9a96e"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const LooksLikeYouGuarantee = () => {
  return (
    <section aria-label="The Looks-Like-You Guarantee" className="mx-auto max-w-[1240px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <div className="relative overflow-hidden rounded-2xl bg-[#111010]">
        {/* Content */}
        <div className="relative z-10 flex flex-col gap-6 px-7 py-8 sm:px-10 sm:py-10 md:flex-row md:gap-10 md:px-0 md:py-0 lg:gap-14">
          {/* Left: icon + text */}
          <div className="flex flex-col justify-center gap-4 md:flex-1 md:py-10 md:pl-10 lg:py-12 lg:pl-12">
            <ShieldCheckIcon />

            <div>
              <h2 className="font-serif text-[24px] font-light leading-tight text-white sm:text-[28px] lg:text-[30px]">
                The Looks-Like-You Guarantee
              </h2>

              <p className="mt-3 text-[14px] leading-relaxed text-white/75 sm:text-[14.5px]">
                If your preview doesn&apos;t look like you, don&apos;t pay.
                <br />
                If your paid set misses the mark, we remake it once for free —
                <br />
                and if you still don&apos;t love it, you get your money back.
              </p>
            </div>
          </div>

          {/* Right: editorial photo — hidden on small mobile, full-bleed edge-to-edge from md+ */}
          <div className="hidden md:block md:w-[40%] lg:w-[38%] xl:w-[36%]">
            <div className="relative h-full w-full">
              {/* Fade gradient over the left edge so the image blends into the dark bg */}
              <div
                className="absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#111010] to-transparent"
                aria-hidden="true"
              />
              <Image
                src="/images/routes/luxury-saigon/shot-2.jpg"
                alt="Studio result — woman portrait"
                fill
                className="object-cover object-center"
                sizes="(min-width: 1024px) 38vw, 60vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
