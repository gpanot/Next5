/**
 * Phase 0A — 18 viral templates extracted from 140 TikTok source videos.
 * Used in the Researcher widget to suggest the best template match for each result.
 */

export type Phase0ATemplate = {
  id: number;
  name: string;
  pillar: string;
  pillarColor: string; // Tailwind bg class for pill
  hookPattern: string;
  structure: string[];
  keyVars: string[];
  /** Keywords that appear in the hook text of videos using this template. */
  keywords: string[];
  /**
   * Example slide content for each slide (fill [BRACKETS] with client specifics).
   * Each entry has the slide text AND a per-slide recommended 9:16 background prompt.
   * 3–4 slides that follow the structure exactly.
   */
  suggestedSlides: Array<{ text: string; bgPrompt: string }>;
  /**
   * @deprecated Use suggestedSlides[0].bgPrompt for a global fallback.
   * Kept for backwards compat. Equals suggestedSlides[0].bgPrompt.
   */
  bgPrompt: string;
};

export const PHASE0A_TEMPLATES: Phase0ATemplate[] = [
  {
    id: 1,
    name: 'N Red Flags',
    pillar: 'Protection / Warning',
    pillarColor: 'bg-red-100 text-red-700',
    hookPattern: '[N] red flags your [SERVICE_PROVIDER] is [NEGATIVE_BEHAVIOR] 🚩',
    structure: ['Hook: numbered red flags', 'Each flag with brief explanation', 'Contrast pivot: "At [BIZ], we [COUNTER]"', 'CTA'],
    keyVars: ['N', 'SERVICE_PROVIDER', 'NEGATIVE_BEHAVIOR', 'RED_FLAG_1..N', 'BUSINESS_NAME', 'CTA'],
    keywords: ['red flag', 'warning', 'scam', 'ripping you off', 'rip you off', 'scamming', 'overcharging', 'dishonest', 'shady'],
    suggestedSlides: [
      { text: '5 red flags your [SERVICE_PROVIDER] is overcharging you 🚩', bgPrompt: 'Dramatic close-up of a red warning flag on dark background, cinematic studio lighting, bold and striking, 9:16 vertical professional photo, no text' },
      { text: 'Red flag #1: Vague quotes with no itemised breakdown', bgPrompt: 'Blurred invoice document on a dark desk, selective focus, moody office lighting, 9:16 vertical editorial photo, no text' },
      { text: 'Red flag #3: They pressure you to decide on the spot', bgPrompt: 'Tense business handshake with warning connotation, dark dramatic lighting, cinematic 9:16 vertical, no text' },
      { text: 'At [BUSINESS_NAME] we always explain every cost upfront — book your free consult', bgPrompt: 'Friendly professional at desk handing over a clear printed quote, warm natural office light, trustworthy atmosphere, 9:16 vertical, no text' },
    ],
    bgPrompt: 'Dramatic close-up of a red warning flag on dark background, cinematic studio lighting, bold and striking, 9:16 vertical professional photo, no text',
  },
  {
    id: 2,
    name: 'The Insider Reveal',
    pillar: 'Education / Authority',
    pillarColor: 'bg-blue-100 text-blue-700',
    hookPattern: 'X% of [AUDIENCE] don\'t know this / "How long did it take you to discover [FACT]?"',
    structure: ['Curiosity-gap hook', 'The reveal (build tension)', 'Why it matters', 'Optional: "At [BIZ] we [APPLICATION]"', 'CTA'],
    keyVars: ['HOOK_STYLE', 'AUDIENCE', 'PRODUCT_SERVICE', 'THE_FACT', 'WHY_IT_MATTERS', 'CTA'],
    keywords: ["don't know", 'discover', 'secret', 'insider', 'most people', 'nobody tells you', 'hidden', 'unknown', 'feature'],
    suggestedSlides: [
      { text: 'Most [CUSTOMERS] have no idea about this with [SERVICE]…', bgPrompt: 'Close-up of a confident professional in smart attire looking directly at camera with slight smirk, dark bokeh background, cinematic portrait lighting, 9:16 vertical, no text' },
      { text: 'The secret the big companies don\'t want you to know', bgPrompt: 'Shadowy vault door slightly ajar with golden light spilling out, mystery and intrigue, cinematic 9:16 vertical, no text' },
      { text: 'Here\'s how to use this to your advantage right now', bgPrompt: 'Person pointing at camera with excited knowing expression, bright studio light, energetic, 9:16 vertical editorial photo, no text' },
      { text: 'Follow for more insider tips → book with [BUSINESS_NAME] via link in bio', bgPrompt: 'Bold gradient background from deep navy to orange, clean branded CTA feel, professional, 9:16 vertical, no text' },
    ],
    bgPrompt: 'Close-up of a confident professional in smart attire looking directly at camera with slight smirk, dark bokeh background, cinematic portrait lighting, 9:16 vertical, no text',
  },
  {
    id: 3,
    name: 'N Tips from a Pro',
    pillar: 'Education / Authority',
    pillarColor: 'bg-blue-100 text-blue-700',
    hookPattern: '[N] tips from a [PROFESSION] (stick around for the bonus)',
    structure: ['Hook: "N tips from a [pro]"', 'Tip 1, 2, 3', 'Bonus tip teaser → reveal', 'CTA: Follow / Book'],
    keyVars: ['N', 'PROFESSION', 'TIP_1..N', 'TIP_BONUS', 'SERVICE', 'CTA'],
    keywords: ['tips', 'tricks', 'advice', 'hacks', 'things to know', 'learnt', 'learned', 'pro tip'],
    suggestedSlides: [
      { text: '[N] tips from a licensed [PROFESSION] 🫡', bgPrompt: 'Professional trade worker in uniform at a clean worksite, natural daylight, confident pose, trustworthy and expert vibe, 9:16 vertical editorial photo, no text' },
      { text: 'Tip #1: [TIP_1]', bgPrompt: 'Close-up hands of a professional performing skilled work, tools visible, sharp focus, warm natural light, 9:16 vertical, no text' },
      { text: 'Tip #3: [TIP_3] — most people skip this', bgPrompt: 'Professional pointing at something important with knowing expression, clean workshop or office background, 9:16 vertical editorial photo, no text' },
      { text: 'Follow for more free advice → book [BUSINESS_NAME] today', bgPrompt: 'Professional in uniform smiling at camera, bright outdoor natural light, welcoming CTA feel, 9:16 vertical, no text' },
    ],
    bgPrompt: 'Professional trade worker in uniform at a clean worksite, natural daylight, confident pose, trustworthy and expert vibe, 9:16 vertical editorial photo, no text',
  },
  {
    id: 4,
    name: 'What We Actually Do',
    pillar: 'Business Showcase',
    pillarColor: 'bg-yellow-100 text-yellow-700',
    hookPattern: '"[BUSINESS_NAME] is just a [COMMON_MISCONCEPTION]" — Actually, here\'s what we do',
    structure: ['Misdirection hook (common misconception)', 'Reveal service list', 'CTA'],
    keyVars: ['BUSINESS_NAME', 'COMMON_MISCONCEPTION', 'SERVICE_LIST', 'CTA'],
    keywords: ['actually do', 'not just', 'more than', 'what we do', 'services', 'we also', 'did you know we'],
    suggestedSlides: [
      { text: 'People think [BUSINESS_NAME] just does [MISCONCEPTION]…', bgPrompt: 'Business owner standing confidently in front of branded vehicle or company equipment, natural outdoor lighting, professional and approachable, 9:16 vertical photo, no text' },
      { text: 'We also handle [SERVICE_2], [SERVICE_3], and [SERVICE_4]', bgPrompt: 'Split collage of four different service scenarios in one image, colorful and energetic, 9:16 vertical editorial, no text' },
      { text: 'One call — everything sorted, no need for multiple vendors', bgPrompt: 'Person on the phone looking relieved and confident, bright modern office background, 9:16 vertical photo, no text' },
      { text: 'DM us or tap the link to get a free quote today', bgPrompt: 'Smartphone with business contact page displayed, clean white marble surface, natural side lighting, 9:16 vertical, no text' },
    ],
    bgPrompt: 'Business owner standing confidently in front of branded vehicle or company equipment, natural outdoor lighting, professional and approachable, 9:16 vertical photo, no text',
  },
  {
    id: 5,
    name: 'If They Won\'t, We Will',
    pillar: 'Pain Point → CTA',
    pillarColor: 'bg-orange-100 text-orange-700',
    hookPattern: '"If they won\'t [BEHAVIOR], we will" / Competitor contrast → direct CTA',
    structure: ['One provocative contrast statement', 'Direct booking/contact CTA'],
    keyVars: ['COMPETITOR_BEHAVIOR', 'OUR_BEHAVIOR', 'CTA'],
    keywords: ["if they won't", 'we will', 'they refuse', 'tired of', 'unlike other', 'unlike most'],
    suggestedSlides: [
      { text: 'If they won\'t show you itemised pricing — we will ✅', bgPrompt: 'Bold clean composition with professional tools or equipment on stark white background, high contrast, action-oriented, 9:16 vertical photo, no text' },
      { text: 'If they won\'t give you a same-day response — we will', bgPrompt: 'Checkmark graphic overlaid on a professional work environment, confident and decisive mood, 9:16 vertical, no text' },
      { text: 'If they won\'t stand behind their work — we will', bgPrompt: 'Professional making a firm handshake pledge gesture, trustworthy expression, natural light, 9:16 vertical portrait, no text' },
      { text: 'Tired of the runaround? Book [BUSINESS_NAME] — link in bio', bgPrompt: 'Person smiling with phone in hand ready to book, energetic and accessible, bright modern setting, 9:16 vertical photo, no text' },
    ],
    bgPrompt: 'Bold clean composition with professional tools or equipment on stark white background, high contrast, action-oriented, 9:16 vertical photo, no text',
  },
  {
    id: 6,
    name: 'How to Vet a Pro',
    pillar: 'Social Proof / Trust',
    pillarColor: 'bg-green-100 text-green-700',
    hookPattern: 'N ways to know your [PRO] is [POSITIVE/NEGATIVE]',
    structure: ['Authority checklist hook', '"Here\'s how to tell a good one from a bad one"', 'Implicit: "We pass all of these"', 'CTA'],
    keyVars: ['N', 'PRO_TYPE', 'CRITERIA_1..N', 'BUSINESS_CONTRAST', 'CTA'],
    keywords: ['how to know', 'how to tell', 'ways to know', 'good mechanic', 'good electrician', 'checklist', 'signs of a good'],
    suggestedSlides: [
      { text: '[N] signs you\'re working with a truly great [PROFESSIONAL] ✅', bgPrompt: 'Professional holding a clipboard checklist in smart work attire, bright natural light, clean trustworthy aesthetic, 9:16 vertical editorial photo, no text' },
      { text: '✅ Sign #1: They explain every step before starting', bgPrompt: 'Professional talking through a plan with a client, both looking engaged, natural office lighting, 9:16 vertical photo, no text' },
      { text: '✅ Sign #3: They show you before & after evidence', bgPrompt: 'Before and after comparison photos side by side on a tablet screen, professional setting, 9:16 vertical editorial, no text' },
      { text: 'At [BUSINESS_NAME] we tick all these boxes — see our work, link in bio', bgPrompt: 'Professional in uniform smiling and giving thumbs up, bright outdoor light, clean branded feel, 9:16 vertical, no text' },
    ],
    bgPrompt: 'Professional holding a clipboard checklist in smart work attire, bright natural light, clean trustworthy aesthetic, 9:16 vertical editorial photo, no text',
  },
  {
    id: 7,
    name: 'POV: Red Flag Moment',
    pillar: 'Protection / Warning',
    pillarColor: 'bg-red-100 text-red-700',
    hookPattern: 'POV: [RED_FLAG_SCENARIO]',
    structure: ['POV title card', 'Show the moment', 'Brief explanation (1–2 lines)'],
    keyVars: ['RED_FLAG_SCENARIO', 'BRIEF_EXPLANATION'],
    keywords: ['pov', 'when they', 'point of view', 'this is when', 'red flag moment', 'claw hammer'],
    suggestedSlides: [
      { text: 'POV: Your [SERVICE_PROVIDER] just did this… 🚩', bgPrompt: 'First-person POV shot at a service encounter, dramatic perspective showing a concerning moment, moody cinematic lighting, 9:16 vertical photo, no text' },
      { text: 'They won\'t let you see the damaged part they\'re replacing', bgPrompt: 'Close-up of a hidden mechanical component in a dark workshop, shadowy and suspicious, 9:16 vertical, no text' },
      { text: 'This is how you know they\'re not being straight with you', bgPrompt: 'Person looking uncomfortable and suspicious in a service interaction, documentary realism, 9:16 vertical candid photo, no text' },
      { text: 'Don\'t let this happen — DM us for a free second opinion', bgPrompt: 'Friendly professional looking directly at camera with reassuring expression, clean bright background, 9:16 vertical portrait, no text' },
    ],
    bgPrompt: 'First-person POV shot at a service encounter, dramatic perspective showing a concerning moment, moody cinematic lighting, 9:16 vertical photo, no text',
  },
  {
    id: 8,
    name: 'DO NOT Do This',
    pillar: 'Protection / Warning',
    pillarColor: 'bg-red-100 text-red-700',
    hookPattern: 'STOP / NEVER / DO NOT [BEHAVIOR] — here\'s why',
    structure: ['Strong prohibition hook', 'Why it\'s harmful', 'What to do instead', 'CTA'],
    keyVars: ['FORBIDDEN_BEHAVIOR', 'REASON', 'BETTER_ALTERNATIVE', 'CTA'],
    keywords: ['stop', 'never', 'do not', "don't do", 'avoid', 'mistake', 'wrong', 'bad idea'],
    suggestedSlides: [
      { text: 'STOP doing this when hiring a [SERVICE_PROVIDER] ✋', bgPrompt: 'Hand making stop gesture on bold dark background, dramatic studio lighting, high-impact warning visual, 9:16 vertical photo, no text' },
      { text: 'Most people make this mistake — it costs them time & money', bgPrompt: 'Frustrated person clutching head realising a costly mistake, relatable emotional expression, natural light, 9:16 vertical, no text' },
      { text: 'Here\'s what to do instead (it takes less than 2 minutes)', bgPrompt: 'Person smiling and doing a quick action on phone, relieved and empowered, bright modern setting, 9:16 vertical, no text' },
      { text: 'We help [AUDIENCE] avoid this every day — book now, link in bio', bgPrompt: 'Professional in uniform against branded vehicle, confident and welcoming, sunny outdoor setting, 9:16 vertical, no text' },
    ],
    bgPrompt: 'Hand making stop gesture on bold dark background, dramatic studio lighting, high-impact warning visual, 9:16 vertical photo, no text',
  },
  {
    id: 9,
    name: 'Warehouse / Facility Tour',
    pillar: 'Business Showcase',
    pillarColor: 'bg-yellow-100 text-yellow-700',
    hookPattern: 'Come see our [FACILITY] — [SCALE_CLAIM]',
    structure: ['Wide-shot entry reveal', 'Walk through inventory sections', 'Product close-ups', 'Price/availability callout', 'CTA'],
    keyVars: ['FACILITY_TYPE', 'SCALE', 'PRODUCT_TYPE', 'LEAD_TIME', 'CTA'],
    keywords: ['tour', 'take you', 'visit', 'walkthrough', 'warehouse', 'factory', 'facility', 'inventory', 'behind the scenes'],
    suggestedSlides: [
      { text: 'Come inside our [FACILITY TYPE] in [CITY] 👀', bgPrompt: 'Wide-angle warehouse interior filled with neatly organised inventory, industrial overhead lighting, cinematic depth of field, impressive scale, 9:16 vertical photo, no text' },
      { text: 'We stock [PRODUCT/MATERIAL] ready for same-day pickup', bgPrompt: 'Forklift moving pallets in a large industrial warehouse, action and scale, dramatic overhead lighting, 9:16 vertical, no text' },
      { text: '[SCALE CLAIM] — built to serve [REGION] businesses fast', bgPrompt: 'Overhead shot of stacked pallets or bulk inventory, impressive organised scale, industrial aesthetic, 9:16 vertical, no text' },
      { text: 'Order today, collect tomorrow — tap the link to browse', bgPrompt: 'Truck being loaded at a loading dock, logistics in action, golden hour outdoor light, 9:16 vertical editorial photo, no text' },
    ],
    bgPrompt: 'Wide-angle warehouse interior filled with neatly organised inventory, industrial overhead lighting, cinematic depth of field, impressive scale, 9:16 vertical photo, no text',
  },
  {
    id: 10,
    name: 'Tired of [Pain]?',
    pillar: 'Pain Point → CTA',
    pillarColor: 'bg-orange-100 text-orange-700',
    hookPattern: '"Tired of [PAIN]? Here\'s the solution."',
    structure: ['Pain-point hook (buyer emotion first)', 'Brief solution reveal', 'Why we\'re different', 'Direct CTA'],
    keyVars: ['PAIN_POINT', 'SOLUTION', 'DIFFERENTIATOR', 'CTA'],
    keywords: ['tired of', 'frustrated', 'sick of', 'fed up', 'problem', 'struggle', 'pain', 'issue', 'annoyed'],
    suggestedSlides: [
      { text: 'Tired of [PAIN POINT] every time you need [SERVICE]?', bgPrompt: 'Person with frustrated expression looking at phone or problem, relatable emotional moment, natural candid lighting, 9:16 vertical photo, no text' },
      { text: 'Here\'s how we solved this for [CLIENT TYPE] last week', bgPrompt: 'Before-and-after side by side showing a resolved problem, clear transformation, clean photography, 9:16 vertical, no text' },
      { text: 'No more [PROBLEM] — we guarantee it or we fix it free', bgPrompt: 'Professional handshake or guarantee gesture, confident and trustworthy, bright clean professional setting, 9:16 vertical editorial photo, no text' },
      { text: 'Ready for a better experience? Book [BUSINESS_NAME] today', bgPrompt: 'Person with relieved expression after a problem is solved, warm natural light, emotional and relatable, 9:16 vertical photo, no text' },
    ],
    bgPrompt: 'Person with frustrated expression looking at phone or problem, relatable emotional moment, natural candid lighting, 9:16 vertical photo, no text',
  },
  {
    id: 11,
    name: '24-Hour Pledge',
    pillar: 'Pain Point → CTA',
    pillarColor: 'bg-orange-100 text-orange-700',
    hookPattern: '"[TIME_COMMITMENT] — that\'s our promise"',
    structure: ['Time commitment as hook', 'Remove friction / urgency statement', 'CTA'],
    keyVars: ['TIME_COMMITMENT', 'SERVICE', 'CTA'],
    keywords: ['24 hours', 'same day', 'fast', 'quick', 'next day', '48 hours', 'on time', 'emergency', 'urgent'],
    suggestedSlides: [
      { text: 'We respond within 24 hours. Every time. No exceptions. ⏱', bgPrompt: 'Close-up of a clock or timer with professional service context in background, bold clean composition, high contrast, 9:16 vertical photo, no text' },
      { text: 'No more waiting 3 days just to get a callback', bgPrompt: 'Person staring at phone waiting anxiously, time passing effect, moody relatable lighting, 9:16 vertical, no text' },
      { text: '[SERVICE] done right, done fast — that\'s [BUSINESS_NAME]', bgPrompt: 'Professional finishing a job confidently, action shot with motion blur suggesting speed, 9:16 vertical, no text' },
      { text: 'Book now — we\'ll reply by tomorrow morning, guaranteed', bgPrompt: 'Professional smiling at camera with phone or tablet, warm inviting atmosphere, modern office, 9:16 vertical photo, no text' },
    ],
    bgPrompt: 'Close-up of a clock or timer with professional service context in background, bold clean composition, high contrast, 9:16 vertical photo, no text',
  },
  {
    id: 12,
    name: 'Company Update',
    pillar: 'Behind the Business',
    pillarColor: 'bg-purple-100 text-purple-700',
    hookPattern: '"[INDUSTRY_NEWS] — here\'s where we stand"',
    structure: ['Industry news or change', '"Here\'s our status" + what it means for the buyer', 'Personal delivery essential'],
    keyVars: ['INDUSTRY_CHALLENGE', 'STATUS_MESSAGE', 'BUYER_IMPACT', 'CTA'],
    keywords: ['update', 'news', 'announcement', 'prices rising', 'supply chain', 'still', "we're back", 'reopening'],
    suggestedSlides: [
      { text: 'Important update for all [CITY/REGION] clients 📢', bgPrompt: 'Business owner speaking directly to camera in professional office or branded location, authoritative and transparent, natural light, 9:16 vertical photo, no text' },
      { text: '[INDUSTRY NEWS] — here\'s how this affects your [PROJECT/BUDGET]', bgPrompt: 'Newspaper or digital news headline on a desk with coffee, moody editorial lighting, 9:16 vertical, no text' },
      { text: 'Here\'s exactly what we\'re doing to protect you from the impact', bgPrompt: 'Professional at whiteboard or desk planning with a determined focused expression, bright office, 9:16 vertical photo, no text' },
      { text: 'Questions? Drop them below or DM us directly', bgPrompt: 'Phone with chat bubbles or comment notifications, modern and approachable, clean background, 9:16 vertical, no text' },
    ],
    bgPrompt: 'Business owner speaking directly to camera in professional office or branded location, authoritative and transparent, natural light, 9:16 vertical photo, no text',
  },
  {
    id: 13,
    name: 'Price Reveal',
    pillar: 'Business Showcase',
    pillarColor: 'bg-yellow-100 text-yellow-700',
    hookPattern: '"Here\'s what [PRODUCT/SERVICE] actually costs"',
    structure: ['Price as hook (number generates clicks)', 'Breakdown / what\'s included', 'Value comparison', 'CTA'],
    keyVars: ['PRICE', 'PRODUCT_SERVICE', 'INCLUSIONS', 'CTA'],
    keywords: ['price', 'cost', 'how much', 'rate', 'per ton', 'per meter', 'per job', 'quote', 'affordable'],
    suggestedSlides: [
      { text: 'Here\'s what [SERVICE/PRODUCT] actually costs in [CITY] 💰', bgPrompt: 'Clean invoice or price breakdown on a wooden desk with coffee cup, minimalist business aesthetic, warm natural lighting, 9:16 vertical photo, no text' },
      { text: 'For [PROJECT SIZE], most clients pay between $[X] and $[Y]', bgPrompt: 'Stack of money or price tags on a clean white surface, bold and clear, professional photo, 9:16 vertical, no text' },
      { text: 'What\'s included: [ITEM 1], [ITEM 2], and [ITEM 3]', bgPrompt: 'Checklist document on clipboard with pen, clear and professional, natural desk lighting, 9:16 vertical editorial photo, no text' },
      { text: 'Get your exact price — tap the link for a free no-obligation quote', bgPrompt: 'Person happily looking at phone after receiving a quote, relieved and satisfied expression, bright modern setting, 9:16 vertical, no text' },
    ],
    bgPrompt: 'Clean invoice or price breakdown on a wooden desk with coffee cup, minimalist business aesthetic, warm natural lighting, 9:16 vertical photo, no text',
  },
  {
    id: 14,
    name: 'N Things to Know Before Buying',
    pillar: 'Education / Authority',
    pillarColor: 'bg-blue-100 text-blue-700',
    hookPattern: '[N] things to know before you [BUY/HIRE/CONTRACT]',
    structure: ['Buyer\'s guide hook', 'Item list with brief explanations', '"We cover all of these" pivot', 'CTA'],
    keyVars: ['N', 'ACTION', 'ITEMS_1..N', 'BUSINESS_BRIDGE', 'CTA'],
    keywords: ['before you buy', 'before you hire', 'what to know', 'buyer guide', 'before choosing', 'before calling'],
    suggestedSlides: [
      { text: '[N] things to know BEFORE you hire a [SERVICE_PROVIDER]', bgPrompt: 'Open notepad with handwritten checklist on a clean wooden desk, pen nearby, bright airy natural light, 9:16 vertical editorial photo, no text' },
      { text: '#1: Always get a written quote — verbal ones are worthless', bgPrompt: 'Contract or quote document being signed on a professional desk, clear and important, 9:16 vertical photo, no text' },
      { text: '#3: Verify their licence & insurance (not just Google reviews)', bgPrompt: 'Official looking certificate or credential document on a clean surface, authoritative, 9:16 vertical editorial, no text' },
      { text: 'At [BUSINESS_NAME] we walk you through every point — book a free consult', bgPrompt: 'Professional and client sitting together reviewing documents, collaborative and trustworthy, warm office light, 9:16 vertical, no text' },
    ],
    bgPrompt: 'Open notepad with handwritten checklist on a clean wooden desk, pen nearby, bright airy natural light, 9:16 vertical editorial photo, no text',
  },
  {
    id: 15,
    name: 'Business Journey',
    pillar: 'Social Proof / Trust',
    pillarColor: 'bg-green-100 text-green-700',
    hookPattern: '"I started [BUSINESS_TYPE] because [ORIGIN_STORY]"',
    structure: ['Struggle → insight arc', '"Here\'s where we are now"', 'Trust / relatability close', 'Soft CTA'],
    keyVars: ['ORIGIN_STORY', 'STRUGGLE', 'INSIGHT', 'CURRENT_STATE', 'CTA'],
    keywords: ['started', 'journey', 'story', 'how i', 'began', 'years ago', 'founded', 'origin', 'built'],
    suggestedSlides: [
      { text: 'I started [BUSINESS] because [ORIGIN_STORY]…', bgPrompt: 'Business owner in authentic candid behind-the-scenes moment at work, natural documentary lighting, genuine and emotional atmosphere, 9:16 vertical photo, no text' },
      { text: 'It wasn\'t easy — [EARLY_STRUGGLE] nearly made me quit', bgPrompt: 'Person sitting alone in quiet workshop looking reflective, early morning light, honest and raw atmosphere, 9:16 vertical photo, no text' },
      { text: 'Now [CURRENT_STATE] — and it\'s because of clients like you', bgPrompt: 'Business owner standing proudly in front of thriving operation, warm golden light, genuine pride, 9:16 vertical portrait, no text' },
      { text: 'This is why I show up every day — DM me to hear the full story', bgPrompt: 'Candid close-up portrait of business owner with genuine warm smile, natural light, authentic and approachable, 9:16 vertical, no text' },
    ],
    bgPrompt: 'Business owner in authentic candid behind-the-scenes moment at work, natural documentary lighting, genuine and emotional atmosphere, 9:16 vertical photo, no text',
  },
  {
    id: 16,
    name: 'Meet the Team',
    pillar: 'Social Proof / Trust',
    pillarColor: 'bg-green-100 text-green-700',
    hookPattern: '"Meet the team behind [BUSINESS_NAME]"',
    structure: ['Hook: meet the people', 'Each person: name + years experience + specialty', 'Team photo / video montage', 'CTA'],
    keyVars: ['BUSINESS_NAME', 'TEAM_MEMBERS', 'CTA'],
    keywords: ['meet', 'team', 'staff', 'crew', 'family', 'our people', 'behind the business', 'who we are'],
    suggestedSlides: [
      { text: 'Meet the team behind [BUSINESS_NAME] 👋', bgPrompt: 'Group of smiling professionals in matching work uniforms in front of branded vehicle, sunny outdoor setting, genuine team energy, 9:16 vertical photo, no text' },
      { text: '[NAME] — [YEARS] years experience in [SPECIALTY]', bgPrompt: 'Individual professional portrait — person in uniform with tools of their trade, clean bright background, 9:16 vertical editorial portrait, no text' },
      { text: '[NAME_2] & [NAME_3] — the crew who gets it done right', bgPrompt: 'Two professionals working together on a job, teamwork and camaraderie, natural work environment, 9:16 vertical photo, no text' },
      { text: 'We\'re not just a business, we\'re a family. Book with us today.', bgPrompt: 'Full team gathered together, laughing and candid, genuine workplace community feel, outdoor natural light, 9:16 vertical, no text' },
    ],
    bgPrompt: 'Group of smiling professionals in matching work uniforms in front of branded vehicle, sunny outdoor setting, genuine team energy, 9:16 vertical photo, no text',
  },
  {
    id: 17,
    name: 'Day in the Life',
    pillar: 'Behind the Business',
    pillarColor: 'bg-purple-100 text-purple-700',
    hookPattern: '"Day in the life of a [PROFESSION]"',
    structure: ['Morning / arrival shot', 'Jobs throughout the day', 'Authentic moment (no script)', 'Optional: earnings reveal'],
    keyVars: ['PROFESSION', 'KEY_MOMENT', 'EARNINGS_REVEAL'],
    keywords: ['day in the life', 'ditl', 'a day', 'mechanic life', 'life of a', 'typical day', 'morning routine', 'shop life'],
    suggestedSlides: [
      { text: 'Day in the life of a [PROFESSION] at [BUSINESS_NAME] 📍', bgPrompt: 'Documentary-style candid shot of a professional arriving at work at sunrise, early morning golden light, authentic real-life feel, 9:16 vertical photo, no text' },
      { text: '6am: First job in — here\'s what we\'re dealing with today', bgPrompt: 'Early morning light streaming into a workshop or worksite, tools laid out ready for the day, cinematic golden hour, 9:16 vertical, no text' },
      { text: 'By midday: [JOB_COUNT] jobs done, [HIGHLIGHT_MOMENT]', bgPrompt: 'Professional mid-task at peak concentration, authentic action shot, midday natural light, 9:16 vertical documentary photo, no text' },
      { text: 'This is what it takes. Follow for more behind-the-scenes.', bgPrompt: 'Professional at end of productive day, proud and satisfied expression, warm late afternoon light, 9:16 vertical portrait, no text' },
    ],
    bgPrompt: 'Documentary-style candid shot of a professional arriving at work at sunrise, early morning golden light, authentic real-life feel, 9:16 vertical photo, no text',
  },
  {
    id: 18,
    name: 'Before / After',
    pillar: 'Social Proof / Trust',
    pillarColor: 'bg-green-100 text-green-700',
    hookPattern: '"Before → After: [TRANSFORMATION]"',
    structure: ['Before state reveal', 'Transformation process (timelapse or cuts)', 'After reveal', 'CTA'],
    keyVars: ['BEFORE_STATE', 'PROCESS_HIGHLIGHT', 'AFTER_STATE', 'CTA'],
    keywords: ['before', 'after', 'transformation', 'makeover', 'fix', 'repaired', 'restored', 'rebuilt', 'brand new'],
    suggestedSlides: [
      { text: 'Before → After: [TRANSFORMATION TYPE] in [LOCATION] ✨', bgPrompt: 'Dramatic before-and-after split image, left half worn or damaged, right half pristine, high contrast professional photography, 9:16 vertical, no text' },
      { text: 'BEFORE: [BEFORE_CONDITION] — this is what the client gave us', bgPrompt: 'Close-up of worn, damaged, or problem state of a surface or object, honest documentary photography, 9:16 vertical, no text' },
      { text: 'The process: [BRIEF_PROCESS_STEP] in [TIME]', bgPrompt: 'Professional mid-transformation action shot — tools in use, work in progress, cinematic and impressive, 9:16 vertical, no text' },
      { text: 'AFTER: [RESULT] — client was speechless. See more → link in bio', bgPrompt: 'Pristine finished result shown in beautiful light, polished and impressive, clean professional photography, 9:16 vertical, no text' },
    ],
    bgPrompt: 'Dramatic before-and-after split image, left half worn or damaged, right half pristine, high contrast professional photography, 9:16 vertical, no text',
  },
];

/**
 * Returns the best-matching Phase 0A template for a given TikTok hook text.
 * Falls back to Template 3 ("N Tips from a Pro") when nothing matches strongly.
 */
export function matchPhase0ATemplate(hook: string): Phase0ATemplate {
  const lower = hook.toLowerCase();
  let bestScore = 0;
  let bestTemplate = PHASE0A_TEMPLATES[2]; // default: "N Tips from a Pro"

  for (const t of PHASE0A_TEMPLATES) {
    const score = t.keywords.reduce((s, k) => s + (lower.includes(k) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestTemplate = t;
    }
  }
  return bestTemplate;
}

/**
 * The template for a research result.
 *
 * Prefers `templateId`, which the research API's classifier chose from the full
 * transcript. Falls back to keyword-matching the hook for results cached before
 * classification existed, or when the classifier was unavailable.
 */
export function resolvePhase0ATemplate(templateId: number | null | undefined, hook: string): Phase0ATemplate {
  const classified = typeof templateId === 'number'
    ? PHASE0A_TEMPLATES.find((t) => t.id === templateId)
    : undefined;
  return classified ?? matchPhase0ATemplate(hook);
}
