// server-only. A stand-in model for tests and local demos: no network, no cost. Reads the topic and the format from
// the prompt and answers with a script of the right shape. It writes one em dash on purpose so the post-check shows,
// and a [placeholder] whenever no personal details were given.
import type { ModelCall } from './model';

const tag = (user: string, name: string): string => user.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() ?? '';

const formatOf = (system: string): 'talking' | 'carousel' | 'broll' =>
  system.includes('FORMAT: CAROUSEL') ? 'carousel' : system.includes('FORMAT: NON-TALKING') ? 'broll' : 'talking';

const beat = (label: string, spoken: string, onScreen: string, visual: string, rehook = '') => ({ label, spoken, onScreen, visual, rehook });

function talking(topic: string, detail: string) {
  return {
    title: topic,
    hook: { visual: 'You at your desk, holding up one finger', onScreen: 'Stop doing this first', spoken: `If you are stuck on ${topic.toLowerCase()}, this one fix comes first.` },
    beats: [
      beat('THE MISTAKE', 'Most people start with the hard part. That is why they quit by week two.', 'The hard part first', 'Close up, shaking head'),
      beat('WHAT I DO', `Here is what works for me. ${detail} But that is not the real trick.`, 'Start small', 'Cut to your screen', 'But that is not the real trick.'),
      beat('THE TRICK', 'The trick is to do the easy step every single day, even when it feels too small to matter.', 'Easy step, every day', 'Calendar with ticks'),
    ],
    cta: 'Follow for the next step tomorrow.',
    caption: `The easy fix for ${topic.toLowerCase()} — most people skip it.`,
    tips: ['Film by a window for soft light', 'Keep the phone at eye level', 'Say the hook in one breath'],
  };
}

function carousel(topic: string) {
  const slides = ['Most people get this wrong', 'Step 1: pick one small goal', 'Step 2: do it before 9 am', 'Step 3: write down what changed', 'The part nobody tells you', 'Save this for Monday'];
  return {
    title: topic,
    hook: { visual: 'Bold text over a bright desk photo', onScreen: `${topic}: the short version`, spoken: 'this should be dropped' },
    beats: slides.map((s, i) => beat(`SLIDE ${i + 1}`, 'dropped too', s, `Photo ${i + 1} from your camera roll`, i < slides.length - 1 ? 'Swipe for the next one' : '')),
    cta: 'Save this and try step 1 today.',
    caption: `${topic}, in 6 slides.`,
    tips: ['Use photos you already have', 'One line per slide, big text', 'Keep the same filter on every slide'],
  };
}

function broll(topic: string, detail: string) {
  return {
    title: topic,
    hook: { visual: 'Empty office at 6 am, lights coming on', onScreen: 'Nobody saw this part', spoken: '' },
    beats: [
      beat('SHOT 1', '', detail ? 'The first year looked like this' : '[the year you started]', 'Old photo of your first desk', 'It got worse first'),
      beat('SHOT 2', '', '[what went wrong that year]', 'Hands packing boxes late at night', 'Then one thing changed'),
      beat('SHOT 3', '', 'I stopped waiting to feel ready', 'Walking out the door, morning light', 'Here is where it went'),
      beat('SHOT 4', '', 'Still here. Still building.', 'Today, same desk, more stuff on it'),
    ],
    cta: 'Follow if you are in year one too.',
    caption: `${topic}. The part I never posted.`,
    tips: ['Shoot each clip for 3 seconds', 'Hold the phone still, let the light move', 'Pick slow music with no words'],
  };
}

export const mockModel: ModelCall = async (system, user, tool) => {
  const topic = tag(user, 'topic') || 'My topic';
  const facts = tag(user, 'details_only_the_creator_knows');
  const detail = facts && facts !== '(none given)' ? facts : '[a time this worked for you]';
  const format = formatOf(system);
  const script = format === 'carousel' ? carousel(topic) : format === 'broll' ? broll(topic, facts === '(none given)' ? '' : facts) : talking(topic, detail);
  if (tool.name === 'submit_edit') return { refused: false, message: 'Made the hook shorter.', script };
  if (tool.name === 'submit_hooks') {
    return { hooks: ['pain', 'mistake', 'contrarian'].map((angle) => ({ angle, visual: script.hook.visual, onScreen: script.hook.onScreen, spoken: script.hook.spoken })) };
  }
  return script;
};
