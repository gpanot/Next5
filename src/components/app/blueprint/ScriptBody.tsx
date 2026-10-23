import type { BlueprintFormat, Script } from '../../../lib/scriptGenerator/types';
import { beatHeading } from '../../../lib/blueprint/text';
import { Highlighted } from './Highlighted';
import { SCRIPT_UI } from './planCopy';

const Row = ({ name, value }: { name: string; value: string }) =>
  value.trim() ? (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-app-muted">{name}</dt>
      <dd className="break-words text-[14px] text-app-ink"><Highlighted text={value} /></dd>
    </div>
  ) : null;

/** The script, read only: title, hook stack, beats, close, caption, filming tips. */
export const ScriptBody = ({ script, format }: { script: Script; format: BlueprintFormat }) => (
  <div className="flex flex-col gap-3">
    <h4 className="text-[18px] font-semibold leading-snug text-app-ink">{script.title}</h4>
    <section className="flex flex-col gap-2 rounded-xl border border-app-accent bg-app-panel p-3">
      <p className="text-[12px] font-bold uppercase tracking-wider text-app-accent">Hook</p>
      <dl className="flex flex-col gap-2">
        <Row name={SCRIPT_UI.firstFrame} value={script.hook.visual} />
        <Row name={SCRIPT_UI.onScreen} value={script.hook.onScreen} />
        <Row name={SCRIPT_UI.say} value={script.hook.spoken} />
      </dl>
    </section>
    {script.beats.map((beat, i) => (
      <section key={i} className="flex flex-col gap-2 rounded-xl border border-app-line bg-app-panel p-3">
        <p className="text-[12px] font-bold uppercase tracking-wider text-app-accent">{beatHeading(format, beat.label, i)}</p>
        <dl className="flex flex-col gap-2">
          <Row name={SCRIPT_UI.say} value={beat.spoken} />
          <Row name={SCRIPT_UI.onScreen} value={beat.onScreen} />
          <Row name={SCRIPT_UI.show} value={beat.visual} />
          {format !== 'talking' && <Row name={SCRIPT_UI.rehook} value={beat.rehook} />}
        </dl>
      </section>
    ))}
    <dl className="flex flex-col gap-2 rounded-xl bg-app-panel p-3">
      <Row name={SCRIPT_UI.close} value={script.cta} />
      <Row name={SCRIPT_UI.caption} value={script.caption} />
    </dl>
    {script.tips.length > 0 && (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-app-muted">{SCRIPT_UI.tips}</p>
        <ul className="ml-4 list-disc text-[14px] text-app-ink">
          {script.tips.map((tip) => <li key={tip}>{tip}</li>)}
        </ul>
      </div>
    )}
  </div>
);
