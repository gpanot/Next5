export type Locale = 'en' | 'vi';

export type TranslationShape = {
  nav: { studios: string; howItWorks: string; faq: string };
  common: { createMyShoot: string };
  hero: {
    badge: string;
    headlineLine1: string;
    headlineLine2: string;
    headlineEm: string;
    subhead: string;
    sequence: string;
  };
  socialProof: { reviews: string; loved: string };
  routes: {
    title: string;
    subtitle: string;
    bannerFirstTime: string;
    bannerReturning: string;
    bannerOffer: (label: string, percent: number, count: number) => string;
    exploreStudio: string;
    meta: string;
    badgeIntro: string;
    badgeBundle: (percent: number) => string;
    badgeRepeat: (percent: number) => string;
  };
  proofStrip: { eyebrow: string; title: string; subtitle: string };
  reviews: { eyebrow: string; title: string };
  faq: { eyebrow: string; title: string; items: readonly { q: string; a: string }[] };
  paymentMethods: { label: string; privacyNote: string };
};

/**
 * Central dictionary for standalone marketing copy — section headings, the
 * new FAQ/reviews/proof/payment sections, and CTAs reused across the
 * homepage. Per-route content (studio titles, descriptions, scenes) and the
 * booking modal are not covered yet — English only there for now; extending
 * this dictionary to the modal is a natural follow-up, not a redesign.
 */
