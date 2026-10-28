# Research: how to make a slideshow on tiktok (improve pass)

Run date: 2026-10-28. Hub: `how-to`. Action: **improve an existing article**
(`src/content/guides/articles/howToMakeTikTokSlideshow.ts`, published 2026-10-18), not a new page.

## 0. Why this run improves instead of publishing

Two of the three drift signs in QUALITY_BAR.md are present, and the bar says to stop publishing new
articles for a week and improve existing ones when any of them shows up.

- **First-try pass rate below 70%.** RUN_LOG.md records 9 article runs. 3 passed review on the first
  try (2026-10-21, 2026-10-22, 2026-10-23). The other 6 failed, including the last 5 in a row. That
  is 33%.
- **New articles start to look alike.** The 2026-10-27 run logs review 1 failing check 8 because 3
  sentences and the title formula were shared with the article shipped the day before.

Supporting signal, not one of the three listed signs: indexing. `urlInspection` on
`/blog/how-many-hashtags-on-tiktok-for-business` (published 2026-10-24) returned "URL is unknown to
Google" on 2026-10-28, the fifth consecutive article with that verdict. The sitemap was downloaded
by Google on 2026-10-25 with 32 URLs submitted and 0 indexed. A 33rd unindexed page is worth less
than making the one page Google already ranks earn its clicks.

## 1. Target query and its data

Search Console (sc-domain:giinger.com, 2026-09-28 to 2026-10-26, pages matching
`^https://next5\.giinger\.com/`) returned 14 query rows, 0 clicks site-wide. The slideshow article
owns the only rows that rank on page 1:

| Query | Impressions | Clicks | CTR | Position |
| --- | --- | --- | --- | --- |
| how to make slideshow on tiktok | 7 | 0 | 0% | 9.57 |
| how to make slide show on tiktok | 2 | 0 | 0% | 10 |
| how to make tiktok slideshow | 2 | 0 | 0% | 9 |
| tiktok slideshow | 1 | 0 | 0% | 46 |

12 of the site's 27 impressions, every page-1 position the site has, and 0 clicks. This is exactly
the "Improve" branch in DAILY_RUN.md step 2: an existing article already targets this intent and
ranks 8 to 30. Impressions are below the 50 bar, but the bar exists to find targets during a cold
start and nothing on the site clears it; position 9.57 at 0% CTR is the strongest signal available.

The other page with rows, `/blog/how-much-does-a-social-media-manager-cost`, sits at position 72 to
93 on its queries. Too deep to improve into clicks this week.

No keyword collision: `how to make a slideshow on tiktok` stays this article's keyword and no other
article claims it.

## 2. Top results and what they miss

Top US results for "how to make a slideshow on tiktok", read 2026-10-28:

1. https://www.descript.com/blog/article/how-to-make-slideshow-on-tiktok — 6 steps, template-first.
   Headings: 3 Key Benefits / How to Make a Slideshow in 6 Easy Steps / Troubleshooting Common
   Slideshow Issues / Swipeable vs. Non-Swipeable / Edit with Descript / FAQs. States JPEG or PNG,
   minimum 1080x1080, optimal 1080x1920, up to 35 images. Does not cover desktop, business use,
   scheduling, how long each photo shows, or text timing.
2. https://www.shopify.com/blog/how-to-make-a-slideshow-on-tiktok — the most business-aware of the
   five. Headings include Why create TikTok slideshows for your business / Swipeable vs.
   non-swipeable / Troubleshooting / 5 pro tips / slideshow ideas for ecommerce brands. States 35
   photos, 1080x1920, JPG or PNG, and is the only top result to mention that business use needs the
   Commercial Music Library. Written for ecommerce brands, not for a local service business. Does
   not cover desktop upload or explain why a post comes out as a video.
