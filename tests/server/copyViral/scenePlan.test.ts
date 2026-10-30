import { describe, expect, it } from 'vitest';
import { parseScenePlan, resolveScenePlan } from '../../../src/server/copyViral/scenePlan';

const spans = [{ index: 0, from: 0, to: 4 }, { index: 1, from: 4, to: 10 }];
const words = [{ text: 'Great', start: 1.2, end: 1.5 }, { text: 'shop', start: 1.6, end: 1.9 }, { text: 'hook', start: 2.0, end: 2.3 }];

describe('scene plan', () => {
  it('turns shot shares and cues into seconds of the joined take, at any depth', () => {
    const plan = parseScenePlan({ shots: { '1': [{ type: 'board', from: 0, to: 1, items: [{ k: 'text', at: 'cue:shop hook' }, { k: 'text', at: 0.5 }] }] } }, 2);
    expect(resolveScenePlan(plan, spans, words)).toEqual([{ type: 'board', from: 0, to: 4, items: [{ k: 'text', at: 1.6 }, { k: 'text', at: 2 }] }]);
  });

  it('drops to: 1 on the last shot and falls back to the shot start for a cue never said', () => {
    const plan = parseScenePlan({ shots: { '2': [{ type: 'board', from: 'cue:never said', to: 1 }] } }, 2);
    expect(resolveScenePlan(plan, spans, words)).toEqual([{ type: 'board', from: 4 }]);
  });

  it('only resolves the shots of the job (a sequence preview)', () => {
    const plan = parseScenePlan({ shots: { '1': [{ from: 0 }], '2': [{ from: 0 }] } }, 2);
    expect(resolveScenePlan(plan, [spans[1]], words)).toEqual([{ from: 4 }]);
  });

  it('refuses seconds, unknown shots and bad shapes', () => {
    expect(() => resolveScenePlan(parseScenePlan({ shots: { '1': [{ from: 2.5 }] } }, 2), spans, [])).toThrow(/share of the shot/);
    expect(() => parseScenePlan({ shots: { '3': [] } }, 2)).toThrow(/no shot 3/);
    expect(() => parseScenePlan({ scenes: [] }, 2)).toThrow();
  });
});