export const translations: Record<Locale, TranslationShape> = {
  en: {
    nav: { studios: 'Studios', howItWorks: 'How It Works', faq: 'FAQ' },
    common: {
      createMyShoot: 'See your first photo FREE',
    },
    hero: {
      badge: 'Professional photoshoot · Immediate delivery',
      headlineLine1: 'Your next 5',
      headlineLine2: 'Instagram photos.',
      headlineEm: 'Made for you.',
      subhead: 'No photographer. No travel. No stress.\nJust one selfie and we do the rest.',
      sequence: 'Upload a selfie → your first photo free → 149K VND for the rest',
    },
    socialProof: {
      reviews: '(230+ reviews)',
      loved: 'Loved by 200+ women in Saigon',
    },
    routes: {
      title: 'Choose your studio',
      subtitle: '5 personalized photos · Creative direction · Delivered within 30 minutes',
      bannerFirstTime: 'New here? Your first studio is 149,000 VND — a first-shoot offer, applied automatically',
      bannerReturning: 'Welcome back — every studio below is already 10% off for you',
      bannerOffer: (label: string, percent: number, count: number) =>
        `Your ${label} discount (-${percent}%) is active on ${count} studio${count === 1 ? '' : 's'} below`,
      exploreStudio: 'See Your First Photo Free',
      meta: '5 personalized photos · 30 min delivery',
      badgeIntro: 'First-shoot offer',
      badgeBundle: (percent: number) => `-${percent}% today`,
      badgeRepeat: (percent: number) => `-${percent}% for you`,
    },
    proofStrip: {
      eyebrow: 'Real Next5 studios',
      title: 'This is what she got',
      subtitle: 'One selfie in, five studio-directed photos out — every look, every time.',
    },
    reviews: {
      eyebrow: 'What women are saying',
      title: 'Loved across Saigon',
    },
    faq: {
      eyebrow: 'Before you upload',
      title: 'Questions, answered',
      items: [
        {
          q: 'Will it actually look like me?',
          a: "Yes — we build every shot from the selfie you upload, so it keeps your face, not a generic model's. Your free first preview is exactly so you can check this before paying for the rest.",
        },
        {
          q: 'What happens to my selfie after I upload it?',
          a: "It's used only to generate your shoot. We don't sell it, publish it, or use it to train anything beyond your own photos.",
        },
        {
          q: "What if I don't like my photos?",
          a: 'Your first shot is free to review before you pay anything. If something in the full set looks off after payment, message us and we\'ll make it right.',
        },
        {
          q: 'How long does delivery actually take?',
          a: 'Your first preview is ready in under a minute. The complete set of 5 is delivered to your email within 30 minutes of payment.',
        },
        {
          q: 'What payment methods do you accept?',
          a: 'Bank transfer QR today, with MoMo, VietQR, and ZaloPay coming online shortly.',
        },
      ],
    },
    paymentMethods: {
      label: 'Ways to pay',
      privacyNote: 'We use your selfie only to generate your photos, then delete it after delivery.',
    },
  },
  vi: {
    nav: { studios: 'Studio', howItWorks: 'Cách hoạt động', faq: 'Hỏi đáp' },
    common: {
      createMyShoot: 'Chọn studio của tôi',
    },
    hero: {
      badge: 'Chụp ảnh chuyên nghiệp · Giao ngay',
      headlineLine1: '5 ảnh Instagram',
      headlineLine2: 'tiếp theo của bạn.',
      headlineEm: 'Dành riêng cho bạn.',
      subhead: 'Chọn studio, cho chúng tôi biết phong cách bạn muốn, và nhận ảnh ngay hôm nay.',
      sequence: 'Tải ảnh selfie → xem ảnh đầu tiên miễn phí → 149K VND cho 4 ảnh còn lại',
    },
    socialProof: {
      reviews: '(230+ đánh giá)',
      loved: 'Được 200+ phụ nữ tại Sài Gòn yêu thích',
    },
    routes: {
      title: 'Chọn studio của bạn',
      subtitle: '5 ảnh cá nhân hóa · Có định hướng sáng tạo · Giao trong 30 phút',
      bannerFirstTime: 'Lần đầu đến đây? Studio đầu tiên chỉ 149.000 VND — ưu đãi buổi chụp đầu tiên, tự động áp dụng',
      bannerReturning: 'Chào mừng trở lại — mọi studio dưới đây đã được giảm 10% dành riêng cho bạn',
      bannerOffer: (label: string, percent: number, count: number) =>
        `Ưu đãi ${label} (-${percent}%) của bạn đang áp dụng cho ${count} studio bên dưới`,
      exploreStudio: 'Xem ảnh đầu tiên miễn phí',
      meta: '5 ảnh cá nhân hóa · Giao trong 30 phút',
      badgeIntro: 'Ưu đãi buổi đầu',
      badgeBundle: (percent: number) => `-${percent}% hôm nay`,
      badgeRepeat: (percent: number) => `-${percent}% dành cho bạn`,
    },
    proofStrip: {
      eyebrow: 'Studio Next5 thực tế',
      title: 'Đây là kết quả cô ấy nhận được',
      subtitle: 'Một ảnh selfie đưa vào, năm bức ảnh được đạo diễn sáng tạo trả về — mỗi phong cách, mỗi lần.',
    },
    reviews: {
      eyebrow: 'Mọi người đang nói gì',
      title: 'Được yêu thích khắp Sài Gòn',
    },
    faq: {
      eyebrow: 'Trước khi bạn tải ảnh lên',
      title: 'Câu hỏi thường gặp',
      items: [
        {
          q: 'Ảnh có thực sự giống tôi không?',
          a: 'Có — mỗi bức ảnh được dựng từ chính ảnh selfie bạn tải lên, nên vẫn giữ gương mặt của bạn, không phải một người mẫu chung chung. Ảnh xem trước miễn phí đầu tiên chính là để bạn kiểm tra điều này trước khi trả tiền cho phần còn lại.',
        },
        {
          q: 'Ảnh selfie của tôi sẽ được xử lý ra sao sau khi tải lên?',
          a: 'Ảnh chỉ được dùng để tạo bộ ảnh của bạn. Chúng tôi không bán, không công khai, và không dùng để huấn luyện bất cứ điều gì ngoài ảnh của chính bạn.',
        },
        {
          q: 'Nếu tôi không thích ảnh thì sao?',
          a: 'Bạn được xem miễn phí bức ảnh đầu tiên trước khi thanh toán bất cứ khoản nào. Nếu ảnh trong bộ đầy đủ có vấn đề sau khi thanh toán, hãy nhắn cho chúng tôi để được hỗ trợ.',
        },
        {
          q: 'Thời gian giao ảnh thực tế là bao lâu?',
          a: 'Ảnh xem trước đầu tiên sẵn sàng trong chưa đầy một phút. Bộ đầy đủ 5 ảnh được gửi vào email của bạn trong vòng 30 phút sau khi thanh toán.',
        },
        {
          q: 'Bạn nhận thanh toán qua những hình thức nào?',
          a: 'Hiện tại là chuyển khoản qua mã QR, MoMo, VietQR và ZaloPay sẽ sớm được hỗ trợ.',
        },
      ],
    },
    paymentMethods: {
      label: 'Hình thức thanh toán',
      privacyNote: 'Ảnh selfie của bạn chỉ được dùng để tạo ảnh và sẽ được xoá sau khi giao.',
    },
  },
};
