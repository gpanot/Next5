/** The blueprint's words and media. Every number here has a source in SOURCES, checked 2026-11-03. */

export type BlueprintStat = { value: string; label: string; source: number };
export type BlueprintMedia =
  | { kind: 'video'; src: string; poster: string; label: string }
  | { kind: 'image'; src: string; caption: string; ratio: string };

export type BlueprintStep = {
  title: string;
  paragraphs: string[];
  doThis: string[];
  next5: string;
  stats?: BlueprintStat[];
  media?: BlueprintMedia;
  cards?: { title: string; job: string; text: string }[];
};

export const SOURCES = [
  { name: 'YouTube CEO letter, 2026', url: 'https://blog.youtube/inside-youtube/the-future-of-youtube-2026/' },
  { name: 'Socialinsider, TikTok vs. Reels vs. Shorts, January 2025 to June 2026', url: 'https://www.socialinsider.io/blog/tiktok-vs-reels-vs-shorts/' },
  { name: 'Buffer, State of Social Media Engagement 2026', url: 'https://buffer.com/resources/state-of-social-media-engagement-2026/' },
  { name: 'Socialinsider, Instagram Engagement Report, October 2025 to March 2026', url: 'https://www.socialinsider.io/social-media-benchmarks/instagram-engagement-report' },
];

export const BLUEPRINT_STEPS: BlueprintStep[] = [
  {
    title: 'Know what a post is for',
    paragraphs: [
      'One post rarely sells. People see you, then see you again, then start to trust you. When they need help, they ask the business they remember.',
      'So your goal is simple: be the business they remember.',
    ],
    doThis: ['Stop asking "did this post sell?"', 'Start asking "did this post help someone?"'],
    next5: 'Your posts teach and help first. Only the last slide asks people to act.',
  },
  {
    title: 'Pick one customer and their questions',
    paragraphs: [
      'Posts for everyone reach no one. Think of your best customer. What do they ask you before they buy?',
      'Each of those questions is a post. A good list will last you for weeks.',
    ],
    doThis: ['Name your best customer.', 'Write down the 5 questions they ask most.', 'Make one post for each question.'],
    next5: 'We read your website and find your customers. You confirm who they are, and your posts speak to them.',
  },
  {
    title: 'Go where the views are',
    paragraphs: [
      'Short videos and slideshows can reach people who have never heard of you. You do not need a big following to start.',
      'YouTube Shorts is easy to miss. Small accounts got far more views per video there in this study. Each app counts a view its own way, so use these numbers as a guide.',
    ],
    stats: [
      { value: '200 billion', label: 'Shorts views a day on YouTube', source: 1 },
      { value: '15,160', label: 'Average views per Short, for brand accounts under 5K followers', source: 2 },
      { value: '625', label: 'Average views per Reel, same size of account', source: 2 },
    ],
    doThis: ['Post on TikTok and Instagram.', 'Put the same posts on YouTube Shorts too.'],
    next5: 'Every post is made to fit a phone screen. Connect Instagram, TikTok and YouTube, or download a post and share it anywhere.',
  },
  {
    title: 'Start with slideshows',
    paragraphs: [
      'A slideshow is the easiest post to make well. No camera. No acting. Each swipe keeps people with you, and a good tip list gets saved for later.',
      'Instagram carousels earned about twice the engagement of Reels per person reached in one large study. Reels still reach more people, so use both.',
    ],
    stats: [
      { value: '6.9%', label: 'Median engagement for Instagram carousels, by reach', source: 3 },
      { value: '3.3%', label: 'Median engagement for Reels, by reach', source: 3 },
      { value: '37 vs 10', label: 'Median saves per post: carousels vs single images', source: 4 },
    ],
    doThis: ['Open with one clear promise.', 'Give one idea per slide.', 'Keep it to 5 to 7 slides.'],
    next5: 'We write the hook, the slides and the caption, then add the photos and music.',
  },
  {
    title: 'Use two kinds of slideshows',
    paragraphs: ['Each kind has a different job. You need both, because new people must find you and then learn to trust you.'],
    cards: [
      { title: 'Hook slideshows', job: 'Job: reach new people', text: 'A strong first line and quick tips. Easy to make in volume, so you can test many ideas and see what gets views.' },
      { title: 'Brand slideshows', job: 'Job: earn trust', text: 'The same faces and real places, again and again. People start to feel they know you before they ever call.' },
    ],
    media: { kind: 'video', src: '/videos/blueprint/slides.mp4', poster: '/images/prospect/blueprint/slides-poster.jpg', label: 'Animation of a hook slideshow and a brand slideshow side by side' },
    doThis: ['Use hook slideshows to test ideas.', 'Use brand slideshows to build trust.'],
    next5: 'Your calendar mixes both, with up to 5 faces for your brand.',
  },
  {
    title: 'Add split screens and mini Blitz videos',
    paragraphs: [
      'Video adds reach and a human voice. You still do not need to film.',
      'A mini Blitz is a short story in 7 quick shots, with a voice and captions. A split screen shows two clips at once, so there is more to look at.',
    ],
    media: { kind: 'video', src: '/videos/blueprint/formats.mp4', poster: '/images/prospect/blueprint/formats-poster.jpg', label: 'Animation of a mini Blitz video, then a split screen video' },
    doThis: ['Make each video about one point.', 'Put the point in the first line.', 'Post the same video on Shorts, Reels and TikTok.'],
    next5: 'We make these videos for you, with the voice and captions done. See them in your calendar above.',
  },
  {
    title: 'Put it on a calendar',
    paragraphs: [
      'One good post is easy. The fourteenth post is the hard part, and it is where many people stop.',
      'A calendar fixes this. You choose once, and you never have to wonder what to post today.',
    ],
    media: { kind: 'video', src: '/videos/blueprint/cal.mp4', poster: '/images/prospect/blueprint/cal-poster.jpg', label: 'Animation of a website turning into 14 days of posts, each approved' },
    doThis: ['Plan 14 days at a time.', 'Post once a day.', 'Mix slideshows and videos.'],
    next5: 'Your 14 days are already made, with a day and time for each post. Nothing goes out until you approve it.',
  },
  {
    title: 'Turn views into leads',
    paragraphs: [
      'Views do not pay the bills. Leads do. Make it easy for people to take the next step.',
      'Teach in every slide. Then ask for one thing at the end: call, book, or send a message.',
    ],
    media: { kind: 'image', src: '/images/prospect/blueprint/approve.jpg', caption: 'The Next5 approve screen. You pick where each post goes.', ratio: '640 / 942' },
    doThis: ['Use one clear ask per post.', 'Put your booking link in your bio.', 'Answer comments and messages the same day.', 'Ask new customers how they found you.'],
    next5: 'Your slides stay helpful, not salesy. The ask waits for the last slide.',
  },
  {
    title: 'Keep what works',
    paragraphs: [
      'After 14 days, you have real results. Look at views, saves and messages. Find your top 3 posts.',
      'Make more like those. Drop the rest. Each new calendar should beat the last one.',
    ],
    media: { kind: 'image', src: '/images/prospect/blueprint/app-calendar.jpg', caption: 'The Next5 calendar. Approve all your posts with one tap.', ratio: '640 / 1230' },
    doThis: ['Check your numbers every 14 days.', 'Copy the first line of your best post.', 'Try one new idea each week.'],
    next5: 'Swipe to keep a post, or skip it and get another one for that day.',
  },
];
