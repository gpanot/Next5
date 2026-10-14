-- migrate:up

-- Hook Knowledge (admin → Hooks → Hook Knowledge): notes and .md/.txt files about what makes slideshow hooks work.
-- Fed to the campaign editor's "Generate for me" so new hooks follow current formulas. Shared by every workspace;
-- admins add, edit and remove entries as trends change.
CREATE TABLE public.hook_knowledge (
    id text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    file_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hook_knowledge_pkey PRIMARY KEY (id)
);

-- The first entry: TikTok slideshow hook formulas, numbers and examples, from tryvolume.app (2026-10-14).
INSERT INTO public.hook_knowledge (id, title, body) VALUES ('hk_seed_formulas', 'TikTok slideshow hooks: what works (tryvolume.app)', $hk$Source: tryvolume.app/blog/tiktok-slideshow-hooks-examples (read 2026-10-14). Numbers are from real TikTok photo slideshows in the golf niche.

## What the numbers say

Top golf slideshow hooks, with views, saves and save rate (saves ÷ views):

| Hook | Views | Saves | Save rate |
|---|---|---|---|
| 5 Ways To Improve Your Golf Game | 431.5K | 1,806 | 0.4% |
| 7 Realizations That Will Make You Better at Golf | 394.7K | 4,371 | 1.1% |
| 10 Truths About Golf No One Tells You | 260.1K | 1,549 | 0.6% |
| 8 Habits That Quietly Kill Your Golf Game | 189.1K | 447 | 0.2% |
| 12 Golf Tips For Beginners | 155.1K | 2,147 | 1.4% |
| 7 Weird Golf Habits That Actually Make You Better | 154.8K | 2,903 | 1.9% |
| 6 Insane Golf Conspiracy Theories | 153.4K | 262 | 0.2% |
| 8 Stats That Will Completely Change The Way You Golf | 89.8K | 296 | 0.3% |
| 8 Mistakes Keeping You From Breaking 90 | 89.1K | 447 | 0.5% |
| 9 Golf Quotes That Will Improve Your Game | 88.8K | 604 | 0.7% |
| 8 Essential Golf Terms To Know As A Beginner | 82.0K | 2,479 | 3.0% |
| 7 Legal Golf Hacks All Beginners Should Know | 71.2K | 314 | 0.4% |

Every top hook starts with a number. All use plain words a beginner understands.

## Rules to write by

1. **Simple wins reach.** The top hook ("5 ways to improve your golf game") is as plain as a hook gets. A clear promise to a big audience beats a clever line. When unsure, write the plain version.
2. **Beginner reference content gets saved.** "8 essential golf terms to know as a beginner" has the best save rate (3.0%). Beginners save lists they want to come back to: terms, rules, tips "every beginner should know".
3. **Surprise drives saves.** "7 weird golf habits that actually make you better" (1.9%) and "7 realizations…" (4,371 saves) feel like new information worth keeping. Words that work: weird, unexpected, realizations, no one tells you.
4. **Entertainment reaches, education gets saved.** "6 insane golf conspiracy theories" reached 153K views but only 0.2% saves. Use entertaining hooks for reach, educational hooks for saves. A brand campaign usually wants both: mix them.
5. **Negative framing reaches but saves less.** "Habits that quietly kill…" and "mistakes keeping you from…" pull views; their save rates are lower than positive, useful lists.

## 8 reusable formulas

- [Number] ways to [get result] — "5 ways to improve your golf game"
- [Number] realizations that will make you better at [topic] — "7 realizations that will make you better at golf"
- [Number] truths about [topic] no one tells you — "10 truths about golf no one tells you"
- [Number] weird/unexpected [habits/tips] that actually work — "7 weird golf habits that actually make you better"
- [Number] habits/mistakes quietly killing your [result] — "8 habits that quietly kill your golf game"
- [Number] [tips/terms] every beginner should know — "8 essential golf terms to know as a beginner"
- [Number] mistakes keeping you from [milestone] — "8 mistakes keeping you from breaking 90"
- [Number] [hacks] that feel illegal but aren't — "7 legal golf hacks all beginners should know"

Other patterns seen in the examples below: "[Number] things I wish I knew before [first experience]", "[Number] [things] that feel lazy but actually work", "[Number] [things] that don't [expected downside]", "[Number] small habits of [people who succeed]".

## Examples by niche (adapt the pattern, never copy the topic)

**Fitness and gym:** 8 gym terms every beginner should know · 10 truths about the gym no one tells beginners · 6 unconventional workout tips that changed my progress · 7 weird gym habits that actually help you build muscle · 5 mistakes keeping you from hitting a new PR

**Golf:** 6 unexpected ways to get better at golf · 9 golf rules most beginners don't know · 5 things I wish I knew before my first round · 7 practice habits that quietly lower your scores · 8 short game tips that feel illegal but aren't

**Nutrition:** 6 calorie tracking mistakes beginners make · 8 foods with more protein than you'd expect · 5 unexpected ways to hit your protein goal · 7 high-protein snacks that don't taste like "health food" · 10 nutrition truths no one tells you when you start tracking

**Study and productivity:** 7 study habits that feel lazy but actually work · 6 things I wish I knew before my first semester · 5 unconventional ways to focus for hours · 8 study techniques top students swear by · 9 small habits that made me way more productive

**Personal finance:** 6 budgeting mistakes almost every beginner makes · 5 money terms everyone should know by 25 · 7 money habits I wish I started at 22 · 8 unexpected ways to save money every month · 10 money truths no one tells you in school

**Language learning:** 6 things I wish I knew before learning a new language · 7 weird language learning habits that actually work · 5 Spanish phrases textbooks never teach you · 8 mistakes keeping you from becoming fluent · 9 unconventional ways to practice a language every day

**Self-improvement:** 5 things no one tells you about building habits · 7 small morning habits that actually stick · 6 realizations that will make you more disciplined · 8 habits that quietly changed my life this year · 10 unconventional habits of the most focused people I know

**Skincare and beauty:** 7 skincare mistakes most beginners make · 5 skincare ingredients everyone should know · 6 things I wish I knew before starting a skincare routine · 8 unexpected habits that are ruining your skin · 9 skincare truths no one tells you

**Dating and relationships:** 6 first date ideas that aren't dinner · 7 green flags people overlook · 5 things no one tells you about your first relationship · 8 texting habits that quietly kill attraction · 10 small habits of couples who last

**Travel:** 8 things I wish I knew before my first solo trip · 6 packing mistakes almost everyone makes · 5 unexpected ways to find cheap flights · 7 travel hacks that feel illegal but aren't · 9 underrated travel tips I use on every trip

## How a campaign should test hooks

- **One campaign = one idea, several hooks.** Each hook is one post, so write hooks that test different formulas on the same content.
- **Change one word.** "7 weird golf habits" and "7 unexpected golf habits" can perform very differently.
- **Change the number.** Try 5, 7 and 10 versions of the same idea (the content slides must match the number).
- **Same hook, new background.** Every slide is a photo with text, so the same hook on a different photo is a new test.
- **Post consistently.** The more hooks tested, the faster the winners show.$hk$);

-- migrate:down

DROP TABLE IF EXISTS public.hook_knowledge;
