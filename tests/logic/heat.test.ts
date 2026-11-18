// Durchgang: one exercise, the people of the run, their results until saved.
import { heatReducer, heatResults, heatTool, newHeat, withoutResult } from '../../src/logic/heat';

const sprint = { id: 'sprint', measure: 'secTenth' } as const;
const run = { id: 'run-endurance', measure: 'minSec' } as const;
const skipping = { id: 'rope-skipping', measure: 'count' } as const;
const curl = { id: 'curl-ups', measure: 'count' } as const;
const push = { id: 'push-ups', measure: 'count' } as const;
const jump = { id: 'long-jump', measure: 'meterCm' } as const;

const stopped = (ms: number) => ({ finishes: [], stopped: ms });
const finished = (...finishes: number[]) => ({ finishes, stopped: null });

describe('heatTool: the tool that measures the run', () => {
  it('stopwatch for times, counter for counts (Push-Ups with the beat in it), metronome for Curl-Up', () => {
    expect(heatTool(sprint)).toBe('stopwatch');
    expect(heatTool(run)).toBe('stopwatch');
    expect(heatTool(skipping)).toBe('counter');
    expect(heatTool(push)).toBe('counter');
    expect(heatTool(curl)).toBe('metronome');
    expect(heatTool(jump)).toBe('none');
  });
});

describe('heatReducer', () => {
  const two = newHeat('sprint', ['a', 'b']);

  it('another exercise starts a new run; the same keeps it', () => {
    expect(heatReducer(two, { type: 'exercise', exerciseId: 'sprint' })).toBe(two);
    expect(heatReducer(two, { type: 'exercise', exerciseId: 'run-endurance' })).toEqual(
      newHeat('run-endurance'),
    );
  });

  it('a person has one finish; assigning moves it, null takes it back; strangers are refused', () => {
    let heat = heatReducer(two, { type: 'assign', finishIndex: 0, athleteId: 'a' });
    heat = heatReducer(heat, { type: 'assign', finishIndex: 1, athleteId: 'a' });
    expect(heat.assigned).toEqual({ 1: 'a' });
    heat = heatReducer(heat, { type: 'assign', finishIndex: 1, athleteId: 'b' });
    expect(heat.assigned).toEqual({ 1: 'b' });
    heat = heatReducer(heat, { type: 'assign', finishIndex: 1, athleteId: null });
    expect(heat.assigned).toEqual({});
    expect(heatReducer(two, { type: 'assign', finishIndex: 0, athleteId: 'zz' })).toBe(two);
  });

  it('separate counts per person, never below 0', () => {
    let heat = newHeat('push-ups', ['a', 'b']);
    heat = heatReducer(heat, { type: 'count', athleteId: 'a', delta: 1 });
    heat = heatReducer(heat, { type: 'count', athleteId: 'a', delta: 1 });
    heat = heatReducer(heat, { type: 'count', athleteId: 'b', delta: -1 });
    expect(heat.counts).toEqual({ a: 2, b: 0 });
  });

  it('metronome: one Ende per person, corrected by ±1, not below 0', () => {
    let heat = newHeat('curl-ups', ['a', 'b']);
    heat = heatReducer(heat, { type: 'end', athleteId: 'a', repetitions: 12 });
    expect(heatReducer(heat, { type: 'end', athleteId: 'a', repetitions: 20 })).toBe(heat);
    heat = heatReducer(heat, { type: 'correct', athleteId: 'a', delta: -1 });
    expect(heat.ended).toEqual({ a: 11 });
    expect(heatReducer(heat, { type: 'correct', athleteId: 'b', delta: 1 })).toBe(heat);
  });

  it('leaving the run takes the open results along', () => {
    let heat = heatReducer(two, { type: 'assign', finishIndex: 0, athleteId: 'a' });
    heat = heatReducer(heat, { type: 'count', athleteId: 'a', delta: 1 });
    heat = heatReducer(heat, { type: 'toggleAthlete', athleteId: 'a' });
    expect(heat.athleteIds).toEqual(['b']);
    expect(heat.assigned).toEqual({});
    expect(heat.counts).toEqual({});
  });

  it('„again“ keeps exercise, people and finish mode, clears the results', () => {
    let heat = heatReducer(two, { type: 'finishMode', mode: 'names' });
    heat = heatReducer(heat, { type: 'assign', finishIndex: 0, athleteId: 'a' });
    heat = heatReducer(heat, { type: 'saved', key: 'f0' });
    expect(heatReducer(heat, { type: 'again' })).toEqual({ ...two, finishMode: 'names' });
  });
});

describe('heatResults', () => {
  it('one person: the single finish or the stopped time is theirs', () => {
    const one = newHeat('sprint', ['a']);
    expect(heatResults(one, sprint, stopped(5432))).toEqual([
      { key: 'stop', athleteId: 'a', text: '5,4', saved: false },
    ]);
    expect(heatResults(one, sprint, finished(5432))[0]?.athleteId).toBe('a');
    expect(heatResults(one, sprint, { finishes: [], stopped: null })).toEqual([]);
  });

  it('several: finishes in order, in card notation, assigned or open', () => {
    const heat = heatReducer(newHeat('run-endurance', ['a', 'b', 'c']), {
      type: 'assign',
      finishIndex: 1,
      athleteId: 'c',
    });
    const results = heatResults(heat, run, finished(201_400, 215_900));
    expect(results.map((r) => [r.key, r.athleteId, r.text, r.finishIndex])).toEqual([
      ['f0', null, '03:21', 0],
      ['f1', 'c', '03:35', 1],
    ]);
    expect(withoutResult(heat, results)).toEqual(['a', 'b']);
  });

  it('counter and metronome: one result per person with a value; saved ones marked', () => {
    let heat = newHeat('rope-skipping', ['a', 'b']);
    heat = heatReducer(heat, { type: 'count', athleteId: 'b', delta: 1 });
    heat = heatReducer(heat, { type: 'saved', key: 'cb' });
    expect(heatResults(heat, skipping, finished())).toEqual([
      { key: 'cb', athleteId: 'b', text: '1', saved: true },
    ]);
    const curlHeat = heatReducer(newHeat('curl-ups', ['a']), {
      type: 'end',
      athleteId: 'a',
      repetitions: 0,
    });
    expect(heatResults(curlHeat, curl, finished()).map((r) => r.text)).toEqual(['0']);
    expect(heatResults(newHeat('long-jump', ['a']), jump, finished())).toEqual([]);
  });
});