3. https://socialbee.com/blog/how-to-make-a-slideshow-on-tiktok/ — What is a slideshow / Swipeable
   vs non-swipeable / image sizes / benefits / step-by-step / 5 content ideas / 7 tips / FAQ. 35
   photos, 1080x1920 recommended, also 1080x1350, 1080x1080, 1920x1080, JPG/JPEG/PNG. Says
   slideshows are mobile-app only. FAQ: photo format, can slideshows include videos, preview before
   posting, what photo mode is, deleting a photo, editing features, music. No local business angle,
   no explanation of the video conversion.
4. https://metricool.com/tiktok-slideshow/ — swipeable vs non-swipeable, up to 35 images, and the
   clearest statement that the desktop uploader cannot make a swipeable carousel. Notes templates
   "typically see lower retention than the manual swipe carousel". No image specs, no slide
   duration, no business angle.
5. https://www.videostudiopro.com/en/tips/slideshows/tiktok/ and
   https://www.capcut.com/resource/tiktok-slideshows-with-pictures — generic consumer tutorials that
   route the reader into the vendor's editor. No business angle at all.

What all of them miss, and what this rewrite adds:

- **The music trap for a business account.** A business account sees only the Commercial Music
  Library when it taps Add sound. Only Shopify mentions it, in passing. For our reader this is the
  single most likely surprise: the trending sound they planned to use is not in their list. Nobody
  explains what to do instead.
- **What the slides should say for a local service business.** Every top result stops at the
  mechanics or gives ecommerce product ideas. None gives a plumber, salon or agent a slide-by-slide
  shape.
- **Why the post comes out as a video, stated as cause not symptom.** Descript and Shopify
  "troubleshoot" it; none says plainly that TikTok defaults the editor to video after a multi-photo
  upload and you must switch to photo mode before posting.
- **A straight answer on desktop.** Two sources say it, three ignore it. The reader asking from a
  laptop needs the answer and the workaround in one line.
- **Honest framing of templates.** Templates are the first thing Descript and the SERP recommend,
  and they produce the auto-play format that gets less swipe time. Our reader should know the
  tradeoff before picking.

## 3. "People also ask" and related questions collected

- How many photos can a TikTok slideshow have?
- Can I make a TikTok slideshow on a computer?
- Why is my slideshow posting as a video?
- Why can't I make a slideshow on TikTok?
- What size should TikTok slideshow photos be?
- Can a TikTok slideshow include videos as well as photos?
- Can I add different music to each slide?
- How long does each photo show?
- How do you turn off autoplay on a TikTok slideshow?
- Can I preview my slideshow before posting?
- Do you need a third-party app to make a slideshow on TikTok?

## 4. Every fact the draft states, with its source

