import { CAROUSEL_TEMPLATES, isCarouselTemplate } from '../../../types/admin/carouselTemplates';
import { SCRIPT_FORMATS, SCRIPT_STRUCTURES, type GeneratedScript, type ScriptBeat } from '../../../types/admin/scriptGenerator';

const line = (label: string, value: string | undefined): string[] => (value?.trim() ? [`- ${label}: ${value.trim()}`] : []);

/** The structure or carousel template name, for display. */
export const structureLabel = (s: GeneratedScript['structure']): string =>
  isCarouselTemplate(s) ? CAROUSEL_TEMPLATES[s].label : SCRIPT_STRUCTURES[s]?.label ?? s;

/** "Slide 3" on a carousel, "12-18s" on a video. */
export const beatPosition = (script: GeneratedScript, b: ScriptBeat, i: number): string =>
  script.format === 'carousel' ? `Slide ${i + 1}` : `${Math.round(b.start)}-${Math.round(b.end)}s`;

/**
 * The whole script as plain text (Markdown), written to be pasted into another LLM as a brief: what the video is,
 * every beat with its timing, on-screen text, spoken line, visual and re-hook, the call to action, and why each
 * choice was made.
 */
export function scriptToBrief(script: GeneratedScript): string {
  const parts: string[] = [
    `# ${script.title}`,
    '',
    `Format: ${SCRIPT_FORMATS[script.format]?.label ?? script.format}`,
    `${script.format === 'carousel' ? 'Template' : 'Structure'}: ${structureLabel(script.structure)}`,
    script.format === 'carousel' ? `Length: ${script.beats.length} slides` : `Length: about ${Math.round(script.durationSeconds)} seconds`,
    ...(script.music?.trim() ? [`Music: ${script.music.trim()}`] : []),
    '',
    '## Beats',
  ];
  script.beats.forEach((b, i) => {
    parts.push(
      '',
      `### ${i + 1}. ${b.label} (${beatPosition(script, b, i)})`,
      ...line(b.bottomOnScreen ? 'Top text' : 'On screen', b.onScreen),
      ...line('Spoken', b.spoken),
      ...line(script.format === 'carousel' ? (b.bottomBroll ? 'Top photo' : 'Photo') : i === 0 ? 'Visual (first frame)' : 'B-roll', b.broll),
      ...line('Bottom text', b.bottomOnScreen),
      ...line('Bottom photo', b.bottomBroll),
      ...line(b.rehookAt !== undefined ? `Re-hook at ${Math.round(b.rehookAt)}s` : 'Re-hook', b.rehook),
    );
  });
  parts.push('', '## Call to action', script.cta, '', "## Director's note", script.directorNote.summary);
  script.directorNote.decisions.forEach((d, i) => parts.push('', `${i + 1}. ${d.choice}`, `   Why: ${d.rule}`));
  return parts.join('\n');
}
