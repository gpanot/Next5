/**
 * The creative director's note on the preview shot.
 *
 * This is the line between "an image generator returned a file" and "someone
 * shot this for you". It is written in the director's voice and has to explain
 * *why* this frame was built the way it was, from what the customer told us.
 *
 * Fetched once per preview and reused in two places: typed out on the waiting
 * screen (where she first "meets" the photographer) and shown statically once
 * the shot is ready. One note, one LLM call — no separate "in progress" copy.
 *
 * Deliberately never given the scene name: those live in local route data, not
 * in the Airtable prompt that actually produced the image, so a note naming a
 * location could confidently describe somewhere the shot isn't.
 */

import { isMockGeneration } from './mock';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = 'gpt-4o-mini';
const TIMEOUT_MS = 12_000;

export type DirectorNoteInput = {
  directorName: string;
  directorSpecialty: string;
  directorSignature: string;
  studioTitle: string;
  feelings: string[];
  goals: string[];
};

const systemPrompt = `You are a fashion photographer writing a short private note to the client whose photo you have just finished.

Voice: warm, assured, personal. You are the artist explaining a deliberate choice, never a service confirming an order.

Rules:
- Write 2-3 sentences, 45 words maximum.
- Open by naming what she told you she wanted to feel, in your own words.
- Then give ONE concrete reason you framed this shot the way you did, drawn from your own style and the studio's mood — the light, the angle, the styling, the mood.
- Do NOT name a specific location, room or landmark. You are describing craft, not a place.
- Address her as "you". Never use her name, never invent details about her appearance.
- No greeting, no sign-off, no emoji, no quotation marks. Return the note text only.
- Never mention AI, models, prompts, generation, or that this is automated.`;

const buildUserPrompt = (input: DirectorNoteInput): string => {
  const wants = input.feelings.length ? input.feelings.join(', ') : 'beautiful and confident';
  const goals = input.goals.length ? `\nShe wants these photos to: ${input.goals.join(', ')}` : '';

  return `You are ${input.directorName}. Your style: ${input.directorSpecialty}. ${input.directorSignature}

Studio: ${input.studioTitle}
She told you she wants to feel: ${wants}${goals}

Write your note about this shot.`;
};

/** Used when no key is configured or the call fails — the panel must never break. */
export const fallbackNote = (input: DirectorNoteInput): string => {
  const wants = (input.feelings[0] ?? 'beautiful and confident').toLowerCase();
  return `You told me you wanted to feel ${wants}, so I built this one around that. I kept the light soft and let you hold the frame — no posing, nothing staged, just you at your best.`;
};

export const generateDirectorNote = async (input: DirectorNoteInput): Promise<string> => {
  if (!OPENAI_API_KEY || isMockGeneration()) return fallbackNote(input);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.85,
        max_tokens: 140,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: buildUserPrompt(input) },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error('[director-note] OpenAI responded', res.status);
      return fallbackNote(input);
    }

    const data = await res.json();
    const note = data?.choices?.[0]?.message?.content?.trim();

    return typeof note === 'string' && note.length > 0 ? note : fallbackNote(input);
  } catch (err) {
    console.error('[director-note] generation failed:', err);
    return fallbackNote(input);
  } finally {
    clearTimeout(timer);
  }
};