| Fact | Source |
| --- | --- |
| A photo post can hold up to 35 photos | TikTok's own developer documentation, Content Posting API photo post reference: `photo_images` is "An array containing up to 35 photo content URLs" (https://developers.tiktok.com/doc/content-posting-api-reference-photo-post). Repeated by every top result. |
| TikTok calls the format photo mode, and a slideshow is also called a photo post or carousel | https://socialbee.com/blog/how-to-make-a-slideshow-on-tiktok/ and https://www.shopify.com/blog/how-to-make-a-slideshow-on-tiktok |
| A business account sees only Commercial Music Library sounds when it taps Add sound | TikTok's own help article: Business Account holders who select "Add Sound" encounter "only sounds from the Commercial Music Library ('Commercial Sounds')" (https://ads.tiktok.com/help/article/how-to-use-the-commercial-music-library) |
| The Commercial Music Library is "A global music library of 1 million songs that helps make it easier for businesses to find music to soundtrack their content on TikTok" | Same TikTok help article (direct quote) |
| Personal accounts see the wider library and can filter to Commercial Sounds | Same TikTok help article |
| The Commercial Music Library applies to organic posts for a business, not only to ads | https://ads.tiktok.com/help/article/how-to-use-the-commercial-music-library; https://brands.joinstatus.com/tiktok-commerical-music-library |
| There are two slideshow formats: swipeable photo mode, and an auto-play template that plays like a video | https://metricool.com/tiktok-slideshow/; https://socialbee.com/blog/how-to-make-a-slideshow-on-tiktok/; https://www.shopify.com/blog/how-to-make-a-slideshow-on-tiktok |
| In swipeable photo mode the viewer sets the pace; template slideshows advance on their own | https://metricool.com/tiktok-slideshow/ |
| Template slideshows "typically see lower retention than the manual swipe carousel" | https://metricool.com/tiktok-slideshow/ |
| The TikTok desktop/web uploader cannot create a swipeable multi-photo carousel; photo mode is mobile app only | https://metricool.com/tiktok-slideshow/ ("You cannot natively create a swipeable, multi-photo carousel directly through the TikTok desktop browser uploader"); https://socialbee.com/blog/how-to-make-a-slideshow-on-tiktok/ ("Slideshows are only available in the TikTok mobile app on iPhone and Android"). Two independent sources, checked 2026-10-28. TikTok's own upload page renders in JavaScript and could not be read, so the draft dates the claim. |
| After picking several photos the editor can default to video, and you must switch to photo mode before posting | https://socialbu.com/blog/slideshow-on-tiktok ("TikTok will often default to 'Video' mode... you must explicitly look for the option at the bottom of the screen to Switch to Photo mode"); troubleshooting sections in https://www.descript.com/blog/article/how-to-make-slideshow-on-tiktok and https://www.shopify.com/blog/how-to-make-a-slideshow-on-tiktok |
| Photos should be JPG/JPEG or PNG, 1080 x 1920 px for a full-screen vertical slide | https://socialbee.com/blog/how-to-make-a-slideshow-on-tiktok/; https://www.shopify.com/blog/how-to-make-a-slideshow-on-tiktok ("1,080 by 1,920 pixels"); https://www.descript.com/blog/article/how-to-make-slideshow-on-tiktok (minimum 1080x1080, optimal 1080x1920) |
| 1080 x 1350 and 1080 x 1080 also work | https://socialbee.com/blog/how-to-make-a-slideshow-on-tiktok/ |
| You can put video clips in the same post as photos | https://socialbee.com/blog/how-to-make-a-slideshow-on-tiktok/ (FAQ "Can TikTok slideshows include videos?"); https://www.advertisemint.com/combining-photos-and-videos-on-tiktok/ |
| One sound plays across the whole slideshow | https://socialbee.com/blog/how-to-make-a-slideshow-on-tiktok/; https://metricool.com/tiktok-slideshow/. Kept from the existing draft. |
| Photo mode availability has rolled out gradually by region and account | https://www.shopify.com/blog/how-to-make-a-slideshow-on-tiktok |
| In photo mode you add text per photo: "Tap the Text icon and enter the words you want to show on each image, and then hit Done", with font, colour, size and alignment set for each one | https://socialbu.com/blog/slideshow-on-tiktok, checked 2026-10-28 |
| The desktop workaround is to build the slideshow in another editor such as CapCut and upload the video from the browser, which gives up the swiping | https://socialbu.com/blog/slideshow-on-tiktok ("TikTok's native Photo Mode is not available on PC. However, you can create slideshows using a TikTok slideshow tool alternative, such as CapCut, and upload the video to TikTok from your browser"); https://metricool.com/tiktok-slideshow/ ("Desktop users must create slideshows as complete video files using external editing software, then upload them as single videos") |
| To mix clips with photos, switch from the image tab to the video tab while picking media | https://www.advertisemint.com/combining-photos-and-videos-on-tiktok/ ("Switch from the image tab to the video one and select all the media you want to upload") |
| 5 to 9 slides is the range Next5 builds to | Next5's own product copy, already published: `src/content/guides/articles/facelessTikTokIdeas.ts` ("5 to 9 photos with one line of text each") and the `cta` block in this article |
| TikTok caps a post at 5 hashtags | Carried from the 2026-10-24 research notes (`how-many-hashtags-on-tiktok-for-business.md`): https://searchengineland.com/tiktok-limits-hashtags-460894, https://www.mediapost.com/publications/article/408371/tiktok-limits-hashtags-as-algorithms-become-more-s.html |

