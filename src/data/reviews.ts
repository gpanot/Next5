export type Review = {
  name: string;
  studio: string;
  avatar: string;
  quote: { en: string; vi: string };
};

/**
 * PLACEHOLDER CONTENT — fabricated to preview the section's design, not real
 * customer reviews. Swap for actual testimonials before shipping to real
 * visitors; leaving these live would misrepresent the product.
 */
export const reviews: readonly Review[] = [
  {
    name: 'Mai T.',
    studio: 'Golden Saigon',
    avatar: '/images/avatars/review-avatar-1.png',
    quote: {
      en: "I uploaded one selfie on my lunch break and got back photos that actually look like a real shoot. My friends kept asking which studio I booked.",
      vi: 'Mình tải một ảnh selfie lúc nghỉ trưa mà nhận lại ảnh như chụp studio thật. Bạn bè cứ hỏi mình đặt studio nào.',
    },
  },
  {
    name: 'Trang N.',
    studio: 'Soft Girl Saigon',
    avatar: '/images/avatars/review-avatar-2.png',
    quote: {
      en: 'The free preview sold me. I saw exactly how I\'d look before paying anything, zero risk, and the full set arrived in under 3 hours.',
      vi: 'Ảnh xem trước miễn phí thuyết phục mình ngay vì thấy rõ mình sẽ trông thế nào trước khi trả tiền. Không rủi ro, và bộ ảnh đầy đủ về trong chưa tới 3 tiếng.',
    },
  },
  {
    name: 'Linh P.',
    studio: 'Luxury Saigon',
    avatar: '/images/avatars/review-avatar-3.png',
    quote: {
      en: "Better lighting and posing than my last paid photographer, honestly. And I didn't have to leave my apartment.",
      vi: 'Ánh sáng và dáng chụp còn đẹp hơn lần mình thuê thợ ảnh trước đây. Mà mình còn không cần ra khỏi nhà.',
    },
  },
  {
    name: 'Anh D.',
    studio: 'Night Out',
    avatar: '/images/avatars/review-avatar-4.png',
    quote: {
      en: "Was skeptical an AI photo could look like me and not some generic model. It kept my face, my vibe, just styled way better.",
      vi: 'Ban đầu mình hơi nghi ngại vì sợ ảnh AI trông như người mẫu chung chung. Nhưng ảnh vẫn giữ đúng gương mặt, thần thái của mình, chỉ là được lên đồ đẹp hơn nhiều.',
    },
  },
  {
    name: 'Ha V.',
    studio: 'Outfit Shoot',
    avatar: '/images/avatars/review-avatar-5.png',
    quote: {
      en: "Booked the collection after my first studio. Five unique looks and I only had to take one selfie.",
      vi: 'Mình đặt trọn bộ sưu tập sau studio đầu tiên. Năm phong cách hoàn toàn khác nhau mà chỉ cần chụp một ảnh selfie.',
    },
  },
];
