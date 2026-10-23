import { SCRIPT_FORMATS, SCRIPT_STRUCTURES, type GeneratedScript } from '../../../types/admin/scriptGenerator';

const line = (label: string, value: string | undefined): string[] => (value?.trim() ? [`- ${label}: ${value.trim()}`] : []);

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
    `Structure: ${SCRIPT_STRUCTURES[script.structure]?.label ?? script.structure}`,
    `Length: about ${Math.round(script.durationSeconds)} seconds`,
    ...(script.music?.trim() ? [`Music: ${script.music.trim()}`] : []),
    '',
    '## Beats',
  ];
  script.beats.forEach((b, i) => {
    parts.push(
      '',
      `### ${i + 1}. ${b.label} (${Math.round(b.start)}-${Math.round(b.end)}s)`,
      ...line('On screen', b.onScreen),
      ...line('Spoken', b.spoken),
      ...line(i === 0 ? 'Visual (first frame)' : 'B-roll', b.broll),
      ...line(b.rehookAt !== undefined ? `Re-hook at ${Math.round(b.rehookAt)}s` : 'Re-hook', b.rehook),
    );
  });
  parts.push('', '## Call to action', script.cta, '', "## Director's note", script.directorNote.summary);
  script.directorNote.decisions.forEach((d, i) => parts.push('', `${i + 1}. ${d.choice}`, `   Why: ${d.rule}`));
  return parts.join('\n');
}