Facts deliberately left out:

- **How long each photo shows in an auto-play slideshow.** Sources give 1 second, 2 to 3 seconds and
  3 to 5 seconds, and none is primary. The draft says the viewer controls the pace in photo mode and
  the template controls it otherwise, with no number.
- **Max file size per image.** 20 MB appears on aggregator blogs and in API write-ups, but TikTok's
  own photo post reference does not state it. Left out.
- **"People decide in about one second if they will swipe."** In the existing draft with no source.
  Removed in this pass and replaced with advice phrased as advice.
- **Any engagement or reach statistic for slideshows versus video.** Nothing traceable was found.
- **Whether photo mode is still gated for some accounts in 2026.** Shopify says rollout was gradual;
  no source confirms a current gate, so the draft does not promise everyone has it.
- **Named template counts or template names.** TikTok changes them; no source holds.
- **"People stop swiping" before the end of a long slideshow.** No traceable source. The draft gives
  5 to 9 as advice and as what Next5 builds, with no claim about what viewers do.
- **"The app pushes templates first."** The sources say templates are what the tutorials reach for,
  not that TikTok's own interface leads with them.
- **Whether a post can be converted from video to photo mode after it is live.** No source. The
  draft only says to check the photo option before posting.
- **That a stale app version is the usual cause of missing photo mode.** No source ranks the causes.
- **Letterboxing behaviour for 1080 x 1350 and 1080 x 1080.** Sources list the sizes as supported
  and say nothing about bars, so the draft lists the sizes only.
- **That bright photos outperform dark ones.** No traceable source. Kept as advice ("shoot near a
  window") with no comparison claim.
- **What covers the top and bottom of the screen.** The draft tells the reader to keep text in the
  middle, without asserting what sits on top of it.

## 5. Next5 data

No Next5 post data compares slideshow formats, so there is no "What we saw on real posts" section.
No invented numbers.

## 6. Cover

Replaced this run. The article used to point at `slide-chapters`, which `guideReadAnalytics.ts` also
uses, with a byte-identical `coverAlt`. QUALITY_BAR check 9 fails on a shared cover, and the old alt
described the cover as something Next5 made, which AGENT_BRIEF forbids. `guideReadAnalytics` keeps
`slide-chapters`; this article gets its own photo.

New cover: `public/images/guides/how-to-make-a-slideshow-on-tiktok.png`, generated with the
web-imagery skill (FLUX-2-pro, 1024x1280, re-encoded to 552 KB, listed in
`public/images/manifest.json`). A flower shop owner in an apron at her counter looking at her phone,
cut stems and shears in front of her, buckets of flowers in a sunlit window behind. Bright daylight,
realistic, 4:5, no text in the image. The subject is an owner on her phone making a post, which is
the topic of the article. Not shared with any other article.

## 7. What changed in the article

- Added `answer` (the article had none) and `seoTitle`, and rewrote `description` around the two
  things the SERP does not answer: the photo-mode switch and the business music library.
- New sections: swipeable photo mode versus template slideshows; the Commercial Music Library for
  business accounts; what to put on the slides for a local service business; photo size and format.
- Removed the unsourced "about one second" claim.
- FAQ grew from 4 to 7, from the "People also ask" list above, each answer sourced in section 4.
- New cover, because the old one was shared with `guideReadAnalytics` (see section 6).
- `updated: '2026-10-28'`.

Review 1 failed check 5 on nine unsourced claims and check 9 on the shared cover. The rewrite
removed every unsourced claim listed under "Facts deliberately left out" above, added the four
source rows the remaining lines needed, added SocialBu and AdvertiseMint to the article's Sources
list, and generated the new cover.
