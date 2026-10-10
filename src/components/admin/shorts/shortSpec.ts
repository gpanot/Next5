// The short as one Markdown file, to hand to an LLM for analysis: inputs, narration, every script draft with its
// fact check, voice, every shot with its image and video prompts, and the cost and time of each step.

import { SHORT_STEP_LABELS, videoModelLabel, type ShortBeatDto, type ShortDetailDto, type ShortScriptAttempt, type ShortStep } from '../../../types/admin/shorts';
import { seconds, usd } from './useShorts';

const line = (label: string, value: string | number | null | undefined) => (value === null || value === undefined || value === '' ? null : `- **${label}:** ${value}`);
const block = (label: string, text: string | null | undefined) => (text ? `**${label}:**\n\n\`\`\`\n${text}\n\`\`\`` : null);
const join = (parts: (string | null)[]) => parts.filter((p): p is string => p !== null).join('\n');

const overview = (s: ShortDetailDto) =>
  join([
    `# Short spec: ${s.hook ?? 'untitled'}`,
    '',
    line('Short id', s.id),
    line('Workspace', s.workspaceName),
    line('Video model', videoModelLabel(s.videoModel)),
    line('Status', s.status),
    line('Error', s.error),
    line('Video length', s.durationS ? `${s.durationS.toFixed(1)} s` : null),
    line('Total cost', usd(s.totalUsdMicros)),
    line('Generation time', seconds(s.totalMs)),
    line('Created', s.createdAt),
  ]);

const inputsSection = (s: ShortDetailDto) => {
  const i = s.inputs;
  if (!i) return null;
  return join([
    '## Inputs (brand and bank hook)',
    '',
    line('Brand', i.brandName),
    line('Tone', i.tone),
    line('Audience', i.audience),
    line('Photo style', i.photoStyle),
    line('Domain', i.domain),
    line('Bank hook', `${i.hookText} (${i.hookId})`),
    line('Topic', `${i.meatTopic} (${i.meatId})`),
    line('Core claim', i.coreClaim),
    line('Mechanism', i.mechanism),
    ...i.evidence.map((e, n) => line(`Evidence ${n + 1}`, e)),
    '',
    block('Brand source (the only facts the script may use)', i.sourceText),
  ]);
};

const narrationSection = (s: ShortDetailDto) => {
  const script = s.attempts[s.attempts.length - 1]?.script;
  if (!script) return null;
  return join([
    '## Narration (script used)',
    '',
    script.narration,
    '',
    line('Hook', script.hook),
    ...script.mechanismLines.map((m, n) => line(`Mechanism line ${n + 1}`, m)),
    line('Payoff', script.payoffLine),
    line('Structure', script.structure),
    line('On screen, last scene (CTA)', script.cta),
  ]);
};

const attemptText = (a: ShortScriptAttempt, n: number, used: boolean) =>
  join([
    `### Draft ${n + 1}${used ? ' (used)' : ' (rejected by fact check)'}`,
    '',
    a.jev ? line('Jev ratings (0-1)', `overall ${a.jev.overall ?? '—'}, hook ${a.jev.hook ?? '—'}, lesson ${a.jev.lesson ?? '—'}`) : null,
    '',
    a.script.narration,
    '',
    a.claims.length ? '**Fact check:**' : null,
    ...a.claims.map((c) => `- [${c.verdict}] ${c.claim}${c.evidence ? ` — evidence: ${c.evidence}` : ''}`),
  ]);

const scriptSection = (s: ShortDetailDto) =>
  s.attempts.length ? join(['## Script & fact check', '', ...s.attempts.map((a, n) => attemptText(a, n, n === s.attempts.length - 1) + '\n')]) : null;

const voiceSection = (s: ShortDetailDto) => {
  const a = s.audio;
  if (!a) return null;
  return join([
    '## Voice',
    '',
    line('Voice', `${a.voice}${a.pickedBy ? ` (picked by ${a.pickedBy})` : ''}`),
    line('Length', `${a.durationS.toFixed(1)} s, ${a.sentences} sentences`),
    line('Speed-up', a.tempo ? `${a.tempo.toFixed(2)}×` : null),
    line('Raw pace', a.rawWpm ? `${Math.round(a.rawWpm)} wpm` : null),
    ...a.options.map((o) => line(`Option ${o.name}`, `${o.gender}, ${o.style}, Jev ${o.jevScore ?? '—'} — ${o.why}`)),
    '',
    block('Delivery direction', a.direction),
  ]);
};

const shotText = (b: ShortBeatDto) =>
  join([
    `### Shot ${b.idx + 1} · ${b.role}`,
    '',
    line('Line', `“${b.text}”`),
    line('On screen', `${b.startS.toFixed(1)}–${(b.startS + b.spanS).toFixed(1)} s${b.genS ? `, ${b.genS} s generated` : ''}`),
    line('Motion hint', b.motionHint),
    line('Motion action', b.motionAction),
    line('Grounded on', b.visualAnchor),
    line('On-screen text', b.accent),
    line('Hook style', b.accentStyle ? `${b.accentStyle}${b.accentStyleReason ? ` — ${b.accentStyleReason}` : ''}` : null),
    line('Hook position', typeof b.accentTopY === 'number' ? `top at ${b.accentTopY} px of 1920${b.accentFitReason ? ` — ${b.accentFitReason}` : ''}` : null),
    line('Clip error', b.clipError),
    line('Photo URL (expires)', b.imageUrl),
    '',
    block('Image prompt (sent)', b.imagePrompt),
    b.rawImagePrompt && b.rawImagePrompt !== b.imagePrompt ? block('Image prompt as planned', b.rawImagePrompt) : null,
    block('Video prompt', b.videoPrompt),
  ]);

const shotsSection = (s: ShortDetailDto) => (s.beats.length ? join(['## Shots', '', ...s.beats.map((b) => shotText(b) + '\n')]) : null);

const stepsSection = (s: ShortDetailDto) =>
  join([
    '## Steps, time & cost',
    '',
    ...([1, 2, 3, 4, 5] as ShortStep[]).map((step) => {
      const cost = s.stepCosts[step];
      const ms = s.stepTimings[step];
      const items = cost?.items.map((i) => `${i.label} ${usd(i.usdMicros)}`).join(', ');
      return `- **${step}. ${SHORT_STEP_LABELS[step]}:** ${ms !== undefined ? seconds(ms) : '—'} · ${usd(cost?.usdMicros ?? 0)}${items ? ` (${items})` : ''}`;
    }),
  ]);

export const buildShortSpec = (s: ShortDetailDto): string =>
  [overview(s), inputsSection(s), narrationSection(s), scriptSection(s), voiceSection(s), shotsSection(s), stepsSection(s)]
    .filter((p): p is string => p !== null)
    .join('\n\n') + '\n';

/** Saves the spec as a .md file. */
export const downloadShortSpec = (s: ShortDetailDto) => {
  const url = URL.createObjectURL(new Blob([buildShortSpec(s)], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `short-spec-${s.id}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
};
