/**
 * Plain-text views of a blueprint: a script to copy, the teleprompter lines, and the whole blueprint summary.
 * Client-safe and pure, so they are unit tested.
 */
import type { BlueprintFormat, Script } from '../scriptGenerator/types';
import { dayStatus, DAY_STATUS_LABEL, pillarTopics, type BlueprintDto } from './schema';

const FORMAT_NAME: Record<BlueprintFormat, string> = { talking: 'Talking head', carousel: 'Carousel', broll: 'B-roll with text' };
const PILLAR_NAME = { skills: 'Skill', passions: 'Passion', story: 'Story' } as const;
const CHECK_NAMES = ['Strong hook', 'Real value', 'Re-hooks'] as const;

/** "THE TRICK" on a talking head, "Slide 3" or "Shot 3" otherwise. */
export const beatHeading = (format: BlueprintFormat, label: string, index: number): string =>
  format === 'talking' ? label || `Beat ${index + 1}` : `${format === 'carousel' ? 'Slide' : 'Shot'} ${index + 1}`;

const line = (name: string, value: string): string[] => (value.trim() ? [`${name}: ${value.trim()}`] : []);

export const scriptText = (script: Script, format: BlueprintFormat): string => {
  const out = [script.title, '', 'HOOK', ...line('First frame', script.hook.visual), ...line('On screen', script.hook.onScreen), ...line('Say', script.hook.spoken)];
  script.beats.forEach((beat, i) => {
    out.push('', beatHeading(format, beat.label, i).toUpperCase(), ...line('Say', beat.spoken), ...line('On screen', beat.onScreen), ...line('Show', beat.visual));
    if (format !== 'talking') out.push(...line('Re-hook', beat.rehook));
  });
  out.push('', ...line('Close', script.cta), ...line('Caption', script.caption));
  if (script.tips.length) out.push('', 'Filming tips', ...script.tips.map((tip) => `- ${tip}`));
  return out.join('\n');
};

export type PrompterItem = { tag: string; text: string; note: string };

/** Talking head: what to say. Carousel and B-roll: the on-screen text, with what to show as a small note. */
export const teleprompterItems = (script: Script, format: BlueprintFormat): PrompterItem[] => {
  const spoken = format === 'talking';
  const items: PrompterItem[] = [
    { tag: 'Hook', text: spoken ? script.hook.spoken || script.hook.onScreen : script.hook.onScreen, note: spoken ? '' : script.hook.visual },
    ...script.beats.map((beat, i) => ({
      tag: beatHeading(format, beat.label, i),
      text: spoken ? beat.spoken : beat.onScreen,
      note: spoken ? '' : beat.visual,
    })),
  ];
  if (script.cta.trim()) items.push({ tag: 'Close', text: script.cta, note: '' });
  return items.filter((item) => item.text.trim());
};

/** Everything on one page: topics per branch, then each day with its format, topic, hook, checks and script. */
export const blueprintText = (bp: BlueprintDto): string => {
  const out = ['MY BRAND BLUEPRINT', ''];
  for (const pillar of ['skills', 'passions', 'story'] as const) {
    const { main, optional } = pillarTopics(bp.topics[pillar]);
    out.push(`${PILLAR_NAME[pillar].toUpperCase()} TOPICS`, ...main.map((t) => `* ${t}`), ...optional.map((t) => `- ${t} (extra)`));
    if (!main.length && !optional.length) out.push('(none yet)');
    out.push('');
  }
  bp.plan.forEach((day, i) => {
    out.push(`DAY ${i + 1}: ${PILLAR_NAME[day.pillar]} / ${FORMAT_NAME[day.format]}`, ...line('Topic', day.topic || '(not picked)'), ...line('Hook idea', day.hookIdea));
    out.push(`Checks: ${CHECK_NAMES.map((name, c) => `${day.checks[c] ? '[x]' : '[ ]'} ${name}`).join('  ')}`, `Status: ${DAY_STATUS_LABEL[dayStatus(day)]}`);
    if (day.script) out.push('', scriptText(day.script, day.format));
    out.push('', '----', '');
  });
  return out.join('\n').trim();
};
