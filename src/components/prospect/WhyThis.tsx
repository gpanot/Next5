import type { ProspectWhy } from '../../types/admin/prospects';

const dt = 'text-[13px] text-app-muted';
const dd = 'm-0 text-[14px] text-app-ink';

/** "mechanics" → "Mechanics". */
const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** "Why this one?" beside the post: who it is for, why that first line, what each shot or slide says, and the proof,
 *  as the Ideas deck's "Why this?" shows them. */
export function WhyThis({ why }: { why: ProspectWhy }) {
  return (
    <section aria-labelledby="why-this" className="mt-5 rounded-2xl border border-app-line p-4">
      <h4 id="why-this" className="m-0 mb-3 text-[15px] font-semibold text-app-ink">Why this one?</h4>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2.5 leading-snug">
        <dt className={dt}>Made for</dt>
        <dd className={dd}>{capital(why.audience)}</dd>
        <dt className={dt}>Hook</dt>
        <dd className={dd}>
          {why.hook}
          {why.hookReason && <span className="mt-0.5 block text-[13px] text-app-muted">{why.hookReason}</span>}
        </dd>
        {why.story.length > 0 && (
          <>
            <dt className={dt}>Story</dt>
            <dd className="m-0">
              <ol className="m-0 flex list-none flex-col gap-1 p-0">
                {why.story.map((line) => (
                  <li key={`${line.label}-${line.text}`} className="text-[13px] text-app-muted">
                    <b className="font-semibold text-app-ink">{line.label}</b>: {line.text}
                  </li>
                ))}
              </ol>
            </dd>
          </>
        )}
        {why.proof && (
          <>
            <dt className={dt}>Proof</dt>
            <dd className={dd}>{why.proof}</dd>
          </>
        )}
      </dl>
    </section>
  );
}
