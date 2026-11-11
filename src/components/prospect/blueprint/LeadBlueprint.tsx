import { BLUEPRINT_STEPS, SOURCES } from './blueprintContent';
import { BlueprintStepView } from './BlueprintStepView';

const CHATGPT_ROWS = [
  'Keeps the same faces in every post',
  'Makes the photos, slideshows and videos',
  'Adds the voice, captions and music',
  'Fills your calendar with a day and time for each post',
  'Posts to Instagram, TikTok and YouTube after you approve',
];

/** Answers "I can do this with ChatGPT" with what a chat window does not do. */
function ChatGptAnswer() {
  return (
    <div className="mt-2 rounded-xl border border-app-line p-5 md:p-8">
      <h3 className="m-0 font-display text-[clamp(1.5rem,4.4vw,2.1rem)] font-[800] leading-[1.1] tracking-[-0.025em] text-app-ink">&ldquo;Can I do all this with ChatGPT?&rdquo;</h3>
      <p className="m-0 mt-3 max-w-[60ch] text-[17px] text-app-muted">You can use it to write a post, and that is a fine start. But the words are only one part of the job. Next5 does the rest too:</p>
      <ul className="m-0 mt-4 grid list-disc gap-1.5 pl-5 text-[16px] text-app-ink marker:text-app-accent">
        {CHATGPT_ROWS.map((row) => <li key={row}>{row}</li>)}
      </ul>
    </div>
  );
}

/** Ends the guide: their calendar already exists, so the next step is to start. */
function StartNow({ name }: { name: string }) {
  return (
    <div className="mt-8 rounded-[28px] bg-app-ink px-5 py-8 text-app-bg md:p-12">
      <h3 className="m-0 font-display text-[clamp(1.7rem,5vw,2.6rem)] font-[800] leading-[1.05] tracking-[-0.03em]">You have the plan. Your first 14 days are made.</h3>
      <p className="m-0 mt-3 max-w-[52ch] text-[17px] opacity-75">Steps 1 to 7 are done for {name}. All that is left is to say yes.</p>
      <a href="#claim" className="mt-6 inline-flex min-h-[50px] items-center justify-center rounded-full bg-app-accent px-8 text-[16px] font-semibold text-white no-underline transition active:scale-[0.98]">Start now</a>
    </div>
  );
}

/** The long free guide under the questions: real value first, with Next5 as the fast way to do each step. */
export function LeadBlueprint({ name }: { name: string }) {
  return (
    <section id="blueprint" className="border-t border-app-line pb-16 pt-14">
      <div className="mx-auto max-w-[1180px] px-5">
        <p className="m-0 font-display text-[15px] font-[800] uppercase tracking-[0.08em] text-app-accent">Free guide</p>
        <h2 className="m-0 mt-2 max-w-[20ch] font-display text-[clamp(2rem,6.4vw,3.4rem)] font-[800] leading-[1.02] tracking-[-0.03em] text-app-ink">The full blueprint to get more leads for small businesses with social media</h2>
        <p className="m-0 mt-4 max-w-[56ch] text-[18px] text-app-muted">{BLUEPRINT_STEPS.length} steps. Use them with or without us. We show you what to do, and how Next5 can do it for you.</p>
        <nav aria-label="Blueprint steps" className="mt-6">
          <ol className="m-0 grid list-decimal gap-x-6 gap-y-1.5 pl-5 text-[15px] marker:text-app-accent sm:grid-cols-2 lg:grid-cols-3">
            {BLUEPRINT_STEPS.map((step, i) => (
              <li key={step.title}><a href={`#blueprint-step-${i + 1}`} className="text-app-ink underline-offset-2 transition hover:underline">{step.title}</a></li>
            ))}
          </ol>
        </nav>
        <ol className="m-0 mt-10 list-none p-0">
          {BLUEPRINT_STEPS.map((step, i) => <BlueprintStepView key={step.title} step={step} index={i} />)}
        </ol>
        <ChatGptAnswer />
        <StartNow name={name} />
        <div id="blueprint-sources" className="mt-8 scroll-mt-4">
          <p className="m-0 text-[13px] font-semibold text-app-muted">Sources</p>
          <ol className="m-0 mt-1.5 grid list-decimal gap-1 pl-5 text-[13px] text-app-muted">
            {SOURCES.map((source) => (
              <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="text-app-muted underline underline-offset-2 transition hover:text-app-ink">{source.name}</a></li>
            ))}
          </ol>
          <p className="m-0 mt-2 text-[13px] text-app-muted">These are studies of other accounts, not a promise of your results.</p>
        </div>
      </div>
    </section>
  );
}
