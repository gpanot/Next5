// server-only. Builds the script generator input from the stored blueprint (spec section 5.2). The client only ever
// sends a day index, so every prompt input comes from the workspace's own row.
import type { BlueprintDto } from '../../lib/blueprint/schema';
import { HttpError } from '../http';
import type { BlueprintScriptInput } from '../scriptGenerator/rules';

export const parseDayIndex = (value: string): number => {
  const index = Number(value);
  if (!Number.isInteger(index) || index < 0 || index > 6) throw new HttpError(400, 'invalid_day', 'Day must be 0 to 6.');
  return index;
};

export const toScriptInput = (blueprint: BlueprintDto, dayIndex: number): BlueprintScriptInput => {
  const day = blueprint.plan[dayIndex];
  if (!day?.topic.trim()) throw new HttpError(400, 'topic_required', 'Pick a topic for this day first.');
  const { about } = blueprint;
  return {
    format: day.format,
    pillar: day.pillar,
    message: day.topic,
    offer: about.off,
    audience: about.aud,
    credibility: about.cred,
    voice: about.voice,
    facts: day.notes,
    hookIdea: day.hookIdea,
    goal: 'attract',
    structure: 'ai_choose',
  };
};
